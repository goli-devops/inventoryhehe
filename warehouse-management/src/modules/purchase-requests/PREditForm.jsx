import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Button from '../../components/common/Button';
import { useWMS } from '../../context/WMSContext';

const PREditForm = ({ pr, onClose, onSuccess }) => {
  const { updatePR } = useWMS();
  const [formData, setFormData] = useState({
    department: pr.department || '',
    status: pr.status || 'Submitted',
    notes: pr.notes || '',
    items: pr.items || [{ description: '', quantity: 1, unit: '', estimatedPrice: 0 }]
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unit: '', estimatedPrice: 0 }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await updatePR(pr.id, {
        ...formData,
        // updatedBy will be automatically added by WMSContext
      });
      if (result) {
        onSuccess && onSuccess(result);
        onClose();
      } else {
        alert('Failed to update Purchase Request');
      }
    } catch (error) {
      console.error('Error updating PR:', error);
      alert('Error updating Purchase Request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Department */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Department <span className="text-red-500">*</span>
        </label>
        <select
          name="department"
          value={formData.department}
          onChange={handleInputChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Department</option>
          <option value="IT">IT</option>
          <option value="Finance">Finance</option>
          <option value="Operations">Operations</option>
          <option value="HR">HR</option>
          <option value="Marketing">Marketing</option>
          <option value="Sales">Sales</option>
        </select>
      </div>

      {/* Status */}
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
          <option value="Submitted">Submitted</option>
          <option value="For Canvass">For Canvass</option>
          <option value="Approved">Approved</option>
          <option value="Cancelled">Cancelled</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            Items <span className="text-red-500">*</span>
          </label>
          <Button type="button" variant="outline" size="sm" icon={Plus} onClick={addItem}>
            Add Item
          </Button>
        </div>

        <div className="space-y-3">
          {formData.items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-3 items-start p-3 border border-gray-200 rounded-lg">
              <div className="col-span-5">
                <input
                  type="text"
                  placeholder="Item Description"
                  value={item.description}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                  min="1"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="Unit"
                  value={item.unit}
                  onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  placeholder="Est. Price"
                  value={item.estimatedPrice}
                  onChange={(e) => handleItemChange(index, 'estimatedPrice', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-1 flex items-center justify-center">
                {formData.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          rows="3"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Additional notes or requirements..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Updating...' : 'Update Purchase Request'}
        </Button>
      </div>
    </form>
  );
};

export default PREditForm;