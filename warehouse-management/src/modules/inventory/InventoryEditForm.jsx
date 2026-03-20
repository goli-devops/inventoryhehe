import React, { useState } from 'react';
import { QrCode, Tag, Printer, RefreshCw, Hash } from 'lucide-react';
import Button from '../../components/common/Button';
import { useWMS } from '../../context/WMSContext';
import { useSettings } from '../../context/SettingsContext';
import QRCodeDisplay, { buildInventoryQRPayload } from '../../components/common/QRCodeDisplay';

// Normalize asset_tags from Supabase — handles array, object, JSON string, or null
const normalizeAssetTags = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') {
    try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed.filter(Boolean) : []; }
    catch { return []; }
  }
  if (typeof raw === 'object') return Object.values(raw).filter(Boolean);
  return [];
};

// Auto-generate a numeric tag
const genTag = (seed) => `${Date.now().toString().slice(-7)}${String(seed + 1).padStart(3, '0')}`;

const InventoryEditForm = ({ item, onClose, onSuccess }) => {
  const { updateInventoryItem } = useWMS();
  const { categories, units } = useSettings();

  // Normalize once at mount — not useMemo which can return stale [] on null
  const originalTags = normalizeAssetTags(item.asset_tags);

  const [formData, setFormData] = useState({
    description:   item.description || '',
    category:      item.category || '',
    quantity:      item.quantity || 0,
    unit:          item.unit || '',
    location:      item.location || '',
    minStockLevel: item.min_stock_level || item.minStockLevel || 0,
    maxStockLevel: item.max_stock_level || item.maxStockLevel || 0,
    unitPrice:     item.unit_price || item.unitPrice || 0,
    supplier:      item.supplier || '',
  });

  // Asset tags in sync with quantity
  // Build initial tag slots: fill existing tags, pad empty slots up to qty
  const initTags = () => {
    const slots = Array.from({ length: item.quantity || 0 }, (_, i) => originalTags[i] || '');
    return slots;
  };
  const [assetTags, setAssetTags] = useState(initTags);
  const [loading,   setLoading]   = useState(false);
  const [showTags,  setShowTags]  = useState(false);

  const qty = parseInt(formData.quantity) || 0;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleQuantityChange = (e) => {
    const newQty = parseInt(e.target.value) || 0;
    setFormData(prev => ({ ...prev, quantity: newQty }));
    // Sync asset tags: trim if reduced, pad with empty strings if increased
    setAssetTags(prev => {
      const updated = [...prev].slice(0, newQty);
      while (updated.length < newQty) updated.push('');
      return updated;
    });
  };

  const handleTagChange = (index, value) => {
    setAssetTags(prev => { const n = [...prev]; n[index] = value.replace(/\D/g, ''); return n; });
  };

  const autoGenerateAll = () => {
    // Only fill empty slots — don't overwrite existing tags
    setAssetTags(prev =>
      Array.from({ length: qty }, (_, i) => prev[i] || genTag(i))
    );
  };

  const buildPayload = (tag, i) => buildInventoryQRPayload(
    { item_code: item.item_code, description: formData.description, category: formData.category, location: formData.location },
    tag, i
  );

  const printQR = (tags) => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) { alert('Please allow pop-ups to print.'); return; }
    const cards = tags.map((tag, i) => `
      <div class="qr-card">
        <div id="qr_${i}"></div>
        <div class="qr-info">
          <p class="item-name">${formData.description}</p>
          <p class="tag-num">Asset Tag: <strong>${tag}</strong></p>
          <p class="unit-num">Unit ${i + 1} of ${tags.length}</p>
        </div>
      </div>`).join('');
    const scripts = tags.map((tag, i) =>
      `new QRCode(document.getElementById('qr_${i}'), { text: ${JSON.stringify(buildPayload(tag, i))}, width: 96, height: 96 });`
    ).join('\n');
    printWindow.document.write(`<!DOCTYPE html><html><head><title>QR Codes</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial;padding:16px}
.grid{display:flex;flex-wrap:wrap;gap:12px}.qr-card{display:flex;align-items:center;gap:10px;border:1px solid #ddd;border-radius:8px;padding:10px;width:260px}
.item-name{font-size:11px;font-weight:700;margin-bottom:3px}.tag-num{font-size:11px}.unit-num{font-size:10px;color:#666;margin-top:2px}</style></head>
<body><div class="grid">${cards}</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script>window.addEventListener('load',()=>{setTimeout(()=>{${scripts};setTimeout(()=>window.print(),600)},300)})</script></body></html>`);
    printWindow.document.close();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let status = 'In Stock';
      if (formData.quantity === 0) status = 'Out of Stock';
      else if (formData.quantity <= formData.minStockLevel) status = 'Low Stock';

      const result = await updateInventoryItem(item.id, {
        description:   formData.description,
        category:      formData.category,
        quantity:      formData.quantity,
        unit:          formData.unit,
        location:      formData.location,
        supplier:      formData.supplier,
        minStockLevel: formData.minStockLevel,
        maxStockLevel: formData.maxStockLevel,
        unitPrice:     formData.unitPrice,
        assetTags:     assetTags.filter(Boolean), // save trimmed tags
        status,
      });

      if (result) { onSuccess?.(result); onClose(); }
      else alert('Failed to update inventory item');
    } catch (error) {
      console.error(error);
      alert('Error updating inventory item');
    } finally {
      setLoading(false);
    }
  };

  const inp = 'w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const lbl = 'block text-sm font-medium text-gray-700 mb-2';
  const activeTags = assetTags.filter(Boolean);

  // Show reduction warning
  const tagReduction = originalTags.length > 0 && qty < originalTags.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">

        <div className="col-span-2">
          <label className={lbl}>Item Description <span className="text-red-500">*</span></label>
          <input type="text" name="description" value={formData.description}
            onChange={handleInputChange} required className={inp} />
        </div>

        <div>
          <label className={lbl}>Category <span className="text-red-500">*</span></label>
          <select name="category" value={formData.category} onChange={handleInputChange} required className={inp}>
            <option value="">Select Category</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className={lbl}>Unit <span className="text-red-500">*</span></label>
          <select name="unit" value={formData.unit} onChange={handleInputChange} required className={inp}>
            <option value="">Select Unit</option>
            {units.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        <div>
          <label className={lbl}>Quantity <span className="text-red-500">*</span></label>
          <input type="number" name="quantity" value={formData.quantity}
            onChange={handleQuantityChange} required min="0" className={inp} />
          {tagReduction && (
            <p className="text-xs text-orange-600 mt-1">
              ⚠ Reducing quantity from {originalTags.length} to {qty} — {originalTags.length - qty} asset tag{originalTags.length - qty !== 1 ? 's' : ''} will be removed.
            </p>
          )}
        </div>

        <div>
          <label className={lbl}>Unit Price</label>
          <input type="number" name="unitPrice" value={formData.unitPrice}
            onChange={handleNumberChange} min="0" step="0.01" className={inp} />
        </div>

        <div>
          <label className={lbl}>Min Stock Level</label>
          <input type="number" name="minStockLevel" value={formData.minStockLevel}
            onChange={handleNumberChange} min="0" className={inp} />
        </div>

        <div>
          <label className={lbl}>Max Stock Level</label>
          <input type="number" name="maxStockLevel" value={formData.maxStockLevel}
            onChange={handleNumberChange} min="0" className={inp} />
        </div>

        <div>
          <label className={lbl}>Storage Location</label>
          <input type="text" name="location" value={formData.location}
            onChange={handleInputChange} placeholder="e.g. Warehouse A" className={inp} />
        </div>

        <div>
          <label className={lbl}>Supplier</label>
          <input type="text" name="supplier" value={formData.supplier}
            onChange={handleInputChange} placeholder="Supplier name" className={inp} />
        </div>
      </div>

      {/* Asset Tags Panel */}
      {qty > 0 && (
        <div className="border border-blue-100 rounded-xl overflow-hidden">
          <button type="button" onClick={() => setShowTags(v => !v)}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors ${
              showTags ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-700'
            }`}>
            <div className="flex items-center gap-2">
              <QrCode size={16} />
              <span>Asset Tags &amp; QR Codes</span>
              <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {qty} unit{qty !== 1 ? 's' : ''}
              </span>
              {activeTags.length > 0 && (
                <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {activeTags.length} tagged
                </span>
              )}
            </div>
            <span className="text-xs">{showTags ? '▲' : '▼'}</span>
          </button>

          {showTags && (
            <div className="p-4 space-y-3 border-t border-blue-100 bg-white">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Optional — manage asset tags per unit. Items without tags deploy as N/A in Asset Tracking. Reducing quantity removes the last tag(s).</p>
                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  {activeTags.filter(t => t && t !== 'N/A').length > 0 && (
                    <button type="button" onClick={() => printQR(activeTags.filter(t => t && t !== 'N/A'))}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-900 text-white text-xs font-medium rounded-lg hover:bg-blue-800 transition-colors">
                      <Printer size={12} /> Print All QR
                    </button>
                  )}
                  <button type="button" onClick={autoGenerateAll}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors">
                    <RefreshCw size={12} /> Auto-tag All
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {Array.from({ length: qty }, (_, i) => {
                  const tag = assetTags[i] || '';
                  const isRemoved = i >= qty && i < originalTags.length;
                  return (
                    <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                      isRemoved ? 'bg-red-50 border-red-200 opacity-50' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <span className="text-xs font-semibold text-gray-400 w-14 flex-shrink-0">Unit {i + 1}</span>
                      <div className="relative flex-1">
                        <Hash size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" inputMode="numeric" value={tag}
                          onChange={e => handleTagChange(i, e.target.value)}
                          placeholder="Numeric tag"
                          className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <button type="button" onClick={() => handleTagChange(i, genTag(i))}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0">
                        <RefreshCw size={13} />
                      </button>
                      {tag && tag !== 'N/A' && (
                        <div className="flex-shrink-0">
                          <QRCodeDisplay value={buildPayload(tag, i)} size={48} />
                        </div>
                      )}
                      {tag && tag !== 'N/A' && (
                        <button type="button" onClick={() => printQR([tag])}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0" title="Print this QR">
                          <Printer size={13} />
                        </button>
                      )}
                      {(!tag || tag === 'N/A') && (
                        <span className="text-xs text-gray-400 flex-shrink-0 px-1">N/A</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Updating…' : 'Update Item'}
        </Button>
      </div>
    </form>
  );
};

export default InventoryEditForm;