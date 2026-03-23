import React, { useState, useCallback } from 'react';
import { Hash, QrCode, RefreshCw, ChevronDown, ChevronUp, Package, Printer } from 'lucide-react';
import Button from '../../components/common/Button';
import { useWMS } from '../../context/WMSContext';
import { useSettings } from '../../context/SettingsContext';
import QRCodeDisplay, { buildInventoryQRPayload } from '../../components/common/QRCodeDisplay';

// ── Print asset tag QR codes ──────────────────────────────────────────────────
const printAllAssetTags = (formData, assetTags, buildPayload) => {
  const validTags = assetTags.filter(Boolean);
  if (validTags.length === 0) { alert('No asset tags to print. Add tags first.'); return; }
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) { alert('Please allow pop-ups to print.'); return; }

  const cards = validTags.map((tag, i) => `
    <div class="qr-card">
      <div id="qr_${i}"></div>
      <div class="qr-info">
        <p class="item-name">${formData.description || ''}</p>
        <p class="tag-num">Asset Tag: <strong>${tag}</strong></p>
        <p class="unit-num">Unit ${i + 1} of ${validTags.length}</p>
        <p class="category">${formData.category || ''}</p>
      </div>
    </div>`).join('');

  const scripts = validTags.map((tag, i) =>
    `new QRCode(document.getElementById('qr_${i}'), { text: ${JSON.stringify(buildPayload({ item_code: '', description: formData.description, category: formData.category, location: formData.location }, tag, i))}, width: 96, height: 96 });`
  ).join('\n');

  printWindow.document.write(`<!DOCTYPE html><html><head><title>Asset Tags</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial;padding:16px}h2{font-size:13px;margin-bottom:10px;color:#333}
.grid{display:flex;flex-wrap:wrap;gap:10px}
.qr-card{display:flex;align-items:center;gap:10px;border:1px solid #ddd;border-radius:8px;padding:10px;width:260px}
.item-name{font-size:11px;font-weight:700;margin-bottom:2px;word-break:break-word}
.tag-num{font-size:11px;color:#333}.unit-num{font-size:10px;color:#666;margin-top:2px}.category{font-size:9px;color:#999;margin-top:2px}
@media print{body{padding:4px}}</style></head>
<body><h2>Asset Tags: ${formData.description} (${validTags.length} unit${validTags.length !== 1 ? 's' : ''})</h2>
<div class="grid">${cards}</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script>window.addEventListener('load',()=>{setTimeout(()=>{${scripts};setTimeout(()=>window.print(),600)},300)})</script>
</body></html>`);
  printWindow.document.close();
};


// buildInventoryQRPayload imported from QRCodeDisplay

// ── Auto-generate a numeric asset tag ────────────────────────────────────────
const genTag = (index) => {
  const base = Date.now().toString().slice(-7);
  return `${base}${String(index + 1).padStart(3, '0')}`;
};

// ── Single asset tag row ──────────────────────────────────────────────────────
const AssetTagRow = ({ index, tag, showQR, formData, onTagChange, onToggleQR }) => {
  const qrAsset = showQR ? {
    asset_id: tag,
    description: formData.description,
    category: formData.category,
    location: formData.location,
    status: 'In Stock',
    serial_number: '',
    assigned_to: '',
  } : null;

  return (
    <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-gray-400 w-14 flex-shrink-0">Unit {index + 1}</span>
        <div className="relative flex-1">
          <Hash size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={tag}
            onChange={e => onTagChange(index, e.target.value.replace(/\D/g, ''))}
            placeholder="Numeric asset tag"
            inputMode="numeric"
            className="w-full pl-7 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={() => onTagChange(index, genTag(index))}
          title="Auto-generate tag"
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
        >
          <RefreshCw size={14} />
        </button>
        {tag ? (
          <button
            type="button"
            onClick={() => onToggleQR(index)}
            title={showQR ? 'Hide QR' : 'Generate QR'}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
              showQR ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
            }`}
          >
            <QrCode size={13} /> {showQR ? 'Hide QR' : 'QR'}
          </button>
        ) : (
          <span className="text-xs text-gray-400 px-2 flex-shrink-0">No tag</span>
        )}
      </div>

      {showQR && tag && (
        <div className="flex items-center gap-4 pl-14 pt-1">
          <QRCodeDisplay
            value={buildInventoryQRPayload(formData, tag, index)}
            label={tag}
            size={80}
          />
          <div className="text-xs text-gray-500 space-y-1">
            <p className="font-mono font-medium text-gray-700">{tag}</p>
            <p className="text-gray-400">Unit {index + 1} of {formData.quantity}</p>
          </div>
        </div>
      )}
      {showQR && !tag && (
        <p className="text-xs text-orange-400 pl-14">No asset tag — QR code will not be generated for this unit.</p>
      )}
    </div>
  );
};

// ── Main Form ─────────────────────────────────────────────────────────────────
const InventoryForm = ({ onClose, onSuccess }) => {
  const { createInventoryItem, inventory } = useWMS();
  const { categories, units } = useSettings();

  const [formData, setFormData] = useState({
    description:   '',
    category:      '',
    quantity:      '',
    unit:          '',
    location:      '',
    minStockLevel: '',
    maxStockLevel: '',
    unitPrice:     '',
    supplier:      '',
  });

  const [assetTags,    setAssetTags]    = useState([]);   // one per unit
  const [qrVisible,    setQrVisible]    = useState([]);   // which units show QR
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [descError,    setDescError]    = useState('');

  const qty = parseInt(formData.quantity) || 0;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Live duplicate description check (case-insensitive)
    if (name === 'description') {
      const dup = (inventory || []).find(
        i => i.description?.toLowerCase().trim() === value.toLowerCase().trim()
      );
      setDescError(dup ? `An item with this description already exists: "${dup.description}"` : '');
    }
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseFloat(value) || '' }));
  };

  // Sync tag rows when quantity changes
  const handleQuantityChange = (e) => {
    const newQty = parseInt(e.target.value) || 0;
    setFormData(prev => ({ ...prev, quantity: e.target.value }));
    setAssetTags(prev => {
      const updated = [...prev];
      while (updated.length < newQty) updated.push('');
      return updated.slice(0, newQty);
    });
    setQrVisible(prev => {
      const updated = [...prev];
      while (updated.length < newQty) updated.push(false);
      return updated.slice(0, newQty);
    });
  };

  const handleTagChange = (index, value) => {
    setAssetTags(prev => { const n = [...prev]; n[index] = value; return n; });
  };

  const handleToggleQR = (index) => {
    setQrVisible(prev => { const n = [...prev]; n[index] = !n[index]; return n; });
  };

  const autoGenerateAllTags = () => {
    setAssetTags(Array.from({ length: qty }, (_, i) => genTag(i)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (descError) return;
    setLoading(true);
    try {
      // Final duplicate check in case inventory loaded after mount
      const dup = (inventory || []).find(
        i => i.description?.toLowerCase().trim() === formData.description.toLowerCase().trim()
      );
      if (dup) {
        setDescError(`An item with this description already exists: "${dup.description}"`);
        setLoading(false);
        return;
      }
      // Attach asset tags to item data so service can store them
      const result = await createInventoryItem({
        ...formData,
        // itemCode not passed — service uses first assetTag or generates unique code
        assetTags: assetTags.filter(Boolean),
      });
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
            required placeholder="Enter item description"
            className={`${inputCls} ${descError ? 'border-red-400 focus:ring-red-400' : ''}`} />
          {descError && (
            <div className="flex items-start gap-2 mt-1.5 p-2 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-red-500 text-xs mt-0.5 flex-shrink-0">⚠</span>
              <p className="text-xs text-red-600">{descError}</p>
            </div>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label className={labelCls}>Initial Quantity <span className="text-red-500">*</span></label>
          <input type="number" name="quantity" value={formData.quantity}
            onChange={handleQuantityChange}
            required min="0" className={inputCls} />
        </div>

        {/* Unit */}
        <div>
          <label className={labelCls}>Unit <span className="text-red-500">*</span></label>
          <select name="unit" value={formData.unit} onChange={handleInputChange} required className={inputCls}>
            <option value="">Select Unit</option>
            {units.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        {/* Unit Price */}
        <div>
          <label className={labelCls}>Unit Price <span className="text-red-500">*</span></label>
          <input type="number" name="unitPrice" value={formData.unitPrice} onChange={handleNumberChange}
            required min="0" step="0.01" placeholder="0.00" className={inputCls} />
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

      {/* Asset Tag + QR Panel — shown when qty > 0 */}
      {qty > 0 && (
        <div className="border border-blue-100 rounded-xl overflow-hidden">
          {/* Panel header toggle */}
          <button
            type="button"
            onClick={() => setShowTagPanel(v => !v)}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors ${
              showTagPanel ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <QrCode size={16} />
              <span>Asset Tags &amp; QR Codes <span className="text-xs font-normal opacity-70">(optional)</span></span>
              <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {qty} unit{qty !== 1 ? 's' : ''}
              </span>
              {assetTags.filter(Boolean).length > 0 && (
                <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {assetTags.filter(Boolean).length} tagged
                </span>
              )}
            </div>
            {showTagPanel ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showTagPanel && (
            <div className="p-4 space-y-3 border-t border-blue-100 bg-white">
              {/* Auto-generate all */}
              <div className="flex items-center justify-between">
<p className="text-xs text-gray-500">
                  Optional — assign a unique numeric asset tag per unit to generate QR codes.
                  Items without tags will show as N/A in Asset Tracking.
                </p>
                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => printAllAssetTags(formData, assetTags, buildInventoryQRPayload)}
                    disabled={!assetTags.some(Boolean)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white text-xs font-medium rounded-lg hover:bg-green-800 disabled:opacity-40 transition-colors"
                  >
                    <Printer size={12} /> Print Asset Tags
                  </button>
                  <button
                    type="button"
                    onClick={autoGenerateAllTags}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 text-white text-xs font-medium rounded-lg hover:bg-blue-800 transition-colors"
                  >
                    <RefreshCw size={12} /> Auto-tag All
                  </button>
                </div>
              </div>

              {/* Per-unit rows */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {Array.from({ length: qty }, (_, i) => (
                  <AssetTagRow
                    key={i}
                    index={i}
                    tag={assetTags[i] || ''}
                    showQR={qrVisible[i] || false}
                    formData={formData}
                    onTagChange={handleTagChange}
                    onToggleQR={handleToggleQR}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={loading || !!descError}>
          {loading ? 'Adding…' : `Add Item${qty > 1 ? ` (${qty} units)` : ''}`}
        </Button>
      </div>
    </form>
  );
};

export default InventoryForm;