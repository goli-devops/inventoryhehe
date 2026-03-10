import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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

  // Stable load function — won't change between renders
  const loadAllData = useCallback(async () => {
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
  }, []); // empty deps — never recreated

  // Load once on mount only
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Purchase Request Functions
  const createPR = useCallback(async (prData) => {
    const newPR = await PurchaseRequestService.create({
      ...prData,
      requestedBy: currentUser.name
    });
    if (newPR) {
      const allPRs = await PurchaseRequestService.getAll();
      setPurchaseRequests(allPRs);
    }
    return newPR;
  }, [currentUser.name]);

  const updatePR = useCallback(async (id, updates) => {
    const updatedPR = await PurchaseRequestService.update(id, {
      ...updates,
      updatedBy: currentUser.name
    });
    if (updatedPR) {
      setPurchaseRequests(prev => prev.map(pr => pr.id === id ? updatedPR : pr));
    }
    return updatedPR;
  }, [currentUser.name]);

  const deletePR = useCallback(async (id) => {
    const success = await PurchaseRequestService.delete(id);
    if (success) {
      setPurchaseRequests(prev => prev.filter(pr => pr.id !== id));
    }
    return success;
  }, []);

  // Inventory Functions
  const createInventoryItem = useCallback(async (itemData) => {
    const newItem = await InventoryService.create({
      ...itemData,
      createdBy: currentUser.name
    });
    if (newItem) {
      const allInventory = await InventoryService.getAll();
      setInventory(allInventory);
    }
    return newItem;
  }, [currentUser.name]);

  const updateInventoryItem = useCallback(async (id, updates) => {
    const updatedItem = await InventoryService.update(id, {
      ...updates,
      updatedBy: currentUser.name
    });
    if (updatedItem) {
      setInventory(prev => prev.map(item => item.id === id ? updatedItem : item));
    }
    return updatedItem;
  }, [currentUser.name]);

  const adjustInventoryQuantity = useCallback(async (id, adjustment, type) => {
    const updatedItem = await InventoryService.adjustQuantity(id, adjustment, type, currentUser.name);
    if (updatedItem) {
      setInventory(prev => prev.map(item => item.id === id ? updatedItem : item));
    }
    return updatedItem;
  }, [currentUser.name]);

  const deleteInventoryItem = useCallback(async (id) => {
    const success = await InventoryService.delete(id);
    if (success) {
      setInventory(prev => prev.filter(item => item.id !== id));
    }
    return success;
  }, []);

  // Asset Functions
  const createAsset = useCallback(async (assetData) => {
    const newAsset = await AssetService.create({
      ...assetData,
      createdBy: currentUser.name
    });
    if (newAsset) {
      const allAssets = await AssetService.getAll();
      setAssets(allAssets);
    }
    return newAsset;
  }, [currentUser.name]);

  const updateAsset = useCallback(async (id, updates) => {
    const updatedAsset = await AssetService.update(id, {
      ...updates,
      updatedBy: currentUser.name
    });
    if (updatedAsset) {
      setAssets(prev => prev.map(asset => asset.id === id ? updatedAsset : asset));
    }
    return updatedAsset;
  }, [currentUser.name]);

  const assignAsset = useCallback(async (id, assignedTo) => {
    const updatedAsset = await AssetService.assignAsset(id, assignedTo, currentUser.name);
    if (updatedAsset) {
      setAssets(prev => prev.map(asset => asset.id === id ? updatedAsset : asset));
    }
    return updatedAsset;
  }, [currentUser.name]);

  const returnAsset = useCallback(async (id) => {
    const updatedAsset = await AssetService.returnAsset(id, currentUser.name);
    if (updatedAsset) {
      setAssets(prev => prev.map(asset => asset.id === id ? updatedAsset : asset));
    }
    return updatedAsset;
  }, [currentUser.name]);

  const deleteAsset = useCallback(async (id) => {
    const success = await AssetService.delete(id);
    if (success) {
      setAssets(prev => prev.filter(asset => asset.id !== id));
    }
    return success;
  }, []);

  // Dashboard Stats — memoized so it only recalculates when data actually changes
  const getStats = useCallback(() => {
    return {
      totalInventoryItems: inventory.length,
      pendingPRs: purchaseRequests.filter(pr => pr.status === 'Submitted' || pr.status === 'For Canvass').length,
      assetsTagged: assets.filter(asset => asset.is_tagged || asset.isTagged).length,
      lowStockItems: inventory.filter(item => item.quantity <= (item.min_stock_level || item.minStockLevel || 0) && item.quantity > 0).length,
      outOfStockItems: inventory.filter(item => item.quantity === 0).length
    };
  }, [inventory, purchaseRequests, assets]);

  // Memoize entire context value so consumers only re-render when something actually changed
  const value = useMemo(() => ({
    purchaseRequests,
    inventory,
    assets,
    loading,
    currentUser,
    createPR,
    updatePR,
    deletePR,
    createInventoryItem,
    updateInventoryItem,
    adjustInventoryQuantity,
    deleteInventoryItem,
    createAsset,
    updateAsset,
    assignAsset,
    returnAsset,
    deleteAsset,
    getStats,
    refreshData: loadAllData
  }), [
    purchaseRequests, inventory, assets, loading, currentUser,
    createPR, updatePR, deletePR,
    createInventoryItem, updateInventoryItem, adjustInventoryQuantity, deleteInventoryItem,
    createAsset, updateAsset, assignAsset, returnAsset, deleteAsset,
    getStats, loadAllData
  ]);

  return (
    <WMSContext.Provider value={value}>
      {children}
    </WMSContext.Provider>
  );
};

export default WMSContext;