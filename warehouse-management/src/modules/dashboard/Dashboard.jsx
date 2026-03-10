import React, { useEffect, useState } from 'react';
import { Package, Clock } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { useWMS } from '../../context/WMSContext';

// Import forms
import PRForm from '../purchase-requests/PRForm';
import InventoryForm from '../inventory/InventoryForm';
import AssetForm from '../assets/AssetForm';

const Dashboard = () => {
  const { getStats, refreshData } = useWMS();
  const [stats, setStats] = useState({
    totalInventoryItems: 0,
    pendingPRs: 0,
    assetsTagged: 0,
    lowStockItems: 0,
    outOfStockItems: 0
  });

  // Modal states
  const [isPRModalOpen, setIsPRModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // Update stats when component mounts and when data changes
  useEffect(() => {
    const updateStats = () => {
      const currentStats = getStats();
      setStats(currentStats);
    };
    
    updateStats();
    // Refresh data every time we come back to dashboard
    refreshData();
  }, [getStats, refreshData]);

  const handlePRSuccess = () => {
    console.log('PR created successfully from dashboard!');
    const currentStats = getStats();
    setStats(currentStats);
  };

  const handleReceiveSuccess = () => {
    console.log('Items received successfully!');
    const currentStats = getStats();
    setStats(currentStats);
  };

  const handleQRSuccess = () => {
    console.log('Asset with QR code created successfully!');
    const currentStats = getStats();
    setStats(currentStats);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card padding="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Inventory Items</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalInventoryItems}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="text-blue-600" size={24} />
            </div>
          </div>
        </Card>

        <Card padding="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Pending PRs</p>
              <p className="text-3xl font-bold text-gray-800">{stats.pendingPRs}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Package className="text-yellow-600" size={24} />
            </div>
          </div>
        </Card>

        <Card padding="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Assets Tagged</p>
              <p className="text-3xl font-bold text-gray-800">{stats.assetsTagged}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Package className="text-purple-600" size={24} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Recent Activity" className="lg:col-span-2">
          <div className="text-center py-12 text-gray-400">
            <Clock size={48} className="mx-auto mb-3 opacity-50" />
            <p>No recent activities</p>
          </div>
        </Card>

        <Card title="Quick Actions">
          <div className="space-y-3">
            <Button 
              variant="primary" 
              className="w-full justify-center"
              onClick={() => setIsPRModalOpen(true)}
            >
              Create Purchase Request
            </Button>
            <Button 
              variant="success" 
              className="w-full justify-center"
              onClick={() => setIsReceiveModalOpen(true)}
            >
              Receive Items
            </Button>
            <Button 
              variant="purple" 
              className="w-full justify-center"
              onClick={() => setIsQRModalOpen(true)}
            >
              Generate QR Code
            </Button>
            <Button 
              variant="secondary" 
              className="w-full justify-center"
              onClick={() => alert('Export Report feature coming soon!')}
            >
              Export Report
            </Button>
          </div>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Inventory Alerts">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <span className="text-sm font-medium text-orange-900">Low Stock Items</span>
              <span className="text-lg font-bold text-orange-600">{stats.lowStockItems}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="text-sm font-medium text-red-900">Out of Stock</span>
              <span className="text-lg font-bold text-red-600">{stats.outOfStockItems}</span>
            </div>
          </div>
        </Card>

        <Card title="System Health">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-green-900">Database Status</span>
              <span className="text-sm font-semibold text-green-600">● Online</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-900">Last Sync</span>
              <span className="text-sm font-semibold text-blue-600">Just now</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Modals */}
      <Modal
        isOpen={isPRModalOpen}
        onClose={() => setIsPRModalOpen(false)}
        title="New Purchase Request"
        size="lg"
      >
        <PRForm
          onClose={() => setIsPRModalOpen(false)}
          onSuccess={handlePRSuccess}
        />
      </Modal>

      <Modal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        title="Receive Inventory Items"
        size="lg"
      >
        <InventoryForm
          onClose={() => setIsReceiveModalOpen(false)}
          onSuccess={handleReceiveSuccess}
        />
      </Modal>

      <Modal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        title="Add New Asset (Auto-Generate QR)"
        size="lg"
      >
        <AssetForm
          onClose={() => setIsQRModalOpen(false)}
          onSuccess={handleQRSuccess}
        />
      </Modal>
    </div>
  );
};

export default Dashboard;