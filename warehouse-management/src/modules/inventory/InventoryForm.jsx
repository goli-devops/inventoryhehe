import React, { useState, useRef } from 'react';
import { Hash, QrCode, RefreshCw, ChevronDown, ChevronUp, Printer, Barcode } from 'lucide-react';
import Button from '../../components/common/Button';
import { useWMS } from '../../context/WMSContext';
import { useSettings } from '../../context/SettingsContext';
import QRCodeDisplay, { buildInventoryQRPayload } from '../../components/common/QrCodeDisplay';

// ── Shared QR print — GOLI style ──────────────────────────────────────────────
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

// ── Auto-generate a numeric asset tag ─────────────────────────────────────────
// Generate a unique 5-digit tag (random, not timestamp-based)
const genUniqueTag = () => {
  return String(Math.floor(10000 + Math.random() * 90000));
};

// Given a starting numeric tag and an offset, return sequential tag
// e.g. startTag="1001", offset=2 → "1003"
const getSequentialTag = (startTag, offset) => {
  const n = parseInt(startTag, 10);
  if (isNaN(n)) return genUniqueTag();
  return String(n + offset);
};

// ── Single asset tag row with serial number ───────────────────────────────────
const AssetTagRow = ({ index, tag, serialNumber, showQR, formData, tagError, serialError, onTagChange, onSerialChange, onToggleQR }) => {
  // Prevent Enter key from submitting the form when scanning barcodes into serial field
  const preventEnterSubmit = (e) => {
    if (e.key === 'Enter') e.preventDefault();
  };

  return (
    <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
      {/* Row 1: Unit label + Asset Tag input + auto-gen + QR toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-400 w-12 flex-shrink-0">Unit {index + 1}</span>
        <div className="relative flex-1">
          <Hash size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={tag}
            onChange={e => onTagChange(index, e.target.value.replace(/\D/g, ''))}
            onKeyDown={preventEnterSubmit}
            placeholder="Asset tag"
            inputMode="numeric"
            className="w-full pl-7 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button type="button" onClick={() => onTagChange(index, genUniqueTag())}
          title="Auto-generate tag"
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0">
          <RefreshCw size={13} />
        </button>
        {tag ? (
          <button type="button" onClick={() => onToggleQR(index)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
              showQR ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
            }`}>
            <QrCode size={12} /> {showQR ? 'Hide' : 'QR'}
          </button>
        ) : (
          <span className="text-xs text-gray-300 px-2 flex-shrink-0">No tag</span>
        )}
      </div>
      {tagError && (
        <div className="flex items-center gap-1.5 ml-14 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
          <span className="font-medium">⚠</span> {tagError}
        </div>
      )}

      {/* Row 2: Serial Number — barcode scanner friendly */}
      <div className="flex items-center gap-2 pl-14">
        <Barcode size={13} className="text-gray-400 flex-shrink-0" />
        <input
          type="text"
          value={serialNumber}
          onChange={e => onSerialChange(index, e.target.value)}
          onKeyDown={preventEnterSubmit}
          placeholder="Serial number (scan or type)"
          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>
      {serialError && (
        <div className="flex items-center gap-1.5 ml-14 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
          <span className="font-medium">⚠</span> {serialError}
        </div>
      )}

      {/* QR preview */}
      {showQR && tag && (
        <div className="flex items-center gap-4 pl-14 pt-1">
          <QRCodeDisplay value={buildInventoryQRPayload(formData, tag, index, serialNumber)} label={tag} size={80} />
          <div className="text-xs text-gray-500 space-y-1">
            <p className="font-mono font-bold text-gray-700">{tag}</p>
            {serialNumber && <p className="text-gray-500">SN: {serialNumber}</p>}
            <p className="text-gray-400">Unit {index + 1} of {formData.quantity}</p>
          </div>
        </div>
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

  const [assetTags,     setAssetTags]     = useState([]);
  const [serialNumbers, setSerialNumbers] = useState([]);
  const [qrVisible,     setQrVisible]     = useState([]);
  const [tagErrors,     setTagErrors]     = useState([]); // per-unit duplicate errors
  const [serialErrors,  setSerialErrors]  = useState([]); // per-unit duplicate serial errors
  const [showTagPanel,  setShowTagPanel]  = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [descError,     setDescError]     = useState('');

  const qty = parseInt(formData.quantity) || 0;

  // Build flat set of ALL existing serial numbers across all inventory items
  const existingSerialSet = React.useMemo(() => {
    const set = new Set();
    (inventory || []).forEach(item => {
      let serials = item.serial_numbers;
      if (!serials) return;
      if (typeof serials === 'string') { try { serials = JSON.parse(serials); } catch { return; } }
      if (Array.isArray(serials)) serials.forEach(s => s && set.add(String(s).trim()));
    });
    return set;
  }, [inventory]);

  // Build flat set of ALL existing asset tags across all inventory items
  const existingTagSet = React.useMemo(() => {
    const set = new Set();
    (inventory || []).forEach(item => {
      let tags = item.asset_tags;
      if (!tags) return;
      if (typeof tags === 'string') { try { tags = JSON.parse(tags); } catch { return; } }
      if (Array.isArray(tags)) tags.forEach(t => t && set.add(String(t).trim()));
      else if (typeof tags === 'object') Object.values(tags).forEach(t => t && set.add(String(t).trim()));
      // Also check item_code as a tag
      if (item.item_code && item.item_code !== 'N/A') set.add(item.item_code.trim());
    });
    return set;
  }, [inventory]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const handleQuantityChange = (e) => {
    const newQty = parseInt(e.target.value) || 0;
    setFormData(prev => ({ ...prev, quantity: e.target.value }));
    setAssetTags(prev => { const u = [...prev]; while (u.length < newQty) u.push(''); return u.slice(0, newQty); });
    setSerialNumbers(prev => { const u = [...prev]; while (u.length < newQty) u.push(''); return u.slice(0, newQty); });
    setQrVisible(prev => { const u = [...prev]; while (u.length < newQty) u.push(false); return u.slice(0, newQty); });
  };

  const handleTagChange = (i, v) => {
    setAssetTags(prev => { const n = [...prev]; n[i] = v; return n; });
    // Check if this tag already exists in inventory or is a duplicate within current form
    setTagErrors(prev => {
      const n = [...prev];
      const trimmed = v.trim();
      if (!trimmed) { n[i] = ''; return n; }
      if (existingTagSet.has(trimmed)) {
        n[i] = `Asset tag "${trimmed}" already exists in inventory.`;
      } else {
        // Check for duplicates within current form
        const isDupInForm = assetTags.some((t, idx) => idx !== i && t.trim() === trimmed);
        if (isDupInForm) {
          n[i] = `Asset tag "${trimmed}" is duplicated in this form.`;
        } else {
          n[i] = '';
        }
      }
      return n;
    });
  };
  const handleSerialChange = (i, v) => {
    setSerialNumbers(prev => { const n = [...prev]; n[i] = v; return n; });
    // Check if this serial already exists in inventory or is a duplicate within current form
    setSerialErrors(prev => {
      const n = [...prev];
      const trimmed = v.trim();
      if (!trimmed) { n[i] = ''; return n; }
      if (existingSerialSet.has(trimmed)) {
        n[i] = `Serial number "${trimmed}" already exists in inventory.`;
      } else {
        // Check for duplicates within current form
        const isDupInForm = serialNumbers.some((sn, idx) => idx !== i && sn.trim() === trimmed);
        if (isDupInForm) {
          n[i] = `Serial number "${trimmed}" is duplicated in this form.`;
        } else {
          n[i] = '';
        }
      }
      return n;
    });
  };
  const handleToggleQR     = (i)    => setQrVisible(prev => { const n = [...prev]; n[i] = !n[i]; return n; });
  // Check for within-form duplicate tags after auto-generate
  const validateAllTags = (tags) => {
    const seen = new Set();
    return tags.map((tag, i) => {
      const trimmed = tag?.trim() || '';
      if (!trimmed) return '';
      if (existingTagSet.has(trimmed)) return `Asset tag "${trimmed}" already exists in inventory.`;
      if (seen.has(trimmed)) return `Asset tag "${trimmed}" is duplicated in this form.`;
      seen.add(trimmed);
      return '';
    });
  };

  const autoGenerateAllTags = () => {
    const unit1Tag = assetTags[0]?.trim();
    const newTags = Array.from({ length: qty }, (_, i) => {
      if (unit1Tag && !isNaN(parseInt(unit1Tag, 10))) {
        return getSequentialTag(unit1Tag, i);
      }
      return genUniqueTag();
    });
    setAssetTags(newTags);
    setTagErrors(validateAllTags(newTags));
  };

  // Prevent barcode scanner Enter from submitting the outer form
  const handleFormKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'submit') {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (descError) return;
    if (tagErrors.some(Boolean)) { alert('Please fix the duplicate asset tag errors before saving.'); return; }
    if (serialErrors.some(Boolean)) { alert('Please fix the duplicate serial number errors before saving.'); return; }
    const dup = (inventory || []).find(
      i => i.description?.toLowerCase().trim() === formData.description.toLowerCase().trim()
    );
    if (dup) { setDescError(`An item with this description already exists: "${dup.description}"`); return; }

    setLoading(true);
    try {
      const result = await createInventoryItem({
        ...formData,
        assetTags:     assetTags.filter(Boolean),
        serialNumbers: serialNumbers,
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
              <p className="text-sm font-semibold text-gray-800">Adding Inventory Item</p>
              <p className="text-xs text-gray-400 mt-1">Please wait…</p>
            </div>
          </div>
        </div>
      )}

    <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-5">
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
            required placeholder="Enter item description" className={`${inputCls} ${descError ? 'border-red-400 focus:ring-red-400' : ''}`} />
          {descError && <p className="text-xs text-red-500 mt-1">{descError}</p>}
        </div>

        {/* Quantity */}
        <div>
          <label className={labelCls}>Initial Quantity <span className="text-red-500">*</span></label>
          <input type="number" name="quantity" value={formData.quantity} onChange={handleQuantityChange}
            required min="0" className={inputCls} />
        </div>

        {/* Unit */}
        <div>
          <label className={labelCls}>Unit <span className="text-red-500">*</span></label>
          <select name="unit" value={formData.unit} onChange={handleInputChange} required className={inputCls}>
            <option value="" disabled>— Select unit —</option>
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

      {/* Asset Tags & Serial Numbers panel */}
      {qty > 0 && (
        <div className="border border-blue-100 rounded-xl overflow-hidden">
          <button type="button" onClick={() => setShowTagPanel(v => !v)}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors ${
              showTagPanel ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-700'
            }`}>
            <div className="flex items-center gap-2">
              <QrCode size={16} />
              <span>Asset Tags &amp; QR Codes <span className="text-xs font-normal text-gray-400">(optional)</span></span>
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
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs text-gray-500">
                  Optional — assign a unique numeric asset tag per unit to generate QR codes.
                  Serial numbers can be typed or scanned using a barcode scanner.
                  Items without tags will show as N/A in Asset Tracking.
                </p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button type="button"
                    onClick={() => goliPrintQR(assetTags.filter(Boolean), (tag, i) => buildInventoryQRPayload(formData, tag, i, serialNumbers[assetTags.indexOf(tag)]), formData.description || 'Asset Tags')}
                    disabled={!assetTags.some(Boolean)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white text-xs font-medium rounded-lg hover:bg-green-800 disabled:opacity-40 transition-colors">
                    <Printer size={12} /> Print Asset Tags
                  </button>
                  <button type="button" onClick={autoGenerateAllTags}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 text-white text-xs font-medium rounded-lg hover:bg-blue-800 transition-colors">
                    <RefreshCw size={12} /> Auto-tag All
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {Array.from({ length: qty }, (_, i) => (
                  <AssetTagRow
                    key={i}
                    index={i}
                    tag={assetTags[i] || ''}
                    serialNumber={serialNumbers[i] || ''}
                    showQR={qrVisible[i] || false}
                    formData={formData}
                    tagError={tagErrors[i] || ''}
                    serialError={serialErrors[i] || ''}
                    onTagChange={handleTagChange}
                    onSerialChange={handleSerialChange}
                    onToggleQR={handleToggleQR}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {(tagErrors.some(Boolean) || serialErrors.some(Boolean)) && (
        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl">
          <span className="text-red-500 text-base leading-none mt-0.5">⚠</span>
          <div>
            <p className="text-sm font-semibold text-red-700">Cannot save — duplicate entries detected</p>
            <ul className="mt-1 space-y-0.5">
              {tagErrors.map((err, i) => err ? (
                <li key={`tag-${i}`} className="text-xs text-red-600">• Unit {i + 1}: {err}</li>
              ) : null)}
              {serialErrors.map((err, i) => err ? (
                <li key={`serial-${i}`} className="text-xs text-red-600">• Unit {i + 1}: {err}</li>
              ) : null)}
            </ul>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={loading || !!descError || tagErrors.some(Boolean) || serialErrors.some(Boolean)}>
          {loading ? 'Adding…' : `Add Item${qty > 1 ? ` (${qty} units)` : ''}`}
        </Button>
      </div>
    </form>
    </>
  );
};

export default InventoryForm;
