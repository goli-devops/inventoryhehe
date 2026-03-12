import React, { useState } from 'react';
import { Hash } from 'lucide-react';
import Button from '../../components/common/Button';
import { useWMS } from '../../context/WMSContext';
import { useSettings } from '../../context/SettingsContext';

const InventoryForm = ({ onClose, onSuccess }) => {
  const { createInventoryItem } = useWMS();
  const { categories, units } = useSettings();

  const [formData, setFormData] = useState({
    itemCode: '',
    description: '',
    category: '',
    quantity: '',
    unit: '',
    location: '',
    minStockLevel: '',
    maxStockLevel: '',
    unitPrice: '',
    supplier: '',
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseFloat(value) || '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await createInventoryItem(formData);
      if (result) { onSuccess?.(result); onClose(); }
      else alert('Failed to create inventory item');
    } catch (err) {
      console.error(err);
      alert('Error creating inventory item');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">

        {/* Item Code */}
        <div>
          <label className={labelCls}>
            Item Code <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="itemCode"
              value={formData.itemCode}
              onChange={handleInputChange}
              required
              placeholder="e.g. ELC-001"
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className={labelCls}>Category <span className="text-red-500">*</span></label>
          <select name="category" value={formData.category} onChange={handleInputChange} required className={inputCls}>
            <option value="">Select Category</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Description */}
        <div className="col-span-2">
          <label className={labelCls}>Item Description <span className="text-red-500">*</span></label>
          <input type="text" name="description" value={formData.description} onChange={handleInputChange}
            required placeholder="Enter item description" className={inputCls} />
        </div>

        {/* Quantity */}
        <div>
          <label className={labelCls}>Initial Quantity <span className="text-red-500">*</span></label>
          <input type="number" name="quantity" value={formData.quantity} onChange={handleNumberChange}
            required min="0" className={inputCls} />
        </div>

        {/* Unit */}
        <div>
          <label className={labelCls}>Unit <span className="text-red-500">*</span></label>
          <select name="unit" value={formData.unit} onChange={handleInputChange} required className={inputCls}>
            {units.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        {/* Unit Price */}
        <div>
          <label className={labelCls}>Unit Price <span className="text-red-500">*</span></label>
          <input type="number" name="unitPrice" value={formData.unitPrice} onChange={handleNumberChange}
            required min="0" step="1" placeholder="0.00" className={inputCls} />
        </div>

        {/* Location */}
        <div>
          <label className={labelCls}>Storage Location</label>
          <input type="text" name="location" value={formData.location} onChange={handleInputChange}
            placeholder="e.g. Warehouse A, Shelf B-3" className={inputCls} />
        </div>

        {/* Min Stock */}
        <div>
          <label className={labelCls}>Min Stock Level <span className="text-red-500">*</span></label>
          <input type="number" name="minStockLevel" value={formData.minStockLevel} onChange={handleNumberChange}
            required min="0" className={inputCls} />
        </div>

        {/* Max Stock */}
        <div>
          <label className={labelCls}>Max Stock Level <span className="text-red-500">*</span></label>
          <input type="number" name="maxStockLevel" value={formData.maxStockLevel} onChange={handleNumberChange}
            required min="0" className={inputCls} />
        </div>

        {/* Supplier */}
        <div className="col-span-2">
          <label className={labelCls}>Supplier</label>
          <input type="text" name="supplier" value={formData.supplier} onChange={handleInputChange}
            placeholder="Supplier name" className={inputCls} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Adding…' : 'Add Item'}
        </Button>
      </div>
    </form>
  );
};

export default InventoryForm;