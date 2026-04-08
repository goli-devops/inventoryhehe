import React, { useState } from 'react';
import {
  Package, MapPin, Banknote, User, Hash,
  Clock, ArrowRight, Edit3, PlusCircle, CheckCircle, QrCode, Tag, Printer
} from 'lucide-react';
import QRCodeDisplay, { buildInventoryQRPayload, QRPreviewModal } from '../../components/common/QRCodeDisplay';

const STATUS_STYLES = {
  'In Stock':     'bg-green-100 text-green-700',
  'Low Stock':    'bg-orange-100 text-orange-700',
  'Out of Stock': 'bg-red-100 text-red-700',
};

const StatusBadge = ({ status }) => (
  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'}`}>
    {status || '—'}
  </span>
);

const InfoRow = ({ icon: Icon, label, value }) => {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-2">
      <Icon size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value}</p>
      </div>
    </div>
  );
};

// Match PR Details entryMeta exactly
const entryMeta = (entry) => {
  if (entry.action === 'Created')                   return { icon: PlusCircle,  color: 'text-green-500',  bg: 'bg-green-50 border-green-200'   };
  if (entry.action?.includes('Deployed'))           return { icon: Tag,         color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' };
  if (entry.action?.includes('Returned'))           return { icon: Tag,         color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200'     };
  if (entry.field  === 'Status')                    return { icon: CheckCircle, color: 'text-blue-500',   bg: 'bg-blue-50 border-blue-200'     };
  return                                                   { icon: Edit3,        color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200' };
};

const HISTORY_PAGE_SIZE = 5;


// ── P900W 24mm tape print — optimized for Brother label printer ──────
const goliPrintQR = (tags, payloadBuilder, title = 'Asset Labels') => {
  const validTags = tags.filter(Boolean);
  if (validTags.length === 0) { alert('No asset tags to print.'); return; }
  const printWindow = window.open('', '_blank', 'width=800,height=700');
  if (!printWindow) { alert('Please allow pop-ups to print.'); return; }
  const QR_SIZE = 80; // 21mm in pixels at 96dpi
  const cards = validTags.map((tag, i) => `
    <div class="label">
      <div class="qr-box"><div id="qr_${i}"></div></div>
      <div class="info">
        <img class="logo" src="/goli_logo.jpg" alt="GOLI" onerror="this.style.display='none'" />
        <div class="asset-tag">${tag}</div>
      </div>
    </div>`).join('');
  const scripts = validTags.map((tag, i) =>
    'new QRCode(document.getElementById(\'qr_' + i + '\'),{text:' + JSON.stringify(payloadBuilder(tag, i)) + ',width:' + QR_SIZE + ',height:' + QR_SIZE + ',correctLevel:QRCode.CorrectLevel.M});'
  ).join('\n');
  printWindow.document.write('<!DOCTYPE html><html><head><title>' + title + '</title><style>'
    + '@page{size:62mm 24mm;margin:0}'
    + '*{margin:0;padding:0;box-sizing:border-box}'
    + 'body{background:#f0f0f0;padding:16px;font-family:Arial,sans-serif}'
    + '.page{display:flex;flex-direction:column;gap:12px}'
    + '.label{width:62mm;height:24mm;display:flex;align-items:center;padding:1.5mm;border:1px solid #000;background:#fff;page-break-after:always}'
    + '.qr-box{flex-shrink:0;width:21mm;height:21mm;margin-right:1.5mm;display:flex;align-items:center;justify-content:center}'
    + '.qr-box canvas,.qr-box img{display:block}'
    + '.info{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center}'
    + '.logo{max-width:18mm;max-height:8mm;object-fit:contain;margin-bottom:0.5mm}'
    + '.brand{font-size:5pt;font-weight:bold;color:#000;letter-spacing:0.3pt;margin-bottom:0.5mm}'
    + '.asset-tag{font-size:8pt;font-weight:bold;color:#000;font-family:monospace;letter-spacing:0.05em;word-break:break-all;text-align:center}'
    + '@media print{body{background:#fff;padding:0}.label{border:none}}'
    + '</style></head><body>'
    + '<div class="page">' + cards + '</div>'
    + '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>'
    + '<script>window.addEventListener(\'load\',()=>{setTimeout(()=>{' + scripts + ';setTimeout(()=>window.print(),700)},300)});<\/script>'
    + '</body></html>');
  printWindow.document.close();
};


const InventoryDetails = ({ item }) => {
  const [tab,         setTab]         = useState('details');
  const [historyPage, setHistoryPage] = useState(1);
  const [showAllTags, setShowAllTags] = useState(false);
  const [previewQR,   setPreviewQR]   = useState(null); // { text, label }

  if (!item) return null;

  const totalValue = (item.quantity ?? 0) * (parseFloat(item.unit_price || item.unitPrice) || 0);
  const history    = [...(item.history || [])].reverse();
  // Normalize asset_tags — handles array, JSON string, object, or null from Supabase JSONB
  const assetTags = (() => {
    const raw = item.asset_tags;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === 'string') {
      try { const p = JSON.parse(raw); return Array.isArray(p) ? p.filter(Boolean) : []; }
      catch { return raw.trim() ? [raw] : []; }
    }
    if (typeof raw === 'object') return Object.values(raw).filter(Boolean);
    return [];
  })();
  const totalPages = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
  const pagedHistory = history.slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* QR Preview Modal */}
      {previewQR && (
        <QRPreviewModal
          text={previewQR.text}
          label={previewQR.label}
          onClose={() => setPreviewQR(null)}
        />
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {['details', 'history'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t}
            {t === 'history' && history.length > 0 && (
              <span className="ml-1.5 bg-gray-100 text-gray-600 text-xs rounded-full px-1.5 py-0.5">
                {history.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Details Tab ── */}
      {tab === 'details' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <StatusBadge status={item.status} />
            <div className="flex items-center gap-2">
              {assetTags.length > 0 && (
                <button
                  onClick={() => setShowAllTags(v => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                    showAllTags
                      ? 'bg-blue-900 text-white border-blue-900'
                      : 'border-gray-300 text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
                  }`}
                >
                  <QrCode size={12} />
                  {showAllTags ? 'Hide Asset Tags' : `View Asset Tags (${assetTags.length})`}
                </button>
              )}
              <span className="text-xs text-gray-400">
                {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
              </span>
            </div>
          </div>

          {/* Asset Tags expandable panel */}
          {showAllTags && assetTags.length > 0 && (
            <div className="border border-blue-100 rounded-xl p-4 bg-blue-50 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                  <Tag size={15} /> Asset Tags — {assetTags.length} unit{assetTags.length !== 1 ? 's' : ''}
                </p>
                <button
                  onClick={() => goliPrintQR(assetTags, (tag, i) => buildInventoryQRPayload(item, tag, i), item.description)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 text-white text-xs font-medium rounded-lg hover:bg-blue-800 transition-colors"
                >
                  <Printer size={12} /> Print All QR Codes
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {assetTags.map((tag, i) => {
                  const sns = (() => {
                    const raw = item.serial_numbers || item.serialNumbers || [];
                    if (Array.isArray(raw)) return raw;
                    if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return []; } }
                    return [];
                  })();
                  const payload = buildInventoryQRPayload(item, tag, i, sns[i] || '');
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white border border-blue-100 rounded-xl hover:border-blue-300 transition-colors">
                      <div className="flex-shrink-0">
                        <QRCodeDisplay value={payload} size={72} />
                      </div>
                      <div className="text-xs min-w-0">
                        <p className="font-mono font-bold text-gray-800 truncate">{tag}</p>
                        <p className="text-gray-500 mt-0.5">Unit {i + 1} of {assetTags.length}</p>
                        <button
                          onClick={() => goliPrintQR([tag], (t, i) => buildInventoryQRPayload(item, t, i), item.description)}
                          className="mt-1.5 flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                        >
                          <Printer size={10} /> Print this QR
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <InfoRow icon={Hash}    label="Asset Tag"   value={item.item_code === 'N/A' || !item.item_code ? 'N/A (no tag)' : (item.item_code || item.itemCode)} />
            <InfoRow icon={Package} label="Category"    value={item.category} />
            <InfoRow icon={User}    label="Created By"  value={item.created_by} />
            <InfoRow icon={User}    label="Supplier"    value={item.supplier} />
            <InfoRow icon={MapPin}  label="Location"    value={item.location} />
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">Description</p>
            <p className="text-sm font-medium text-gray-800">{item.description}</p>
          </div>

          {/* Stock levels */}
          <div className="grid grid-cols-3 gap-3">
            <div className={`p-4 rounded-xl text-center border ${STATUS_STYLES[item.status] ? 'border-current' : 'border-gray-200'} ${STATUS_STYLES[item.status] || 'bg-gray-50'}`}>
              <p className="text-xs font-medium mb-1 opacity-70">Current Stock</p>
              <p className="text-2xl font-bold">{item.quantity ?? 0}</p>
              <p className="text-xs mt-1 opacity-60">{item.unit}</p>
            </div>
            <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-center">
              <p className="text-xs font-medium text-orange-700 mb-1">Min Level</p>
              <p className="text-2xl font-bold text-orange-600">{item.min_stock_level ?? item.minStockLevel ?? 0}</p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-center">
              <p className="text-xs font-medium text-blue-700 mb-1">Max Level</p>
              <p className="text-2xl font-bold text-blue-600">{item.max_stock_level ?? item.maxStockLevel ?? 0}</p>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <InfoRow icon={Banknote} label="Unit Price"
              value={`₱${parseFloat(item.unit_price || item.unitPrice || 0).toFixed(2)}`} />
            <InfoRow icon={Banknote} label="Total Value"
              value={`₱${totalValue.toFixed(2)}`} />
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div>
          {history.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Clock size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No history yet</p>
            </div>
          ) : (
            <>
              <div className="relative">
                <div className="absolute left-[18px] top-0 bottom-0 w-px bg-gray-200" />
                <div className="space-y-3">
                  {pagedHistory.map((entry, i) => {
                    const { icon: Icon, color, bg } = entryMeta(entry);
                    return (
                      <div key={i} className="flex gap-3 relative">
                        <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 bg-white z-10 ${bg}`}>
                          <Icon size={15} className={color} />
                        </div>
                        <div className={`flex-1 rounded-xl border p-3 text-sm ${bg}`}>
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              {entry.action === 'Created' ? (
                                <p className="font-semibold text-gray-800">{entry.details || 'Inventory item created'}</p>
                              ) : entry.assetTags?.length > 0 ? (
                                <div>
                                  <p className="font-semibold text-gray-800 mb-1">
                                    {entry.action} — Qty: {Math.abs(entry.adjustment || 0)}
                                    <span className="ml-2 text-xs font-normal text-gray-500">
                                      {entry.previousQuantity} → {entry.newQuantity}
                                    </span>
                                  </p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    <span className="text-xs text-gray-500">Asset Tags used:</span>
                                    {entry.assetTags.map((tag, ti) => (
                                      <span key={ti} className="px-1.5 py-0.5 bg-white border border-purple-200 rounded text-xs font-mono font-semibold text-purple-700">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : entry.adjustment !== undefined ? (
                                <p className="font-semibold text-gray-800">
                                  {entry.action}
                                  <span className="ml-2 text-xs font-normal text-gray-500">
                                    Qty: {entry.previousQuantity} → {entry.newQuantity}
                                  </span>
                                </p>
                              ) : entry.from !== undefined && entry.to !== undefined ? (
                                <div>
                                  <p className="font-semibold text-gray-800 mb-1">
                                    {entry.field} updated
                                  </p>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs text-gray-600 font-mono">
                                      {entry.from || '(empty)'}
                                    </span>
                                    <ArrowRight size={12} className="text-gray-400 flex-shrink-0" />
                                    <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${
                                      entry.field === 'Status'
                                        ? STATUS_STYLES[entry.to] || 'bg-gray-100 text-gray-700'
                                        : 'bg-white border border-blue-300 text-blue-700'
                                    }`}>
                                      {entry.to || '(empty)'}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <p className="font-medium text-gray-700">{entry.details || entry.action}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <User size={11} />
                            <span className="font-medium text-gray-600">{entry.user || 'System'}</span>
                            <span>·</span>
                            <Clock size={11} />
                            <span>{new Date(entry.date).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-500">
                    {(historyPage - 1) * HISTORY_PAGE_SIZE + 1}&#8211;{Math.min(historyPage * HISTORY_PAGE_SIZE, history.length)} of {history.length} entries
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1}
                      className="px-2.5 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40">&laquo; Prev</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button key={p} onClick={() => setHistoryPage(p)}
                        className={`w-7 h-7 text-xs rounded border transition-colors ${p === historyPage ? 'bg-blue-900 text-white border-blue-900' : 'border-gray-300 hover:bg-gray-50'}`}>
                        {p}
                      </button>
                    ))}
                    <button onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))} disabled={historyPage === totalPages}
                      className="px-2.5 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40">Next &raquo;</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryDetails;