import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import supabase from '../config/supabase';
import PurchaseRequestService from '../services/purchaseRequestService';
import InventoryService from '../services/inventoryService';
import AssetService from '../services/assetService';
import AuditLogService from '../services/auditLogService';
import InventoryAuditLogService from '../services/Inventoryauditlogservice';
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
        clearTimeout(window._inventoryRefreshTimer);
        window._inventoryRefreshTimer = setTimeout(() => {
          InventoryService.getAll().then(inv => {
            if (Array.isArray(inv)) setInventory(inv);
          });
        }, 300);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => {
        // Debounce to avoid multiple rapid refreshes during batch operations
        clearTimeout(window._assetsRefreshTimer);
        window._assetsRefreshTimer = setTimeout(() => {
          AssetService.getAll().then(ast => {
            if (Array.isArray(ast)) setAssets(ast);
          });
        }, 300);
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
  // Each deployed asset receives its own unique serial number from the inventory.
  const deployAsset = useCallback(async (assetData) => {
    const { inventoryItemId, quantity = 1, inventoryAssetTags = [], serialNumbers = [], ...rest } = assetData;
    const qty = Math.max(1, parseInt(quantity) || 1);

    // Step 1 — build all asset row data, then batch insert in ONE DB call
    // Each unit gets its corresponding asset tag and serial number from inventory
    const batchData = Array.from({ length: qty }, (_, i) => {
      const rawTag = inventoryAssetTags[i] || rest.inventoryAssetTag || '';
      const tag    = rawTag.trim()?.substring(0, 90) || '';
      // Assign the serial number from inventory's serial_numbers array at index i
      // If no serial number exists for this unit, use empty string (will be stored as null)
      const serialNum = (serialNumbers[i] || '').trim();
      return {
        ...rest,
        serialNumber: serialNum || '',  // Unique serial number for this unit, empty if not assigned
        inventoryAssetTag: tag,         // Unique asset tag for this unit
        unitIndex:         i,
        inventoryItemId,
        createdBy:         currentUser.name,
      };
    });
    const allCreated = await AssetService.createBatch(batchData);

    if (allCreated.length === 0) return null;

    // Step 2 — deduct qty from inventory, passing the specific deployed tags to remove
    if (inventoryItemId) {
      // Collect the actual asset tags used for these units
      const deployedTagsList = allCreated
        .map(a => a.inventory_asset_tag)
        .filter(Boolean);
      const updatedItem = await InventoryService.adjustQuantity(
        inventoryItemId,
        -qty,
        `Deployed as Asset (x${qty})`,
        currentUser.name,
        deployedTagsList
      );
      if (updatedItem) {
        setInventory(prev =>
          prev.map(item => item.id === inventoryItemId ? updatedItem : item)
        );
      }
    }

    // Step 3 — state update handled by realtime subscription (avoids double-add)
    // No manual setAssets here — the realtime channel fires on INSERT and refreshes state
    return allCreated;
  }, [currentUser.name]);

  const updateAsset = async (id, updates) => {
    // Get the current asset to check if status is changing from Cancelled
    const currentAsset = assets.find(a => a.id === id);
    const wasCancelled = currentAsset?.status === 'Cancelled';
    const isBeingReactivated = wasCancelled && updates.status && updates.status !== 'Cancelled';

    // If reactivating a cancelled asset, we need to re-deploy from inventory
    if (isBeingReactivated && currentAsset?.inventory_item_id) {
      const invItemId = currentAsset.inventory_item_id;
      const assetTag = currentAsset.inventory_asset_tag || '';
      
      // Deduct 1 from inventory (re-deploy)
      const updatedItem = await InventoryService.adjustQuantity(
        invItemId,
        -1,
        'Re-deployed from Cancelled Asset',
        currentUser.name,
        assetTag ? [assetTag] : []
      );
      
      if (updatedItem) {
        setInventory(prev =>
          prev.map(item => item.id === invItemId ? updatedItem : item)
        );
      }
    }

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
    // Return quantity to inventory if linked — adjust qty optimistically, skip full refetch
    if (result.inventoryItemId) {
      // Pass the asset tag AND serial number back so inventory restores both
      const returnedTag = result.asset?.inventory_asset_tag || '';
      const returnedSerial = result.asset?.serial_number || '';
      const updatedItem = await InventoryService.adjustQuantity(
        result.inventoryItemId, 1,
        'Returned from Cancelled Asset',
        currentUser.name,
        returnedTag ? [returnedTag] : [],
        returnedSerial ? [returnedSerial] : []
      );
      setInventory(prev => prev.map(item =>
        item.id === result.inventoryItemId
          ? (updatedItem || { ...item, quantity: (item.quantity || 0) + 1 })
          : item
      ));
    }
    // Update asset in state instantly
    setAssets(prev => prev.map(a => a.id === id ? result.asset : a));
    // Write audit log (fire-and-forget — don't await)
    AssetAuditLogService.log({
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
      pendingPO: safeAssets.filter(asset =>
        ['In Progress', 'For Delivery', 'On Hold'].includes(asset.status)
      ).length,
      lowStockItems: safeInventory.filter(item => {
        const min = item.min_stock_level ?? item.minStockLevel ?? 0;
        return item.quantity > 0 && item.quantity <= min;
      }).length,
      outOfStockItems: safeInventory.filter(item => item.quantity === 0).length,
    };
  };


  const bulkCancelAssets = useCallback(async (assetsList, reason) => {
    if (!assetsList?.length) return { succeeded: 0, failed: 0 };

    // Step 1 — batch cancel all assets in ONE DB round-trip
    const results = await AssetService.cancelBatch(
      assetsList.map(a => a.id),
      reason,
      currentUser.name
    );

    if (!results.length) return { succeeded: 0, failed: assetsList.length };

    // Update assets state immediately
    const updatedMap = {};
    results.forEach(r => { if (r.asset) updatedMap[r.asset.id] = r.asset; });
    setAssets(prev => prev.map(a => updatedMap[a.id] || a));

    // Step 2 — restore inventory sequentially (must be sequential to avoid qty race)
    const byInventoryItem = {};
    results.forEach(r => {
      if (r.inventoryItemId) {
        if (!byInventoryItem[r.inventoryItemId]) byInventoryItem[r.inventoryItemId] = { tags: [], serials: [] };
        byInventoryItem[r.inventoryItemId].tags.push(r.asset?.inventory_asset_tag || '');
        byInventoryItem[r.inventoryItemId].serials.push(r.asset?.serial_number || '');
      }
    });

    for (const [invId, data] of Object.entries(byInventoryItem)) {
      const qty = data.tags.length;
      const returnedTags = data.tags.filter(Boolean);
      const returnedSerials = data.serials.filter(Boolean);
      const updatedItem = await InventoryService.adjustQuantity(
        invId, qty,
        `Returned from Cancelled Asset (x${qty})`,
        currentUser.name,
        returnedTags,
        returnedSerials
      );
      if (updatedItem) {
        setInventory(prev => prev.map(item => item.id === invId ? updatedItem : item));
      }
    }

    // Fire-and-forget audit logs in parallel
    results.forEach(r => {
      if (r.asset) {
        AssetAuditLogService.log({
          action:      'Cancelled',
          assetId:     r.asset.id,
          assetTag:    r.asset.inventory_asset_tag || r.asset.asset_id,
          description: r.asset.description,
          reason,
          user:        currentUser.name,
          date:        new Date().toISOString(),
        }).catch(() => {});
      }
    });

    return { succeeded: results.length, failed: assetsList.length - results.length };
  }, [currentUser, setAssets, setInventory]);

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
    bulkCancelAssets,
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
