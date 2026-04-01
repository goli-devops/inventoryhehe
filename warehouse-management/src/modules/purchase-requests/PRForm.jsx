import React, { useState } from 'react';
import { Plus, Trash2, Hash } from 'lucide-react';
import Button from '../../components/common/Button';
import { useWMS } from '../../context/WMSContext';
import { useSettings } from '../../context/SettingsContext';

const TERMS_OPTIONS = [
  'Cash on Delivery',
  'Net 15',
  'Net 30',
  'Net 60',
  '50% Down Payment',
  'Full Payment in Advance',
];

const PRForm = ({ onClose, onSuccess }) => {
  const { createPR } = useWMS();
  const { departments, units } = useSettings();

  const [formData, setFormData] = useState({
    prNumber: '',
    jorNumber: '',
    department: '',
    requestedBy: '',
    supplier: '',
    companyName: '',
    contactPerson: '',
    contactNumber: '',
    terms: '',
    notes: '',
    items: [{ description: '', quantity: 1, unit: '', estimatedPrice: '' }],
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

  const addItem = () => setFormData(prev => ({
    ...prev,
    items: [...prev.items, { description: '', quantity: 1, unit: '', estimatedPrice: '' }],
  }));

  const removeItem = (index) => {
    if (formData.items.length > 1)
      setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  // Prevent Enter from submitting / adding items — only the Add Item button should do that
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') e.preventDefault();
  };

  const totalEstimated = formData.items.reduce((sum, i) =>
    sum + (parseFloat(i.estimatedPrice) || 0) * (parseInt(i.quantity) || 1), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await createPR(formData);
      if (result) { onSuccess?.(result); onClose(); }
      else alert('Failed to create Purchase Request');
    } catch (err) {
      console.error(err);
      alert('Error creating Purchase Request');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

  // Floating label select — shows placeholder text above when a value is selected
  const FloatingSelect = ({ name, value, onChange, options, placeholder, required }) => (
    <div className="relative">
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className={`${inputCls} ${!value ? 'text-gray-400' : 'text-gray-800'}`}
      >
        <option value="" disabled hidden>{placeholder}</option>
        {options.map(o => <option key={o} value={o} className="text-gray-800">{o}</option>)}
      </select>
      {value && (
        <span className="absolute -top-2 left-2.5 bg-white px-1 text-xs text-blue-600 font-medium pointer-events-none">
          {placeholder}
        </span>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">

      {/* Row 1: PR Number + JOR Number */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>
            PR Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="prNumber"
              value={formData.prNumber}
              onChange={e => setFormData(prev => ({ ...prev, prNumber: e.target.value }))}
              required
              placeholder="e.g. 20250001"
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>JOR Number</label>
          <div className="relative">
            <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="jorNumber"
              value={formData.jorNumber}
              onChange={e => setFormData(prev => ({ ...prev, jorNumber: e.target.value }))}
              placeholder="e.g. 20250001"
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Row 2: Department */}
      <div>
        <label className={labelCls}>Department</label>
        <FloatingSelect
          name="department"
          value={formData.department}
          onChange={handleInputChange}
          options={departments}
          placeholder="Select Department"
        />
      </div>

      {/* Row 3: Requester's Name */}
      <div>
        <label className={labelCls}>Requester's Name <span className="text-red-500">*</span></label>
        <input type="text" name="requestedBy" value={formData.requestedBy} onChange={handleInputChange}
          required placeholder="Full name of the requester" className={inputCls} />
      </div>

      {/* Supplier section */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-4 bg-gray-50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Supplier Information</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Supplier</label>
            <input type="text" name="supplier" value={formData.supplier} onChange={handleInputChange}
              placeholder="Supplier name" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Company Name</label>
            <input type="text" name="companyName" value={formData.companyName} onChange={handleInputChange}
              placeholder="Company name" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Contact Person</label>
            <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleInputChange}
              placeholder="Contact person" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Contact Number</label>
            <input type="text" inputMode="numeric" name="contactNumber" value={formData.contactNumber}
              onChange={e => setFormData(prev => ({ ...prev, contactNumber: e.target.value.replace(/\D/g, '') }))}
              placeholder="e.g. 09123456789" className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Payment Terms</label>
            <FloatingSelect
              name="terms"
              value={formData.terms}
              onChange={handleInputChange}
              options={TERMS_OPTIONS}
              placeholder="Select Terms"
            />
          </div>
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className={labelCls}>Items <span className="text-red-500">*</span></label>
          <Button type="button" variant="outline" size="sm" icon={Plus} onClick={addItem}>Add Item</Button>
        </div>
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
            <div className="col-span-5">Description</div>
            <div className="col-span-2">Qty</div>
            <div className="col-span-2">Unit</div>
            <div className="col-span-2">Est. Price</div>
            <div className="col-span-1"></div>
          </div>
          {formData.items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 border border-gray-200 rounded-lg bg-white">
              <div className="col-span-5">
                <input type="text" placeholder="Item description" value={item.description}
                  onChange={e => handleItemChange(index, 'description', e.target.value)}
                  required className={inputCls} />
              </div>
              <div className="col-span-2">
                <input type="number" placeholder="Qty" value={item.quantity} min="1"
                  onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                  className={inputCls} />
              </div>
              <div className="col-span-2">
                <select value={item.unit}
                  onChange={e => handleItemChange(index, 'unit', e.target.value)}
                  className={inputCls}>
                  <option value="" disabled>— Select unit —</option>
                  {units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <input type="number" placeholder="0.00" value={item.estimatedPrice} min="0" step="0.01"
                  onChange={e => handleItemChange(index, 'estimatedPrice', e.target.value)}
                  className={inputCls} />
              </div>
              <div className="col-span-1 flex justify-center">
                {formData.items.length > 1 && (
                  <button type="button" onClick={() => removeItem(index)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {totalEstimated > 0 && (
          <div className="flex justify-end mt-2">
            <span className="text-sm font-semibold text-gray-700">
              Estimated Total: <span className="text-blue-600">₱{totalEstimated.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </span>
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className={labelCls}>Notes</label>
        <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="2"
          placeholder="Additional notes or requirements..." className={inputCls} />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Creating…' : 'Create Purchase Request'}
        </Button>
      </div>
    </form>
  );
};

export default PRForm;