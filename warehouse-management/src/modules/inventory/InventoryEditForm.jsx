import React, { useState } from 'react';
import { QrCode, Tag, Printer, RefreshCw, Hash } from 'lucide-react';
import Button from '../../components/common/Button';
import { useWMS } from '../../context/WMSContext';
import { useSettings } from '../../context/SettingsContext';
import QRCodeDisplay, { buildInventoryQRPayload } from '../../components/common/QRCodeDisplay';

// ── Shared QR print — GOLI style: QR left + logo right + asset tag below ──────
const goliPrintQR = (tags, payloadBuilder, title = 'QR Codes') => {
  const validTags = tags.filter(Boolean);
  if (validTags.length === 0) { alert('No asset tags to print.'); return; }
  const printWindow = window.open('', '_blank', 'width=800,height=700');
  if (!printWindow) { alert('Please allow pop-ups to print.'); return; }
  const QR_SIZE = 96;
  const cards = validTags.map((tag, i) => `
    <div class="qr-card">
      <div class="qr-top">
        <div class="qr-box"><div id="qr_${i}"></div></div>
        <div class="logo-box">
          <img src="${window.location.origin}/goli_logo.jpg" alt="GOLI" onerror="this.style.display='none';this.nextSibling.style.display='flex';" />
          <div class="logo-fb">GOLI<br/>ICT</div>
        </div>
      </div>
      <div class="asset-tag">${tag}</div>
    </div>`).join('');
  const scripts = validTags.map((tag, i) =>
    'new QRCode(document.getElementById(\'qr_' + i + '\'),{text:' + JSON.stringify(payloadBuilder(tag, i)) + ',width:' + QR_SIZE + ',height:' + QR_SIZE + ',correctLevel:QRCode.CorrectLevel.M});'
  ).join('\n');
  const W = QR_SIZE * 2 + 36;
  printWindow.document.write('<!DOCTYPE html><html><head><title>' + title + '</title><style>'
    + '*{margin:0;padding:0;box-sizing:border-box}'
    + 'body{background:#f0f0f0;padding:16px;font-family:Arial,sans-serif}'
    + '.page{display:flex;flex-wrap:wrap;gap:14px}'
    + '.qr-card{display:flex;flex-direction:column;align-items:center;background:#fff;border:1.5px solid #e5e7eb;border-radius:12px;padding:12px 12px 10px;width:' + W + 'px;gap:8px;page-break-inside:avoid}'
    + '.qr-top{display:flex;align-items:center;justify-content:space-between;width:100%;gap:8px}'
    + '.qr-box{background:#fff;border-radius:6px;padding:5px;display:flex;align-items:center;justify-content:center;flex-shrink:0}'
    + '.qr-box canvas,.qr-box img{display:block}'
    + '.logo-box{flex:1;display:flex;align-items:center;justify-content:center}'
    + '.logo-box img{max-width:64px;max-height:48px;object-fit:contain}'
    + '.logo-fb{display:none;color:#1e3a8a;font-size:11px;font-weight:900;letter-spacing:2px;text-align:center;line-height:1.3}'
    + '.asset-tag{color:#1e3a8a;font-family:monospace;font-size:13px;font-weight:700;letter-spacing:.06em;text-align:center;word-break:break-all;width:100%}'
    + '@media print{body{background:#fff;padding:6px}.page{gap:10px}}'
    + '</style></head><body>'
    + '<div class="page">' + cards + '</div>'
    + '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>'
    + '<script>window.addEventListener(\'load\',()=>{setTimeout(()=>{' + scripts + ';setTimeout(()=>window.print(),700)},300)});<\/script>'
    + '</body></html>');
  printWindow.document.close();
};


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
  const [assetTags,     setAssetTags]     = useState(initTags);
  const [serialNumbers, setSerialNumbers] = useState(() => {
    const sns = item.serial_numbers || item.serialNumbers || [];
    const arr = Array.isArray(sns) ? sns : (typeof sns === 'string' ? (() => { try { return JSON.parse(sns); } catch { return []; } })() : []);
    return Array.from({ length: item.quantity || 0 }, (_, i) => arr[i] || '');
  });
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
    tag, i, serialNumbers[i] || ''
  );

  const printQR = (tags) => {
    goliPrintQR(
      tags.filter(Boolean),
      (tag, i) => buildPayload(tag, i),
      formData.description || 'Asset Tags'
    );
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
        assetTags:     assetTags.filter(Boolean),
        serialNumbers: serialNumbers,
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
    <>
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-4 min-w-64">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-700 animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800">Updating Inventory Item</p>
              <p className="text-xs text-gray-400 mt-1">Please wait…</p>
            </div>
          </div>
        </div>
      )}

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
                    <div key={i} className={`p-2.5 rounded-xl border space-y-2 ${
                      isRemoved ? 'bg-red-50 border-red-200 opacity-50' : 'bg-gray-50 border-gray-200'
                    }`}>
                      {/* Asset tag row */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-400 w-14 flex-shrink-0">Unit {i + 1}</span>
                        <div className="relative flex-1">
                          <Hash size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input type="text" inputMode="numeric" value={tag}
                            onChange={e => handleTagChange(i, e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                            placeholder="Numeric tag"
                            className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <button type="button" onClick={() => handleTagChange(i, genTag(i))}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0">
                          <RefreshCw size={13} />
                        </button>
                        {tag && tag !== 'N/A' && (
                          <div className="flex-shrink-0">
                            <QRCodeDisplay value={buildPayload(tag, i)} label={tag} size={48} />
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
                      {/* Serial number */}
                      <div className="flex items-center gap-2 pl-16">
                        <input type="text"
                          value={serialNumbers[i] || ''}
                          onChange={e => setSerialNumbers(prev => { const n=[...prev]; n[i]=e.target.value; return n; })}
                          onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                          placeholder="Serial number (scan or type)"
                          className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                      </div>
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
    </>
  );
};

export default InventoryEditForm;