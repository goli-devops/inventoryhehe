import React, { useState } from 'react';
import { Plus, Filter, Download, Scan, Eye, Edit, Trash2 } from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import AssetForm from './AssetForm';
import AssetEditForm from './AssetEditForm';
import QRModal from '../../components/common/QRModal';
import { useWMS } from '../../context/WMSContext';

const statusClass = (status) => {
  switch (status) {
    case 'Available':   return 'bg-green-100 text-green-800';
    case 'In Use':      return 'bg-blue-100 text-blue-800';
    case 'Maintenance': return 'bg-yellow-100 text-yellow-800';
    case 'Repair':      return 'bg-orange-100 text-orange-800';
    case 'Retired':     return 'bg-gray-100 text-gray-800';
    default:            return 'bg-gray-100 text-gray-600';
  }
};

const Assets = () => {
  const { assets, deleteAsset, getStats } = useWMS();
  const [isAddModalOpen, setIsAddModalOpen]   = useState(false);
  const [editAsset, setEditAsset]             = useState(null);
  const [selectedQRAsset, setSelectedQRAsset] = useState(null);
  const [deletingId, setDeletingId]           = useState(null);
  const stats = getStats();

  const inUseAssets       = assets.filter(a => a.status === 'In Use').length;
  const maintenanceAssets = assets.filter(a => a.status === 'Maintenance' || a.status === 'Repair').length;

  const handleDelete = async (asset) => {
    const assetID = asset.asset_id || asset.assetID;
    if (!window.confirm(`Delete asset ${assetID} — "${asset.description}"?\n\nThis cannot be undone.`)) return;
    setDeletingId(asset.id);
    const success = await deleteAsset(asset.id);
    if (!success) alert('Failed to delete asset. Please try again.');
    setDeletingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="purple" icon={Plus} onClick={() => setIsAddModalOpen(true)}>
            Add Asset
          </Button>
          <Button variant="primary" icon={Scan}>
            Scan QR Code
          </Button>
          <Button variant="outline" icon={Filter}>Filter</Button>
        </div>
        <Button variant="outline" icon={Download}>Export</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card padding="p-4">
          <p className="text-sm text-gray-500 mb-1">Total Assets</p>
          <p className="text-2xl font-bold text-gray-800">{assets.length}</p>
        </Card>
        <Card padding="p-4">
          <p className="text-sm text-gray-500 mb-1">Tagged Assets</p>
          <p className="text-2xl font-bold text-green-600">{stats.assetsTagged}</p>
        </Card>
        <Card padding="p-4">
          <p className="text-sm text-gray-500 mb-1">In Use</p>
          <p className="text-2xl font-bold text-blue-600">{inUseAssets}</p>
        </Card>
        <Card padding="p-4">
          <p className="text-sm text-gray-500 mb-1">Maintenance</p>
          <p className="text-2xl font-bold text-orange-600">{maintenanceAssets}</p>
        </Card>
      </div>

      {/* Table */}
      <Card padding="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-400">
                    <Scan size={48} className="mx-auto mb-3 opacity-50" />
                    <p>No assets found</p>
                    <p className="text-sm mt-1">Add assets and generate QR codes for tracking</p>
                  </td>
                </tr>
              ) : (
                assets.map((asset) => {
                  const assetID   = asset.asset_id || asset.assetID;
                  const isDeleting = deletingId === asset.id;

                  return (
                    <tr key={asset.id} className={`hover:bg-gray-50 transition-colors ${isDeleting ? 'opacity-40' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{assetID}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{asset.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.location || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.assigned_to || asset.assignedTo || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass(asset.status)}`}>
                          {asset.status}
                        </span>
                      </td>
      
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedQRAsset(asset)}
                            className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View QR"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => setEditAsset(asset)}
                            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(asset)}
                            disabled={isDeleting}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Asset Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Asset" size="lg">
        <AssetForm onClose={() => setIsAddModalOpen(false)} onSuccess={() => setIsAddModalOpen(false)} />
      </Modal>

      {/* Edit Asset Modal */}
      <Modal isOpen={!!editAsset} onClose={() => setEditAsset(null)} title="Edit Asset" size="lg">
        {editAsset && (
          <AssetEditForm
            asset={editAsset}
            onClose={() => setEditAsset(null)}
            onSuccess={() => setEditAsset(null)}
          />
        )}
      </Modal>

      {/* QR Code Modal */}
      {selectedQRAsset && (
        <QRModal asset={selectedQRAsset} onClose={() => setSelectedQRAsset(null)} />
      )}
    </div>
  );
};

export default Assets;