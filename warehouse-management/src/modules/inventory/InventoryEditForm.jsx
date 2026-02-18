import React, { useState } from 'react';
import Button from '../../components/common/Button';
import { useWMS } from '../../context/WMSContext';

const InventoryEditForm = ({ item, onClose, onSuccess }) => {
  const { updateInventoryItem } = useWMS();
  const [formData, setFormData] = useState({
    description: item.description || '',
    category: item.category || '',
    quantity: item.quantity || 0,
    unit: item.unit || '',
    location: item.location || '',
    minStockLevel: item.min_stock_level || item.minStockLevel || 0,
    maxStockLevel: item.max_stock_level || item.maxStockLevel || 0,
    unitPrice: item.unit_price || item.unitPrice || 0,
    supplier: item.supplier || ''
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Calculate new status based on quantity
      let status = 'In Stock';
      if (formData.quantity === 0) status = 'Out of Stock';
      else if (formData.quantity <= formData.minStockLevel) status = 'Low Stock';

      const result = await updateInventoryItem(item.id, {
        ...formData,
        status
      });
      
      if (result) {
        onSuccess && onSuccess(result);
        onClose();
      } else {
        alert('Failed to update inventory item');
      }
    } catch (error) {
      console.error('Error updating inventory item:', error);
      alert('Error updating inventory item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Description */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Item Description <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Category</option>
            <option value="Electronics">Electronics</option>
            <option value="Office Supplies">Office Supplies</option>
            <option value="Furniture">Furniture</option>
            <option value="Hardware">Hardware</option>
            <option value="Software">Software</option>
            <option value="Consumables">Consumables</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Unit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Unit <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="unit"
            value={formData.unit}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quantity <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleNumberChange}
            min="0"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Unit Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Unit Price
          </label>
          <input
            type="number"
            name="unitPrice"
            value={formData.unitPrice}
            onChange={handleNumberChange}
            min="0"
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Min Stock Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Min Stock Level
          </label>
          <input
            type="number"
            name="minStockLevel"
            value={formData.minStockLevel}
            onChange={handleNumberChange}
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Max Stock Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Stock Level
          </label>
          <input
            type="number"
            name="maxStockLevel"
            value={formData.maxStockLevel}
            onChange={handleNumberChange}
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Storage Location
          </label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Supplier */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Supplier
          </label>
          <input
            type="text"
            name="supplier"
            value={formData.supplier}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Updating...' : 'Update Item'}
        </Button>
      </div>
    </form>
  );
};

export default InventoryEditForm;