import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import PurchaseRequestService from '../services/purchaseRequestService';
import InventoryService from '../services/inventoryService';
import AssetService from '../services/assetService';

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
  const [currentUser] = useState({
    name: 'Ariel Parcon',
    email: 'ariel@goli.com',
    role: 'Administrator'
  });

  // Load all data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [prs, inv, ast] = await Promise.all([
        PurchaseRequestService.getAll(),
        InventoryService.getAll(),
        AssetService.getAll()
      ]);
      
      setPurchaseRequests(prs);
      setInventory(inv);
      setAssets(ast);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Purchase Request Functions
  const createPR = async (prData) => {
    const newPR = await PurchaseRequestService.create({
      ...prData,
      requestedBy: currentUser.name
    });
    if (newPR) {
      // Refresh all PRs to ensure sync
      const allPRs = await PurchaseRequestService.getAll();
      setPurchaseRequests(allPRs);
    }
    return newPR;
  };

  const updatePR = async (id, updates) => {
    const updatedPR = await PurchaseRequestService.update(id, {
      ...updates,
      updatedBy: currentUser.name
    });
    if (updatedPR) {
      setPurchaseRequests(prev => 
        prev.map(pr => pr.id === id ? updatedPR : pr)
      );
    }
    return updatedPR;
  };

  const deletePR = async (id) => {
    const success = await PurchaseRequestService.delete(id);
    if (success) {
      setPurchaseRequests(prev => prev.filter(pr => pr.id !== id));
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

  const deleteInventoryItem = async (id) => {
    const success = await InventoryService.delete(id);
    if (success) {
      setInventory(prev => prev.filter(item => item.id !== id));
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
      setAssets(allAssets);
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
    setAssets(allAssets);

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

  const deleteAsset = async (id) => {
    const success = await AssetService.delete(id);
    if (success) {
      setAssets(prev => prev.filter(asset => asset.id !== id));
    }
    return success;
  };

  // Dashboard Stats
  const getStats = () => {
    return {
      totalInventoryItems: inventory.length,
      pendingPRs: purchaseRequests.filter(pr => pr.status === 'Submitted' || pr.status === 'For Canvass').length,
      assetsTagged: assets.filter(asset => asset.isTagged).length,
      lowStockItems: inventory.filter(item => {
        const min = item.min_stock_level ?? item.minStockLevel ?? 0;
        return item.quantity > 0 && item.quantity <= min;
      }).length,
      outOfStockItems: inventory.filter(item => item.quantity === 0).length
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