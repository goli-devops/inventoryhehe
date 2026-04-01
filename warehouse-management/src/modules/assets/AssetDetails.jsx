import React, { useState } from 'react';
import {
  Hash, Tag, MapPin, User, Shield, Clock,
  ArrowRight, Edit3, PlusCircle, CheckCircle, XCircle,
  QrCode, Printer, FileText
} from 'lucide-react';
import QRCodeDisplay, { QRPreviewModal, buildAssetQRPayload } from '../../components/common/QRCodeDisplay';
import QRModal from '../../components/common/QRModal';


const loadScript = (src) => new Promise((res, rej) => {
  if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
  const s = document.createElement('script');
  s.src = src; s.onload = res; s.onerror = rej;
  document.head.appendChild(s);
});

const loadScriptDet = (src) => new Promise((res, rej) => {
  if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
  const s = document.createElement('script');
  s.src = src; s.onload = res; s.onerror = rej;
  document.head.appendChild(s);
});

const getLogoDet = () => new Promise((resolve) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width; canvas.height = img.height;
    canvas.getContext('2d').drawImage(img, 0, 0);
    resolve(canvas.toDataURL('image/png'));
  };
  img.onerror = () => resolve(null);
  img.src = '/goli_logo.jpg';
});

const reprintAccountability = async (asset) => {
  await loadScriptDet('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await loadScriptDet('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 14;
  const today = new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });

  const logoData = await getLogoDet();
  if (logoData) doc.addImage(logoData, 'PNG', M, 8, 28, 14);

  let y = 14;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text('ICT DEPARTMENT', W / 2, y, { align: 'center' }); y += 7;
  doc.setFontSize(12);
  doc.text('ACCOUNTABILITY FORM', W / 2, y, { align: 'center' }); y += 4;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text('N\u00ba', W - 38, 12);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(200, 0, 0); doc.setFontSize(13);
  doc.text(String(asset.accountability_seq || ''), W - 32, 12);
  doc.setTextColor(0, 0, 0);

  y += 4;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('Dept.:', M, y); doc.setFont('helvetica', 'normal');
  doc.line(M + 12, y + 0.5, 110, y + 0.5);
  doc.text(asset.jor_number || '', M + 13, y - 0.5);
  y += 7;
  doc.setFont('helvetica', 'bold'); doc.text('Name:', M, y); doc.setFont('helvetica', 'normal');
  doc.line(M + 12, y + 0.5, 120, y + 0.5);
  doc.text(asset.assigned_to || '', M + 13, y - 0.5);
  doc.setFont('helvetica', 'bold'); doc.text('Position:', 122, y); doc.setFont('helvetica', 'normal');
  doc.line(134, y + 0.5, W - M, y + 0.5);
  y += 7;
  doc.setFont('helvetica', 'bold'); doc.text('Date:', M, y); doc.setFont('helvetica', 'normal');
  doc.line(M + 11, y + 0.5, 80, y + 0.5); doc.text(today, M + 12, y - 0.5);
  y += 6;

  const tableRows = [[today, asset.inventory_asset_tag?.trim() || 'N/A', asset.description || '', '1']];
  while (tableRows.length < 10) tableRows.push(['', '', '', '']);

  doc.autoTable({
    startY: y,
    head: [['DATE', 'ASSET TAG', 'PARTICULARS', 'QTY.']],
    body: tableRows,
    styles: { fontSize: 8, cellPadding: 2.5, lineColor: [0,0,0], lineWidth: 0.25, valign: 'middle' },
    headStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontStyle: 'bold', lineWidth: 0.3, lineColor: [0,0,0], halign: 'center', valign: 'middle', minCellHeight: 10 },
    bodyStyles: { minCellHeight: 9, lineWidth: 0.2, lineColor: [0,0,0] },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 116 },
      3: { cellWidth: 14, halign: 'center' },
    },
    tableLineColor: [0,0,0], tableLineWidth: 0.3, margin: { left: M, right: M },
  });

  const fy = doc.lastAutoTable.finalY + 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text('I hold myself responsible for the use and safekeeping of the above item and return the same when required by\nthis company or pay for them in case of loss.', M, fy, { maxWidth: W - M * 2 });

  const sigY = fy + 18;
  [
    { x: M,   label: 'APPROVED BY:',         copy: 'Original - Accounting' },
    { x: 83,  label: 'ISSUED BY:',            copy: 'Duplicate - Audit' },
    { x: 150, label: 'SIGNATURE OF EMPLOYEE', copy: 'Triplicate - Personal File' },
  ].forEach(col => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text(col.label, col.x, sigY);
    doc.setFont('helvetica', 'normal'); doc.line(col.x, sigY + 12, col.x + 50, sigY + 12);
    doc.setFontSize(7); doc.text(col.copy, col.x, sigY + 16);
  });

  doc.save(`Accountability_${asset.po_number || asset.asset_id || 'form'}.pdf`);
};

const reprintTransmittal = async (asset) => {
  await loadScriptDet('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await loadScriptDet('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 20;
  const today = new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });

  const logoData = await getLogoDet();
  if (logoData) doc.addImage(logoData, 'PNG', M, 8, 28, 14);

  let y = 14;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text('CORPORATE-ICT', W / 2, y, { align: 'center' }); y += 7;
  doc.setFontSize(12);
  doc.text('Transmittal Slip', W / 2, y, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text('N\u00ba', W - 38, y - 1);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(200, 0, 0); doc.setFontSize(13);
  doc.text(String(asset.transmittal_seq || ''), W - 32, y);
  doc.setTextColor(0, 0, 0); y += 10;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text('Date:', W - 55, y);
  doc.line(W - 47, y + 0.5, W - M, y + 0.5);
  doc.text(today, W - 46, y - 0.5); y += 8;

  const tableRows = [[asset.description || '', asset.inventory_asset_tag?.trim() || 'N/A', '1']];
  while (tableRows.length < 10) tableRows.push(['', '', '']);

  doc.autoTable({
    startY: y,
    head: [['Item Description', 'Asset Tag', 'Qty']],
    body: tableRows,
    styles: { fontSize: 9, cellPadding: 3.5, lineColor: [0,0,0], lineWidth: 0.25 },
    headStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontStyle: 'bold', lineWidth: 0.3, lineColor: [0,0,0], halign: 'center' },
    bodyStyles: { minCellHeight: 10, lineWidth: 0.2, lineColor: [0,0,0] },
    columnStyles: {
      0: { cellWidth: 104 },
      1: { cellWidth: 44, halign: 'center' },
      2: { cellWidth: 22, halign: 'center' },
    },
    tableLineColor: [0,0,0], tableLineWidth: 0.3, margin: { left: M, right: M },
  });

  const fy = doc.lastAutoTable.finalY + 12;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.line(M, fy, M + 42, fy); doc.text('Account', M + 10, fy + 5);
  doc.line(W - M - 58, fy, W - M, fy); doc.text('Received by/ Date / Time', W - M - 58, fy + 5);

  doc.save(`Transmittal_${asset.po_number || asset.asset_id || 'slip'}.pdf`);
};



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
          <img src="/goli_logo.jpg" alt="GOLI" onerror="this.style.display='none';this.nextSibling.style.display='flex';" />
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

const STATUS_STYLES = {
  'In Progress':  'bg-blue-100 text-blue-700',
  'Deployed':     'bg-green-100 text-green-700',
  'For Delivery': 'bg-yellow-100 text-yellow-700',
  'On Hold':      'bg-orange-100 text-orange-700',
  'Completed':    'bg-purple-100 text-purple-700',
  'Cancelled':    'bg-red-100 text-red-700',
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

const entryMeta = (entry) => {
  if (entry.action === 'Created')   return { icon: PlusCircle,  color: 'text-green-500',  bg: 'bg-green-50 border-green-200'   };
  if (entry.action === 'Cancelled') return { icon: XCircle,     color: 'text-red-500',    bg: 'bg-red-50 border-red-200'       };
  if (entry.field  === 'Status')    return { icon: CheckCircle, color: 'text-blue-500',   bg: 'bg-blue-50 border-blue-200'     };
  return                                   { icon: Edit3,        color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200' };
};

const HISTORY_PAGE_SIZE = 5;

const AssetDetails = ({ asset, onUpdate }) => {
  const [tab,         setTab]         = useState('details');
  const [historyPage, setHistoryPage] = useState(1);
  const [showQRModal, setShowQRModal] = useState(false);
  const [reprinting,  setReprinting]  = useState('');


  if (!asset) return null;

  const history    = [...(asset.history || [])].reverse();
  const totalPages = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
  const paged      = history.slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE);

  return (
    <div className="space-y-4">

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {['details', 'history'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t}
            {t === 'history' && history.length > 0 && (
              <span className="ml-1.5 bg-gray-100 text-gray-600 text-xs rounded-full px-1.5 py-0.5">{history.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Details Tab ── */}
      {tab === 'details' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <StatusBadge status={asset.status} />
            <span className="text-xs text-gray-400">{asset.created_at ? new Date(asset.created_at).toLocaleString() : ''}</span>
          </div>

          {/* Reference Numbers — inline in details */}
          {(asset.po_number || asset.pr_number || asset.jor_number || asset.accountability_seq || asset.transmittal_seq) && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl grid grid-cols-2 gap-2 text-xs">
              {asset.po_number && <div><p className="text-blue-400 font-medium">PO Number</p><p className="font-semibold text-gray-800">{asset.po_number}</p></div>}
              {asset.pr_number && <div><p className="text-blue-400 font-medium">PR Number</p><p className="font-semibold text-gray-800">{asset.pr_number}</p></div>}
              {asset.jor_number && <div><p className="text-blue-400 font-medium">JOR Number</p><p className="font-semibold text-gray-800">{asset.jor_number}</p></div>}
              {asset.accountability_seq && <div><p className="text-blue-400 font-medium">Accountability Seq.</p><p className="font-semibold text-gray-800">{asset.accountability_seq}</p></div>}
              {asset.transmittal_seq && <div><p className="text-blue-400 font-medium">Transmittal Seq.</p><p className="font-semibold text-gray-800">{asset.transmittal_seq}</p></div>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <InfoRow icon={Hash}   label="Asset Tag"      value={asset.inventory_asset_tag?.trim() || 'N/A'} />
            <InfoRow icon={Tag}    label="Category"       value={asset.category} />
            <InfoRow icon={Hash}   label="Serial Number"  value={asset.serial_number || asset.serialNumber} />
            <InfoRow icon={MapPin} label="Location"       value={asset.location} />
            <InfoRow icon={User}   label="Assigned To"    value={asset.assigned_to || asset.assignedTo} />
            <InfoRow icon={User}   label="Created By"     value={asset.created_by} />
            <InfoRow icon={Shield} label="Purchase Price" value={asset.purchase_price != null ? `₱${parseFloat(asset.purchase_price).toFixed(2)}` : null} />
            <InfoRow icon={Clock}  label="Purchase Date"  value={asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : null} />
            <InfoRow icon={Shield} label="Warranty"       value={asset.warranty} />
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">Description</p>
            <p className="text-sm font-medium text-gray-800">{asset.description}</p>
          </div>

          {/* Reprint buttons */}
          {(asset.po_number || asset.accountability_seq || asset.transmittal_seq) && asset.status !== 'Cancelled' && (
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => goliPrintQR(
                  [asset.inventory_asset_tag?.trim() || 'N/A'],
                  (tag) => buildAssetQRPayload(asset),
                  asset.description
                )}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 text-white text-xs font-medium rounded-lg hover:bg-blue-800 transition-colors"
              >
                <Printer size={12} /> Print QR Tag
              </button>
              <button
                onClick={async () => { setReprinting('acc'); await reprintAccountability(asset); setReprinting(''); }}
                disabled={reprinting === 'acc'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 text-white text-xs font-medium rounded-lg hover:bg-indigo-800 disabled:opacity-50 transition-colors"
              >
                <FileText size={12} /> {reprinting === 'acc' ? 'Generating…' : 'Accountability Form'}
              </button>
              <button
                onClick={async () => { setReprinting('trs'); await reprintTransmittal(asset); setReprinting(''); }}
                disabled={reprinting === 'trs'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white text-xs font-medium rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors"
              >
                <FileText size={12} /> {reprinting === 'trs' ? 'Generating…' : 'Transmittal Slip'}
              </button>
            </div>
          )}


        </div>
      )}

      {showQRModal && (
        <QRModal asset={asset} onClose={() => setShowQRModal(false)} />
      )}

      {/* ── History Tab ── */}
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
                  {paged.map((entry, i) => {
                    const { icon: Icon, color, bg } = entryMeta(entry);
                    return (
                      <div key={i} className="flex gap-3 relative">
                        <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 bg-white z-10 ${bg}`}>
                          <Icon size={15} className={color} />
                        </div>
                        <div className={`flex-1 rounded-xl border p-3 text-sm ${bg}`}>
                          <div>
                            {entry.action === 'Created' ? (
                              <p className="font-semibold text-gray-800">{entry.details || 'Asset created'}</p>
                            ) : entry.action === 'Cancelled' ? (
                              <div>
                                <p className="font-semibold text-gray-800 mb-1">Asset Cancelled</p>
                                {entry.reason && (
                                  <p className="text-xs text-red-600 italic">Reason: "{entry.reason}"</p>
                                )}
                              </div>
                            ) : entry.from !== undefined && entry.to !== undefined ? (
                              <div>
                                <p className="font-semibold text-gray-800 mb-1">{entry.field} updated</p>
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
                    {(historyPage - 1) * HISTORY_PAGE_SIZE + 1}–{Math.min(historyPage * HISTORY_PAGE_SIZE, history.length)} of {history.length} entries
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1}
                      className="px-2.5 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40">← Prev</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button key={p} onClick={() => setHistoryPage(p)}
                        className={`w-7 h-7 text-xs rounded border transition-colors ${p === historyPage ? 'bg-blue-900 text-white border-blue-900' : 'border-gray-300 hover:bg-gray-50'}`}>
                        {p}
                      </button>
                    ))}
                    <button onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))} disabled={historyPage === totalPages}
                      className="px-2.5 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40">Next →</button>
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

export default AssetDetails;