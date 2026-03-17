import React, { useState, useMemo } from 'react';
import { Package, AlertCircle, ChevronDown, ChevronUp, Users, User } from 'lucide-react';
import Button from '../../components/common/Button';
import { useWMS } from '../../context/WMSContext';

const AssetForm = ({ onClose, onSuccess }) => {
  const { inventory, deployAsset } = useWMS();

  const availableItems = useMemo(() =>
    inventory.filter(item => item.quantity > 0),
    [inventory]
  );

  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity,       setQuantity]       = useState(1);
  const [bulkMode,       setBulkMode]       = useState(false); // individual config per asset
  const [sharedData,     setSharedData]     = useState({
    jorNumber:   '',
    serialNumber:'',
    location:    '',
    assignedTo:  '',
    status:      'In Use',
    purchaseDate: new Date().toISOString().split('T')[0],
    warranty:    '',
  });
  // Per-asset rows for bulk mode
  const [assetRows, setAssetRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const selectedItem = useMemo(() =>
    inventory.find(i => i.id === selectedItemId) || null,
    [inventory, selectedItemId]
  );
  const maxQty   = selectedItem ? selectedItem.quantity : 1;
  const unitPrice = selectedItem ? (selectedItem.unit_price || selectedItem.unitPrice || 0) : 0;
  const totalValue = unitPrice * quantity;

  const handleItemSelect = (e) => {
    setSelectedItemId(e.target.value);
    setQuantity(1);
    setAssetRows([]);
    setBulkMode(false);
  };

  const handleQuantityChange = (newQty) => {
    const val = Math.max(1, Math.min(newQty, maxQty));
    setQuantity(val);
    // Sync assetRows length to quantity
    setAssetRows(prev => {
      const updated = [...prev];
      while (updated.length < val) updated.push({ jorNumber: '', serialNumber: '', assignedTo: '', location: '' });
      return updated.slice(0, val);
    });
  };

  const handleSharedChange = (e) => {
    const { name, value } = e.target;
    setSharedData(prev => ({ ...prev, [name]: value }));
  };

  const handleRowChange = (index, field, value) => {
    setAssetRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleToggleBulkMode = () => {
    if (!bulkMode) {
      // entering bulk mode — pre-fill rows with shared values
      setAssetRows(Array.from({ length: quantity }, () => ({
        jorNumber:   sharedData.jorNumber,
        serialNumber:'',
        assignedTo:  sharedData.assignedTo,
        location:    sharedData.location,
      })));
    }
    setBulkMode(v => !v);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) { alert('Please select an inventory item to deploy.'); return; }

    setLoading(true);
    try {
      let result;
      if (bulkMode && quantity > 1) {
        // Deploy each asset individually with its own data
        let allOk = true;
        for (let i = 0; i < quantity; i++) {
          const row = assetRows[i] || {};
          const r = await deployAsset({
            inventoryItemId: selectedItem.id,
            quantity:        1,
            description:     selectedItem.description,
            category:        selectedItem.category,
            purchasePrice:   unitPrice,
            jorNumber:       row.jorNumber    || sharedData.jorNumber,
            serialNumber:    row.serialNumber || '',
            location:        row.location     || sharedData.location,
            assignedTo:      row.assignedTo   || sharedData.assignedTo,
            status:          sharedData.status,
            purchaseDate:    sharedData.purchaseDate,
            warranty:        sharedData.warranty,
          });
          if (!r) { allOk = false; break; }
          result = r;
        }
        if (!allOk) { alert('Some assets failed to deploy. Please try again.'); return; }
      } else {
        // Standard single-call bulk deploy (same serial/JOR for all)
        result = await deployAsset({
          inventoryItemId: selectedItem.id,
          quantity,
          description:   selectedItem.description,
          category:      selectedItem.category,
          purchasePrice: unitPrice,
          jorNumber:     sharedData.jorNumber,
          serialNumber:  sharedData.serialNumber,
          location:      sharedData.location,
          assignedTo:    sharedData.assignedTo,
          status:        sharedData.status,
          purchaseDate:  sharedData.purchaseDate,
          warranty:      sharedData.warranty,
        });
        if (!result) { alert('Failed to deploy asset. Please try again.'); return; }
      }
      onSuccess?.(result);
      onClose();
    } catch (error) {
      console.error('Error deploying asset:', error);
      alert('Error deploying asset');
    } finally {
      setLoading(false);
    }
  };

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const lbl = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Inventory selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Item from Inventory <span className="text-red-500">*</span>
        </label>
        {availableItems.length === 0 ? (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle size={16} className="text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-700">No items with available stock. Add inventory first.</p>
          </div>
        ) : (
          <select value={selectedItemId} onChange={handleItemSelect} required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— Choose an item —</option>
            {availableItems.map(item => (
              <option key={item.id} value={item.id}>
                [{item.item_code}] {item.description} ({item.category}) — {item.quantity} {item.unit} available
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Selected item info + quantity */}
      {selectedItem && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-0.5">Category</p>
              <p className="font-semibold text-gray-800">{selectedItem.category}</p>
            </div>
            <div>
              <p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-0.5">Available</p>
              <p className="font-semibold text-gray-800">{selectedItem.quantity} {selectedItem.unit}</p>
            </div>
            <div>
              <p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-0.5">Unit Price</p>
              <p className="font-semibold text-gray-800">${unitPrice.toLocaleString()}</p>
            </div>
          </div>

          {/* Quantity stepper */}
          <div className="border-t border-blue-100 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity to Deploy <span className="text-red-500">*</span>
              <span className="ml-2 text-xs font-normal text-gray-400">max {maxQty}</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button type="button" onClick={() => handleQuantityChange(quantity - 1)}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors text-lg font-medium">−</button>
                <input type="number" value={quantity} min={1} max={maxQty}
                  onChange={e => handleQuantityChange(parseInt(e.target.value) || 1)}
                  className="w-16 text-center py-2 border-x border-gray-300 focus:outline-none font-semibold text-gray-800" />
                <button type="button" onClick={() => handleQuantityChange(quantity + 1)}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors text-lg font-medium">+</button>
              </div>
              <span className="text-sm text-gray-500">
                = <strong className="text-gray-800">{quantity}</strong> asset{quantity > 1 ? 's' : ''}
                {unitPrice > 0 && <span className="ml-2 text-blue-600 font-medium">(${totalValue.toLocaleString()})</span>}
              </span>
            </div>
            <div className="mt-2">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(quantity / maxQty) * 100}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Deploying: {quantity}</span>
                <span>Remaining: {maxQty - quantity} {selectedItem.unit}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shared fields */}
      {selectedItem && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>JOR Number</label>
              <input type="text" name="jorNumber" value={sharedData.jorNumber} onChange={handleSharedChange}
                placeholder="e.g. JOR-2025-001" className={inp} />
            </div>
            {!bulkMode && (
              <div>
                <label className={lbl}>
                  Serial Number
                  {quantity > 1 && <span className="ml-1 text-gray-400">(shared prefix)</span>}
                </label>
                <input type="text" name="serialNumber" value={sharedData.serialNumber} onChange={handleSharedChange}
                  placeholder="e.g. SN-12345" className={inp} />
              </div>
            )}
            <div>
              <label className={lbl}>Status <span className="text-red-500">*</span></label>
              <select name="status" value={sharedData.status} onChange={handleSharedChange} required className={inp}>
                <option value="In Use">In Use</option>
                <option value="Available">Available</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Location</label>
              <input type="text" name="location" value={sharedData.location} onChange={handleSharedChange}
                placeholder="e.g. Office 3F, IT Room" className={inp} />
            </div>
            {!bulkMode && (
              <div>
                <label className={lbl}>Assigned To</label>
                <input type="text" name="assignedTo" value={sharedData.assignedTo} onChange={handleSharedChange}
                  placeholder="Employee name" className={inp} />
              </div>
            )}
            <div>
              <label className={lbl}>Deployment Date <span className="text-red-500">*</span></label>
              <input type="date" name="purchaseDate" value={sharedData.purchaseDate} onChange={handleSharedChange}
                required className={inp} />
            </div>
            <div>
              <label className={lbl}>Warranty</label>
              <input type="text" name="warranty" value={sharedData.warranty} onChange={handleSharedChange}
                placeholder="e.g. 3 years" className={inp} />
            </div>
          </div>

          {/* Bulk Mode toggle — only shown when qty > 1 */}
          {quantity > 1 && (
            <button type="button" onClick={handleToggleBulkMode}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                bulkMode
                  ? 'bg-purple-50 border-purple-300 text-purple-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}>
              <div className="flex items-center gap-2">
                {bulkMode ? <Users size={16} /> : <User size={16} />}
                <span>{bulkMode ? 'Bulk Mode: Individual Details Enabled' : 'Enable Bulk Mode — assign different details per asset'}</span>
              </div>
              {bulkMode ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
      )}

      {/* Bulk mode per-asset rows */}
      {selectedItem && bulkMode && quantity > 1 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Individual Asset Details ({quantity} assets)
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {assetRows.map((row, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl items-end">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Asset {i + 1} — JOR #</label>
                  <input type="text" value={row.jorNumber}
                    onChange={e => handleRowChange(i, 'jorNumber', e.target.value)}
                    placeholder="JOR #" className={inp} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Serial #</label>
                  <input type="text" value={row.serialNumber}
                    onChange={e => handleRowChange(i, 'serialNumber', e.target.value)}
                    placeholder="SN-xxxxx" className={inp} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Assigned To</label>
                  <input type="text" value={row.assignedTo}
                    onChange={e => handleRowChange(i, 'assignedTo', e.target.value)}
                    placeholder="Employee" className={inp} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Location</label>
                  <input type="text" value={row.location}
                    onChange={e => handleRowChange(i, 'location', e.target.value)}
                    placeholder="Location" className={inp} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            Fields left blank will use the shared values above. Status, Date, and Warranty are shared across all assets.
          </p>
        </div>
      )}

      {/* Summary notice */}
      {selectedItem && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Package size={15} className="text-green-600 mt-0.5 shrink-0" />
          <p className="text-sm text-green-800">
            Deploying <strong>{quantity} {selectedItem.unit}</strong> of <strong>{selectedItem.description}</strong> will
            create <strong>{quantity} asset record{quantity > 1 ? 's' : ''}</strong> and reduce stock from{' '}
            <strong>{selectedItem.quantity}</strong> to <strong>{selectedItem.quantity - quantity}</strong>.
            {bulkMode && quantity > 1 && <span className="ml-1 text-purple-700 font-medium">Each asset will have its own details.</span>}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="purple" disabled={loading || !selectedItem}>
          {loading ? 'Deploying…'
            : selectedItem
              ? `Deploy ${quantity} Asset${quantity > 1 ? 's' : ''}${bulkMode && quantity > 1 ? ' (Individual)' : ''}`
              : 'Deploy Asset'}
        </Button>
      </div>
    </form>
  );
};

export default AssetForm;