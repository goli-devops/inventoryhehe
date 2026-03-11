import React, { useState, useMemo } from 'react';
import { Package, AlertCircle } from 'lucide-react';
import Button from '../../components/common/Button';
import { useWMS } from '../../context/WMSContext';

const AssetForm = ({ onClose, onSuccess }) => {
  const { inventory, deployAsset } = useWMS();

  const availableItems = useMemo(() =>
    inventory.filter(item => item.quantity > 0),
    [inventory]
  );

  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [formData, setFormData] = useState({
    serialNumber: '',
    location: '',
    assignedTo: '',
    status: 'In Use',
    purchaseDate: new Date().toISOString().split('T')[0],
    warranty: '',
  });
  const [loading, setLoading] = useState(false);

  const selectedItem = useMemo(() =>
    inventory.find(i => i.id === selectedItemId) || null,
    [inventory, selectedItemId]
  );

  const maxQty = selectedItem ? selectedItem.quantity : 1;

  const handleItemSelect = (e) => {
    setSelectedItemId(e.target.value);
    setQuantity(1); // reset qty when item changes
  };

  const handleQuantityChange = (e) => {
    const val = Math.max(1, Math.min(parseInt(e.target.value) || 1, maxQty));
    setQuantity(val);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) { alert('Please select an inventory item to deploy.'); return; }
    if (quantity < 1 || quantity > maxQty) {
      alert(`Quantity must be between 1 and ${maxQty}.`);
      return;
    }

    setLoading(true);
    try {
      const result = await deployAsset({
        inventoryItemId: selectedItem.id,
        quantity,
        description:   selectedItem.description,
        category:      selectedItem.category,
        purchasePrice: selectedItem.unit_price || selectedItem.unitPrice || 0,
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

  const unitPrice = selectedItem ? (selectedItem.unit_price || selectedItem.unitPrice || 0) : 0;
  const totalValue = unitPrice * quantity;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Inventory item selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Item from Inventory <span className="text-red-500">*</span>
        </label>
        {availableItems.length === 0 ? (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle size={16} className="text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-700">
              No items with available stock. Add inventory stock first before deploying assets.
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

      {/* Selected item info + quantity */}
      {selectedItem && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-4">
          {/* Item details */}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-0.5">Category</p>
              <p className="text-gray-800 font-semibold">{selectedItem.category}</p>
            </div>
            <div>
              <p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-0.5">Available Stock</p>
              <p className="text-gray-800 font-semibold">{selectedItem.quantity} {selectedItem.unit}</p>
            </div>
            <div>
              <p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-0.5">Unit Price</p>
              <p className="text-gray-800 font-semibold">₱{unitPrice.toLocaleString()}</p>
            </div>
          </div>

          {/* Quantity picker */}
          <div className="border-t border-blue-100 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity to Deploy <span className="text-red-500">*</span>
              <span className="ml-2 text-xs font-normal text-gray-400">max {maxQty} {selectedItem.unit}</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors text-lg font-medium"
                >−</button>
                <input
                  type="number"
                  value={quantity}
                  onChange={handleQuantityChange}
                  min={1}
                  max={maxQty}
                  className="w-16 text-center py-2 border-x border-gray-300 focus:outline-none text-gray-800 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors text-lg font-medium"
                >+</button>
              </div>
              <div className="text-sm text-gray-500">
                = <span className="font-semibold text-gray-800">{quantity}</span> asset record{quantity > 1 ? 's' : ''} will be created
                {unitPrice > 0 && (
                  <span className="ml-2 text-blue-600 font-medium">
                    (Total: ₱{totalValue.toLocaleString()})
                  </span>
                )}
              </div>
            </div>
            {/* Stock bar */}
            <div className="mt-2">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(quantity / maxQty) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Deploying: {quantity}</span>
                <span>Remaining after: {maxQty - quantity} {selectedItem.unit}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Asset-specific details */}
      {selectedItem && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Serial Number
              {quantity > 1 && <span className="ml-1 text-xs text-gray-400">(optional for bulk)</span>}
            </label>
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

      {/* Deploy summary notice */}
      {selectedItem && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Package size={15} className="text-green-600 mt-0.5 shrink-0" />
          <p className="text-sm text-green-800">
            Deploying <strong>{quantity} {selectedItem.unit}</strong> of{' '}
            <strong>{selectedItem.description}</strong> will create{' '}
            <strong>{quantity} asset record{quantity > 1 ? 's' : ''}</strong> and reduce
            inventory stock from <strong>{selectedItem.quantity}</strong> to{' '}
            <strong>{selectedItem.quantity - quantity}</strong>.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="purple" disabled={loading || !selectedItem}>
          {loading
            ? 'Deploying...'
            : selectedItem
              ? `Deploy ${quantity} Asset${quantity > 1 ? 's' : ''}`
              : 'Deploy Asset'}
        </Button>
      </div>
    </form>
  );
};

export default AssetForm;