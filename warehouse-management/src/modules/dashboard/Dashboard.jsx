import React, { useEffect, useState } from 'react';
import { Package, Clock } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { useWMS } from '../../context/WMSContext';

import PRForm from '../purchase-requests/PRForm';
import InventoryForm from '../inventory/InventoryForm';
import AssetForm from '../assets/AssetForm';

const Dashboard = () => {
  const { getStats, refreshData } = useWMS();

  // Derive stats directly — getStats is memoized in context so this is safe
  const stats = getStats();

  const [isPRModalOpen, setIsPRModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // Refresh data once when dashboard mounts — empty deps means this runs exactly once
  useEffect(() => {
    refreshData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        <Card padding="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Low Stock Items</p>
              <p className="text-3xl font-bold text-orange-600">{stats.lowStockItems}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Package className="text-orange-600" size={24} />
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
              Add New Asset
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

      {/* Inventory Alerts */}
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
      </div>

      {/* Modals */}
      <Modal isOpen={isPRModalOpen} onClose={() => setIsPRModalOpen(false)} title="New Purchase Request" size="lg">
        <PRForm onClose={() => setIsPRModalOpen(false)} onSuccess={() => setIsPRModalOpen(false)} />
      </Modal>

      <Modal isOpen={isReceiveModalOpen} onClose={() => setIsReceiveModalOpen(false)} title="Receive Inventory Items" size="lg">
        <InventoryForm onClose={() => setIsReceiveModalOpen(false)} onSuccess={() => setIsReceiveModalOpen(false)} />
      </Modal>

      <Modal isOpen={isQRModalOpen} onClose={() => setIsQRModalOpen(false)} title="Add New Asset (Auto-Generate QR)" size="lg">
        <AssetForm onClose={() => setIsQRModalOpen(false)} onSuccess={() => setIsQRModalOpen(false)} />
      </Modal>
    </div>
  );
};

export default Dashboard;