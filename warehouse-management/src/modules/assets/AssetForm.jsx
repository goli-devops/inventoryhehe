import React, { useState, useMemo } from 'react';
import { Package, AlertCircle } from 'lucide-react';
import Button from '../../components/common/Button';
import { useWMS } from '../../context/WMSContext';

const AssetForm = ({ onClose, onSuccess }) => {
  const { inventory, deployAsset } = useWMS();

  // Only show inventory items that have stock available
  const availableItems = useMemo(() =>
    inventory.filter(item => item.quantity > 0),
    [inventory]
  );

  const [selectedItemId, setSelectedItemId] = useState('');
  const [formData, setFormData] = useState({
    serialNumber: '',
    location: '',
    assignedTo: '',
    status: 'In Use',
    purchaseDate: new Date().toISOString().split('T')[0],
    warranty: '',
  });
  const [loading, setLoading] = useState(false);

  // The selected inventory item object
  const selectedItem = useMemo(() =>
    inventory.find(i => i.id === selectedItemId) || null,
    [inventory, selectedItemId]
  );

  const handleItemSelect = (e) => {
    setSelectedItemId(e.target.value);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) { alert('Please select an inventory item to deploy.'); return; }

    setLoading(true);
    try {
      const result = await deployAsset({
        // Link back to inventory
        inventoryItemId: selectedItem.id,
        // Asset fields — auto-filled from inventory item
        description:   selectedItem.description,
        category:      selectedItem.category,
        purchasePrice: selectedItem.unit_price || selectedItem.unitPrice || 0,
        // User-filled fields
        serialNumber:  formData.serialNumber,
        location:      formData.location,
        assignedTo:    formData.assignedTo,
        status:        formData.status,
        purchaseDate:  formData.purchaseDate,
        warranty:      formData.warranty,
      });

      if (result) {
        onSuccess && onSuccess(result);
        onClose();
      } else {
        alert('Failed to deploy asset. Please try again.');
      }
    } catch (error) {
      console.error('Error deploying asset:', error);
      alert('Error deploying asset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Step 1 — Pick inventory item */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Item from Inventory <span className="text-red-500">*</span>
        </label>

        {availableItems.length === 0 ? (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle size={16} className="text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-700">
              No items with available stock in inventory. Add stock first before deploying assets.
            </p>
          </div>
        ) : (
          <select
            value={selectedItemId}
            onChange={handleItemSelect}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Choose an item —</option>
            {availableItems.map(item => (
              <option key={item.id} value={item.id}>
                {item.description} ({item.category}) — {item.quantity} {item.unit} available
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Step 2 — Show selected item info card */}
      {selectedItem && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-0.5">Category</p>
            <p className="text-gray-800 font-semibold">{selectedItem.category}</p>
          </div>
          <div>
            <p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-0.5">Stock Available</p>
            <p className="text-gray-800 font-semibold">{selectedItem.quantity} {selectedItem.unit}</p>
          </div>
          <div>
            <p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-0.5">Unit Price</p>
            <p className="text-gray-800 font-semibold">
              ₱{(selectedItem.unit_price || selectedItem.unitPrice || 0).toLocaleString()}
            </p>
          </div>
          <div className="col-span-3">
            <p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-0.5">Item</p>
            <p className="text-gray-800 font-semibold">{selectedItem.description}</p>
          </div>
        </div>
      )}

      {/* Step 3 — Asset-specific details */}
      {selectedItem && (
        <div className="grid grid-cols-2 gap-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Serial Number</label>
            <input
              type="text"
              name="serialNumber"
              value={formData.serialNumber}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., SN-12345"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="In Use">In Use</option>
              <option value="Available">Available</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Office 3F, IT Room"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
            <input
              type="text"
              name="assignedTo"
              value={formData.assignedTo}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Employee name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deployment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="purchaseDate"
              value={formData.purchaseDate}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Warranty</label>
            <input
              type="text"
              name="warranty"
              value={formData.warranty}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 3 years"
            />
          </div>
        </div>
      )}

      {/* Deploy notice */}
      {selectedItem && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Package size={15} className="text-green-600 mt-0.5 shrink-0" />
          <p className="text-sm text-green-800">
            Deploying this asset will deduct <strong>1 {selectedItem.unit}</strong> of <strong>{selectedItem.description}</strong> from inventory
            (current stock: {selectedItem.quantity}).
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="purple" disabled={loading || !selectedItem}>
          {loading ? 'Deploying...' : 'Deploy Asset'}
        </Button>
      </div>
    </form>
  );
};

export default AssetForm;