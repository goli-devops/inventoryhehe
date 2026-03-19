import React, { useState } from 'react';
import Button from '../../components/common/Button';
import { useWMS } from '../../context/WMSContext';
import { useSettings } from '../../context/SettingsContext';

const AssetEditForm = ({ asset, onClose, onSuccess }) => {
  const { updateAsset } = useWMS();
  const { categories } = useSettings();

  const [formData, setFormData] = useState({
    description:      asset.description || '',
    category:         asset.category || '',
    poNumber:         asset.po_number || asset.poNumber || '',
    prNumber:         asset.pr_number || asset.prNumber || '',
    jorNumber:        asset.jor_number || asset.jorNumber || '',
    accountabilitySeq:asset.accountability_seq || asset.accountabilitySeq || '',
    transmittalSeq:   asset.transmittal_seq || asset.transmittalSeq || '',
    serialNumber:     asset.serial_number || asset.serialNumber || '',
    location:         asset.location || '',
    assignedTo:       asset.assigned_to || asset.assignedTo || '',
    status:           asset.status || 'Available',
    purchaseDate:     asset.purchase_date || asset.purchaseDate || new Date().toISOString().split('T')[0],
    purchasePrice:    asset.purchase_price || asset.purchasePrice || 0,
    warrantyValue:    (asset.warranty || '').split(' ')[0] || '',
    warrantyUnit:     (asset.warranty || '').split(' ').slice(1).join(' ') || 'Year/s',
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
      const result = await updateAsset(asset.id, {
        description:       formData.description,
        category:          formData.category,
        po_number:         formData.poNumber,
        pr_number:         formData.prNumber,
        jor_number:        formData.jorNumber,
        accountability_seq:formData.accountabilitySeq,
        transmittal_seq:   formData.transmittalSeq,
        serial_number:     formData.serialNumber,
        location:          formData.location,
        assigned_to:       formData.assignedTo,
        status:            formData.status,
        purchase_date:     formData.purchaseDate,
        purchase_price:    formData.purchasePrice,
        warranty:          formData.warrantyValue ? `${formData.warrantyValue} ${formData.warrantyUnit}` : '',
      });
      if (result) { onSuccess?.(result); onClose(); }
      else alert('Failed to update asset');
    } catch (error) {
      console.error(error);
      alert('Error updating asset');
    } finally {
      setLoading(false);
    }
  };

  const inp = 'w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const lbl = 'block text-sm font-medium text-gray-700 mb-2';
  const sec = 'p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Reference Numbers */}
      <div className={sec}>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reference Numbers</p>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lbl}>PO Number</label>
            <input type="text" name="poNumber" value={formData.poNumber} onChange={handleInputChange}
              placeholder="e.g. PO-2025-001" className={inp} /></div>
          <div><label className={lbl}>PR Number</label>
            <input type="text" name="prNumber" value={formData.prNumber} onChange={handleInputChange}
              placeholder="e.g. PR-2025-001" className={inp} /></div>
          <div><label className={lbl}>JOR Number</label>
            <input type="text" name="jorNumber" value={formData.jorNumber} onChange={handleInputChange}
              placeholder="e.g. JOR-2025-001" className={inp} /></div>
          <div><label className={lbl}>Accountability Seq. No.</label>
            <input type="text" name="accountabilitySeq" value={formData.accountabilitySeq} onChange={handleInputChange}
              placeholder="e.g. ACC-001" className={inp} /></div>
          <div><label className={lbl}>Transmittal Seq. No.</label>
            <input type="text" name="transmittalSeq" value={formData.transmittalSeq} onChange={handleInputChange}
              placeholder="e.g. TRS-001" className={inp} /></div>
        </div>
      </div>

      {/* Asset Info */}
      <div className={sec}>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Asset Information</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className={lbl}>Asset Description <span className="text-red-500">*</span></label>
            <input type="text" name="description" value={formData.description} onChange={handleInputChange}
              required className={inp} /></div>
          <div><label className={lbl}>Category <span className="text-red-500">*</span></label>
            <select name="category" value={formData.category} onChange={handleInputChange} required className={inp}>
              <option value="">Select Category</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select></div>
          <div><label className={lbl}>Serial Number</label>
            <input type="text" name="serialNumber" value={formData.serialNumber} onChange={handleInputChange}
              className={inp} /></div>
          <div><label className={lbl}>Status <span className="text-red-500">*</span></label>
            <select name="status" value={formData.status} onChange={handleInputChange} required className={inp}>
              <option value="In Progress">In Progress</option>
              <option value="Deployed">Deployed</option>
              <option value="For Delivery">For Delivery</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select></div>
          <div><label className={lbl}>Location</label>
            <input type="text" name="location" value={formData.location} onChange={handleInputChange}
              placeholder="e.g. Office 3F" className={inp} /></div>
          <div><label className={lbl}>Assigned To</label>
            <input type="text" name="assignedTo" value={formData.assignedTo} onChange={handleInputChange}
              placeholder="Employee name" className={inp} /></div>
          <div><label className={lbl}>Purchase Date <span className="text-red-500">*</span></label>
            <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleInputChange}
              required className={inp} /></div>
          <div><label className={lbl}>Purchase Price</label>
            <input type="number" name="purchasePrice" value={formData.purchasePrice} onChange={handleNumberChange}
              min="0" step="0.01" className={inp} /></div>
          <div className="col-span-2">
            <label className={lbl}>Warranty</label>
            <div className="flex gap-2">
              <input type="number" min="0" name="warrantyValue" value={formData.warrantyValue}
                onChange={handleInputChange} placeholder="e.g. 1"
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <select name="warrantyUnit" value={formData.warrantyUnit} onChange={handleInputChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Days</option>
                <option>Weeks</option>
                <option>Months</option>
                <option>Year/s</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="purple" disabled={loading}>
          {loading ? 'Updating…' : 'Update Asset'}
        </Button>
      </div>
    </form>
  );
};

export default AssetEditForm;