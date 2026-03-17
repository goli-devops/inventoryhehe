import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import supabase from '../config/supabase';
import PurchaseRequestService from '../services/purchaseRequestService';
import InventoryService from '../services/inventoryService';
import AssetService from '../services/assetService';
import AuditLogService from '../services/auditLogService';
import InventoryAuditLogService from '../services/inventoryAuditLogService';
import AssetAuditLogService from '../services/assetAuditLogService';

const WMSContext = createContext();

export const useWMS = () => {
  const context = useContext(WMSContext);
  if (!context) {
    throw new Error('useWMS must be used within WMSProvider');
  }
  return context;
};

export const WMSProvider = ({ children }) => {
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user: authUser, session, displayName: authDisplayName } = useAuth();

  // Derive a display name from the auth user's metadata or email
  const currentUser = {
    name:  authDisplayName || 'System',
    email: authUser?.email || '',
    role:  authUser?.user_metadata?.role || 'Staff',
  };

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [prs, inv, ast] = await Promise.allSettled([
        PurchaseRequestService.getAll(),
        InventoryService.getAll(),
        AssetService.getAll()
      ]);

      const get = (result) => result.status === 'fulfilled' ? result.value : null;

      const prsData = get(prs);
      const invData = get(inv);
      const astData = get(ast);

      if (Array.isArray(prsData)) setPurchaseRequests(prsData);
      if (Array.isArray(invData)) setInventory(invData);
      if (Array.isArray(astData)) setAssets(astData);
    } catch (error) {
      console.error('[WMS] loadAllData failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session?.access_token) {
      console.log('[WMS] No session yet — skipping loadAllData');
      return;
    }
    console.log('[WMS] Session ready, calling loadAllData. Token prefix:', session.access_token.slice(0, 20));
    loadAllData();
  }, [session?.access_token, loadAllData]);

  // Supabase Realtime — keep all tables in sync automatically
  useEffect(() => {
    if (!authUser) return;

    const channel = supabase
      .channel('wms-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => {
        InventoryService.getAll().then(inv => {
          if (Array.isArray(inv)) setInventory(inv);
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => {
        AssetService.getAll().then(ast => {
          if (Array.isArray(ast)) setAssets(ast);
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_requests' }, () => {
        PurchaseRequestService.getAll().then(prs => {
          if (Array.isArray(prs)) setPurchaseRequests(prs);
        });
      })
      .subscribe((status) => {
        if (import.meta.env.DEV) console.log('[WMS] Realtime status:', status);
      });

    return () => supabase.removeChannel(channel);
  }, [authUser]);

  // Purchase Request Functions
  const createPR = async (prData) => {
    const newPR = await PurchaseRequestService.create({
      ...prData,
      // requestedBy comes from the form (Requester's Name field)
      // createdBy is the logged-in system user
      createdBy: currentUser.name,
    });
    if (newPR) {
      const allPRs = await PurchaseRequestService.getAll();
      setPurchaseRequests(allPRs);
    }
    return newPR;
  };

  const updatePR = async (id, updates, oldPR, updatedBy) => {
    const updatedPR = await PurchaseRequestService.update(
      id,
      updates,
      oldPR || null,
      updatedBy || currentUser.name
    );
    if (updatedPR) {
      setPurchaseRequests(prev =>
        prev.map(pr => pr.id === id ? updatedPR : pr)
      );
    }
    return updatedPR;
  };

  const deletePR = async (id, reason = '') => {
    const { success, snapshot } = await PurchaseRequestService.delete(id);
    if (success) {
      setPurchaseRequests(prev => prev.filter(pr => pr.id !== id));
      await AuditLogService.log({
        action:      'Deleted',
        prNumber:    snapshot?.pr_number || snapshot?.prNumber || id,
        prId:        id,
        performedBy: currentUser.name,
        snapshot,
        reason,
      });
    }
    return success;
  };

  // Inventory Functions
  const createInventoryItem = async (itemData) => {
    const newItem = await InventoryService.create({
      ...itemData,
      createdBy: currentUser.name
    });
    if (newItem) {
      // Refresh all inventory to ensure sync
      const allInventory = await InventoryService.getAll();
      setInventory(allInventory);
    }
    return newItem;
  };

  const updateInventoryItem = async (id, updates) => {
    const updatedItem = await InventoryService.update(id, {
      ...updates,
      updatedBy: currentUser.name
    });
    if (updatedItem) {
      setInventory(prev =>
        prev.map(item => item.id === id ? updatedItem : item)
      );
    }
    return updatedItem;
  };

  const adjustInventoryQuantity = async (id, adjustment, type) => {
    const updatedItem = await InventoryService.adjustQuantity(id, adjustment, type, currentUser.name);
    if (updatedItem) {
      setInventory(prev =>
        prev.map(item => item.id === id ? updatedItem : item)
      );
    }
    return updatedItem;
  };

  const deleteInventoryItem = async (id, reason = '') => {
    const { success, snapshot } = await InventoryService.delete(id);
    if (success) {
      setInventory(prev => prev.filter(item => item.id !== id));
      await InventoryAuditLogService.log({
        action:      'Deleted',
        itemCode:    snapshot?.item_code || id,
        itemId:      id,
        performedBy: currentUser.name,
        snapshot,
        reason,
      });
    }
    return success;
  };

  // Asset Functions
  const createAsset = async (assetData) => {
    const newAsset = await AssetService.create({
      ...assetData,
      createdBy: currentUser.name
    });
    if (newAsset) {
      const allAssets = await AssetService.getAll();
      if (Array.isArray(allAssets)) setAssets(allAssets);
    }
    return newAsset;
  };

  // Deploy assets from inventory:
  // Creates `quantity` individual asset records (each with unique ID + QR),
  // then deducts that quantity from the inventory item in one call.
  const deployAsset = useCallback(async (assetData) => {
    const { inventoryItemId, quantity = 1, ...rest } = assetData;
    const qty = Math.max(1, parseInt(quantity) || 1);

    // Step 1 — create N asset records in parallel
    const createPromises = Array.from({ length: qty }, (_, i) =>
      AssetService.create({
        ...rest,
        // Append index to serial number for bulk deploys so each is unique
        serialNumber: qty > 1 && rest.serialNumber
          ? `${rest.serialNumber}-${String(i + 1).padStart(2, '0')}`
          : rest.serialNumber,
        inventoryItemId,
        createdBy: currentUser.name,
      })
    );

    const results = await Promise.all(createPromises);
    const allCreated = results.filter(Boolean);
    if (allCreated.length === 0) return null;

    // Step 2 — deduct qty from inventory in one call
    if (inventoryItemId) {
      const updatedItem = await InventoryService.adjustQuantity(
        inventoryItemId,
        -qty,
        `Deployed as Asset (x${qty})`,
        currentUser.name
      );
      if (updatedItem) {
        setInventory(prev =>
          prev.map(item => item.id === inventoryItemId ? updatedItem : item)
        );
      }
    }

    // Step 3 — refresh assets state
    const allAssets = await AssetService.getAll();
    if (Array.isArray(allAssets)) setAssets(allAssets);

    return allCreated;
  }, [currentUser.name]);

  const updateAsset = async (id, updates) => {
    const updatedAsset = await AssetService.update(id, {
      ...updates,
      updatedBy: currentUser.name
    });
    if (updatedAsset) {
      setAssets(prev =>
        prev.map(asset => asset.id === id ? updatedAsset : asset)
      );
    }
    return updatedAsset;
  };

  const assignAsset = async (id, assignedTo) => {
    const updatedAsset = await AssetService.assignAsset(id, assignedTo, currentUser.name);
    if (updatedAsset) {
      setAssets(prev =>
        prev.map(asset => asset.id === id ? updatedAsset : asset)
      );
    }
    return updatedAsset;
  };

  const returnAsset = async (id) => {
    const updatedAsset = await AssetService.returnAsset(id, currentUser.name);
    if (updatedAsset) {
      setAssets(prev =>
        prev.map(asset => asset.id === id ? updatedAsset : asset)
      );
    }
    return updatedAsset;
  };

  const cancelAsset = async (id, reason) => {
    const result = await AssetService.cancel(id, reason, currentUser.name);
    if (!result) return false;
    // Return quantity to inventory if linked
    if (result.inventoryItemId) {
      await InventoryService.adjustQuantity(result.inventoryItemId, 1, 'Returned from Cancelled Asset', currentUser.name);
      const updated = await InventoryService.getAll();
      if (Array.isArray(updated)) setInventory(updated);
    }
    // Update asset in state
    setAssets(prev => prev.map(a => a.id === id ? result.asset : a));
    // Write audit log
    await AssetAuditLogService.log({
      action:      'Cancelled',
      assetId:     id,
      assetCode:   result.asset?.asset_id || id,
      performedBy: currentUser.name,
      snapshot:    result.asset,
      reason,
    });
    return true;
  };

  const deleteAsset = async (id, reason = '') => {
    const { success, snapshot } = await AssetService.delete(id);
    if (success) {
      setAssets(prev => prev.filter(asset => asset.id !== id));
      await AssetAuditLogService.log({
        action:      'Deleted',
        assetId:     id,
        assetCode:   snapshot?.asset_id || id,
        performedBy: currentUser.name,
        snapshot,
        reason,
      });
    }
    return success;
  };

  // Dashboard Stats
  const getStats = () => {
    const safePRs       = purchaseRequests  || [];
    const safeInventory = inventory         || [];
    const safeAssets    = assets            || [];

    return {
      totalInventoryItems: safeInventory.length,
      pendingPRs: safePRs.filter(pr =>
        pr.status === 'Submitted' || pr.status === 'For Canvass'
      ).length,
      assetsTagged: safeAssets.filter(asset =>
        (asset.is_tagged || asset.isTagged) && asset.status !== 'Cancelled'
      ).length,
      lowStockItems: safeInventory.filter(item => {
        const min = item.min_stock_level ?? item.minStockLevel ?? 0;
        return item.quantity > 0 && item.quantity <= min;
      }).length,
      outOfStockItems: safeInventory.filter(item => item.quantity === 0).length,
    };
  };

  const value = {
    // State
    purchaseRequests,
    inventory,
    assets,
    loading,
    currentUser,
    
    // Functions
    createPR,
    updatePR,
    deletePR,
    createInventoryItem,
    updateInventoryItem,
    adjustInventoryQuantity,
    deleteInventoryItem,
    createAsset,
    deployAsset,
    updateAsset,
    cancelAsset,
    assignAsset,
    returnAsset,
    deleteAsset,
    getStats,
    refreshData: loadAllData
  };

  return (
    <WMSContext.Provider value={value}>
      {children}
    </WMSContext.Provider>
  );
};

export default WMSContext;