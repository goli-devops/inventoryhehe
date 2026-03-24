import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, Filter, Scan, Eye, Edit, Trash2, Ban, Printer,
  ChevronLeft, ChevronRight, X, FileSpreadsheet, Download,
  Search, ShieldAlert, Square, CheckSquare,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import AssetForm from './AssetForm';
import AssetEditForm from './AssetEditForm';
import AssetDetails from './AssetDetails';
import AssetAuditLog from './AssetAuditLog';
import QRModal from '../../components/common/QRModal';
import QRScanner from '../../components/common/QRScanner';
import { useWMS } from '../../context/WMSContext';
import { useSettings } from '../../context/SettingsContext';

// ─── Export helpers ───────────────────────────────────────────────────────────
const loadScript = (src) =>
  new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });

const exportToExcel = async (rows) => {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
  const XLSX = window.XLSX;
  const data = [
    ['PO Number','Asset ID (Tag)','Description','Category','Serial No.','Location','Assigned To','Status','Purchase Date','Purchase Price','Warranty'],
    ...rows.map(a => [
      a.po_number || '', a.asset_id || '', a.description || '', a.category || '',
      a.serial_number || '', a.location || '',
      a.assigned_to || '', a.status || '',
      a.purchase_date ? new Date(a.purchase_date).toLocaleDateString() : '',
      a.purchase_price ?? 0, a.warranty || '',
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Assets');
  XLSX.writeFile(wb, `Assets_${new Date().toISOString().split('T')[0]}.xlsx`);
};

const exportToPDF = async (rows) => {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16);
  doc.text('GOLI ICT — Asset Tracking', 14, 15);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}  |  Total: ${rows.length}`, 14, 22);
  doc.autoTable({
    startY: 27,
    head: [['PO Number','Asset ID (Tag)','Description','Category','Location','Assigned To','Status','Price']],
    body: rows.map(a => [
      a.asset_id || '', a.description || '', a.category || '',
      a.location || '', a.assigned_to || '', a.status || '',
      a.purchase_date ? new Date(a.purchase_date).toLocaleDateString() : '',
      `₱${parseFloat(a.purchase_price || 0).toLocaleString()}`,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 58, 138] },
    alternateRowStyles: { fillColor: [239, 246, 255] },
  });
  doc.save(`Assets_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  'In Progress':  'bg-blue-100 text-blue-800',
  'Deployed':     'bg-green-100 text-green-800',
  'For Delivery': 'bg-yellow-100 text-yellow-800',
  'On Hold':      'bg-orange-100 text-orange-800',
  'Completed':    'bg-purple-100 text-purple-800',
  'Cancelled':    'bg-red-100 text-red-800',
};
const StatusBadge = ({ status }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'}`}>
    {status}
  </span>
);

// ─── Cancel Confirm Modal ─────────────────────────────────────────────────────
const CancelConfirmModal = ({ asset, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  const [error,  setError]  = useState('');
  if (!asset) return null;
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
        <Ban size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-700">You are about to cancel this asset</p>
          <p className="text-sm text-red-600 mt-0.5">
            The asset status will be set to Cancelled. If it was deployed from inventory, 1 unit will be returned to stock.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm">
        <div><p className="text-xs text-gray-400">Asset ID</p><p className="font-semibold text-gray-800">{asset.asset_id || '—'}</p></div>
        <div><p className="text-xs text-gray-400">Category</p><p className="font-semibold text-gray-800">{asset.category || '—'}</p></div>
        <div className="col-span-2"><p className="text-xs text-gray-400">Description</p><p className="font-medium text-gray-700">{asset.description || '—'}</p></div>
        <div><p className="text-xs text-gray-400">Assigned To</p><p className="font-medium text-gray-700">{asset.assigned_to || '—'}</p></div>
        <div><p className="text-xs text-gray-400">Current Status</p><p className="font-medium text-gray-700">{asset.status || '—'}</p></div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Reason for Cancellation <span className="text-red-500">*</span>
        </label>
        <textarea value={reason} onChange={e => { setReason(e.target.value); setError(''); }} rows={3}
          placeholder="e.g. Device damaged beyond repair, lost, stolen…"
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none ${error ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
        <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Keep Asset</button>
        <button onClick={() => { if (!reason.trim()) { setError('Please provide a reason.'); return; } onConfirm(reason.trim()); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
          <Ban size={14} /> Confirm Cancel
        </button>
      </div>
    </div>
  );
};

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
const DeleteConfirmModal = ({ asset, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  const [error,  setError]  = useState('');
  if (!asset) return null;
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
        <Trash2 size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-700">You are about to permanently delete this asset</p>
          <p className="text-sm text-red-600 mt-0.5">This action cannot be undone. The record will be logged in the Audit Trail.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm">
        <div><p className="text-xs text-gray-400">Asset ID</p><p className="font-semibold text-gray-800">{asset.asset_id || '—'}</p></div>
        <div><p className="text-xs text-gray-400">Status</p><p className="font-semibold text-gray-800">{asset.status || '—'}</p></div>
        <div className="col-span-2"><p className="text-xs text-gray-400">Description</p><p className="font-medium text-gray-700">{asset.description || '—'}</p></div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Reason for Deletion <span className="text-red-500">*</span>
        </label>
        <textarea value={reason} onChange={e => { setReason(e.target.value); setError(''); }} rows={3}
          placeholder="e.g. Duplicate record, data entry error…"
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none ${error ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
        <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
        <button onClick={() => { if (!reason.trim()) { setError('Please provide a reason.'); return; } onConfirm(reason.trim()); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
          <Trash2 size={14} /> Confirm Delete
        </button>
      </div>
    </div>
  );
};


// ─── Bulk Cancel Modal ────────────────────────────────────────────────────────
const BulkCancelModal = ({ assets, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  const [error,  setError]  = useState('');
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
        <Ban size={20} className="text-orange-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-orange-700">Cancelling {assets.length} asset{assets.length !== 1 ? 's' : ''}</p>
          <p className="text-sm text-orange-600 mt-0.5">
            All selected assets will be marked as Cancelled. If linked to inventory, each will return 1 unit to stock.
          </p>
        </div>
      </div>
      <div className="max-h-40 overflow-y-auto space-y-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        {assets.map(a => (
          <div key={a.id} className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-gray-700 w-28 flex-shrink-0">{a.asset_id}</span>
            <span className="text-gray-500 truncate">{a.description}</span>
          </div>
        ))}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Reason for Cancellation <span className="text-red-500">*</span>
        </label>
        <textarea value={reason} onChange={e => { setReason(e.target.value); setError(''); }} rows={3}
          placeholder="e.g. Devices damaged, lost, or decommissioned…"
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none ${error ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
        <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Keep Assets</button>
        <button onClick={() => { if (!reason.trim()) { setError('Please provide a reason.'); return; } onConfirm(reason.trim()); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors">
          <Ban size={14} /> Confirm Cancel All
        </button>
      </div>
    </div>
  );
};


// ── Edit PO Group Form ────────────────────────────────────────────────────────
const EditGroupForm = ({ groupAssets, onClose, onSuccess }) => {
  const { updateAsset } = useWMS();
  const [rows, setRows] = useState(
    groupAssets.map(a => ({
      id:           a.id,
      asset_id:     a.asset_id || '',
      description:  a.description || '',
      serial_number:a.serial_number || '',
      assigned_to:  a.assigned_to || '',
      location:     a.location || '',
      status:       a.status || 'In Progress',
      warranty:     a.warranty || '',
    }))
  );
  const [loading, setLoading] = useState(false);
  const STATUSES = ['In Progress','Deployed','For Delivery','On Hold','Completed','Cancelled'];

  const updateRow = (i, field, value) =>
    setRows(prev => { const n = [...prev]; n[i] = { ...n[i], [field]: value }; return n; });

  const handleSave = async () => {
    setLoading(true);
    try {
      await Promise.all(rows.map(row =>
        updateAsset(row.id, {
          serial_number: row.serial_number,
          assigned_to:   row.assigned_to,
          location:      row.location,
          status:        row.status,
          warranty:      row.warranty,
        })
      ));
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to update group');
    } finally {
      setLoading(false);
    }
  };

  const inp = 'w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Edit details for all <strong>{rows.length}</strong> asset{rows.length !== 1 ? 's' : ''} in this PO group.
        Changes save all items at once.
      </p>

      {/* Shared apply-to-all controls */}
      <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
        <p className="text-xs font-semibold text-blue-700 mb-2">Apply to all assets in group:</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select onChange={e => rows.forEach((_, i) => updateRow(i, 'status', e.target.value))}
              defaultValue="" className={inp}>
              <option value="" disabled>— Set all —</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Location</label>
            <input type="text" placeholder="Set all locations"
              onChange={e => rows.forEach((_, i) => updateRow(i, 'location', e.target.value))}
              className={inp} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Assigned To</label>
            <input type="text" placeholder="Set all assignees"
              onChange={e => rows.forEach((_, i) => updateRow(i, 'assigned_to', e.target.value))}
              className={inp} />
          </div>
        </div>
      </div>

      {/* Per-asset rows */}
      <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 rounded-xl">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {['Asset ID','Description','Serial No.','Assigned To','Location','Status','Warranty'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, i) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-gray-600 whitespace-nowrap">{row.asset_id}</td>
                <td className="px-3 py-2 text-gray-700 max-w-32 truncate">{row.description}</td>
                <td className="px-3 py-2">
                  <input type="text" value={row.serial_number}
                    onChange={e => updateRow(i, 'serial_number', e.target.value)}
                    className={inp} placeholder="SN-xxxxx" />
                </td>
                <td className="px-3 py-2">
                  <input type="text" value={row.assigned_to}
                    onChange={e => updateRow(i, 'assigned_to', e.target.value)}
                    className={inp} placeholder="Employee" />
                </td>
                <td className="px-3 py-2">
                  <input type="text" value={row.location}
                    onChange={e => updateRow(i, 'location', e.target.value)}
                    className={inp} placeholder="Location" />
                </td>
                <td className="px-3 py-2">
                  <select value={row.status} onChange={e => updateRow(i, 'status', e.target.value)} className={inp}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input type="text" value={row.warranty}
                    onChange={e => updateRow(i, 'warranty', e.target.value)}
                    className={inp} placeholder="e.g. 1 Year/s" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
        <button onClick={onClose}
          className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button onClick={handleSave} disabled={loading}
          className="px-4 py-2 text-sm font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors">
          {loading ? 'Saving…' : `Save All ${rows.length} Assets`}
        </button>
      </div>
    </div>
  );
};


// ── Group-level PDF helpers ────────────────────────────────────────────────────
const loadPdfScript = (src) => new Promise((res, rej) => {
  if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
  const s = document.createElement('script');
  s.src = src; s.onload = res; s.onerror = rej;
  document.head.appendChild(s);
});

const getGroupLogoBase64 = () => new Promise((resolve) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    resolve(c.toDataURL('image/png'));
  };
  img.onerror = () => resolve(null);
  img.src = '/goli_logo.jpg';
});

const printGroupAccountability = async (groupAssets) => {
  await loadPdfScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await loadPdfScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 14;
  const today = new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  const first = groupAssets[0] || {};

  const logoData = await getGroupLogoBase64();
  if (logoData) doc.addImage(logoData, 'PNG', M, 8, 28, 14);

  let y = 14;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text('ICT DEPARTMENT', W / 2, y, { align: 'center' }); y += 7;
  doc.setFontSize(12);
  doc.text('ACCOUNTABILITY FORM', W / 2, y, { align: 'center' }); y += 4;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text('N\u00ba', W - 38, 12);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(200, 0, 0); doc.setFontSize(13);
  doc.text(String(first.accountability_seq || first.po_number || ''), W - 32, 12);
  doc.setTextColor(0, 0, 0);

  y += 4;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('Dept.:', M, y); doc.setFont('helvetica', 'normal');
  doc.line(M + 12, y + 0.5, 110, y + 0.5);
  doc.text(first.jor_number || '', M + 13, y - 0.5);
  y += 7;
  doc.setFont('helvetica', 'bold'); doc.text('Name:', M, y); doc.setFont('helvetica', 'normal');
  doc.line(M + 12, y + 0.5, 120, y + 0.5);
  doc.text(first.assigned_to || '', M + 13, y - 0.5);
  doc.setFont('helvetica', 'bold'); doc.text('Position:', 122, y); doc.setFont('helvetica', 'normal');
  doc.line(134, y + 0.5, W - M, y + 0.5);
  y += 7;
  doc.setFont('helvetica', 'bold'); doc.text('Date:', M, y); doc.setFont('helvetica', 'normal');
  doc.line(M + 11, y + 0.5, 80, y + 0.5); doc.text(today, M + 12, y - 0.5);
  y += 6;

  // Group rows by description + join tags
  const grouped = {};
  groupAssets.forEach(a => {
    const key = a.description || 'Unknown';
    if (!grouped[key]) grouped[key] = { tags: [], qty: 0 };
    const tag = a.inventory_asset_tag?.trim();
    if (tag && tag !== 'N/A') grouped[key].tags.push(tag);
    grouped[key].qty++;
  });
  const tableRows = Object.entries(grouped).map(([desc, v]) => [
    today, v.tags.length > 0 ? v.tags.join(', ') : 'N/A', desc, String(v.qty),
  ]);
  while (tableRows.length < 10) tableRows.push(['', '', '', '']);

  doc.autoTable({
    startY: y,
    head: [['DATE', 'ASSET TAG', 'PARTICULARS', 'QTY.']],
    body: tableRows,
    styles: { fontSize: 8, cellPadding: 2.5, lineColor: [0,0,0], lineWidth: 0.25, valign: 'middle' },
    headStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontStyle: 'bold', lineWidth: 0.3, lineColor: [0,0,0], halign: 'center', valign: 'middle', minCellHeight: 10 },
    bodyStyles: { minCellHeight: 9, lineWidth: 0.2, lineColor: [0,0,0] },
    columnStyles: { 0:{cellWidth:22,halign:'center'}, 1:{cellWidth:30,halign:'center'}, 2:{cellWidth:116}, 3:{cellWidth:14,halign:'center'} },
    tableLineColor: [0,0,0], tableLineWidth: 0.3, margin: { left: M, right: M },
  });

  const fy = doc.lastAutoTable.finalY + 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text('I hold myself responsible for the use and safekeeping of the above item and return the same when required by\nthis company or pay for them in case of loss.', M, fy, { maxWidth: W - M * 2 });
  const sigY = fy + 18;
  [{x:M,label:'APPROVED BY:',copy:'Original - Accounting'},{x:83,label:'ISSUED BY:',copy:'Duplicate - Audit'},{x:150,label:'SIGNATURE OF EMPLOYEE',copy:'Triplicate - Personal File'}].forEach(col => {
    doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.text(col.label, col.x, sigY);
    doc.setFont('helvetica','normal'); doc.line(col.x, sigY+12, col.x+50, sigY+12);
    doc.setFontSize(7); doc.text(col.copy, col.x, sigY+16);
  });
  doc.save(`Accountability_Form_PO${first.po_number || ''}.pdf`);
};

const printGroupTransmittal = async (groupAssets) => {
  await loadPdfScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await loadPdfScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 20;
  const today = new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  const first = groupAssets[0] || {};

  const logoData = await getGroupLogoBase64();
  if (logoData) doc.addImage(logoData, 'PNG', M, 8, 28, 14);

  let y = 14;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text('CORPORATE-ICT', W / 2, y, { align: 'center' }); y += 7;
  doc.setFontSize(12); doc.text('Transmittal Slip', W / 2, y, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text('N\u00ba', W - 38, y - 1);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(200, 0, 0); doc.setFontSize(13);
  doc.text(String(first.transmittal_seq || first.po_number || ''), W - 32, y);
  doc.setTextColor(0, 0, 0); y += 10;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text('Date:', W - 55, y); doc.line(W - 47, y + 0.5, W - M, y + 0.5); doc.text(today, W - 46, y - 0.5); y += 8;

  const itemMap = {};
  groupAssets.forEach(a => {
    const key = a.description || 'Unknown';
    if (!itemMap[key]) itemMap[key] = { qty: 0, tags: [] };
    const tag = a.inventory_asset_tag?.trim();
    if (tag && tag !== 'N/A') itemMap[key].tags.push(tag);
    itemMap[key].qty++;
  });
  const tableRows = Object.entries(itemMap).map(([desc, v]) => [desc, v.tags.length > 0 ? v.tags.join(', ') : 'N/A', String(v.qty)]);
  while (tableRows.length < 10) tableRows.push(['', '', '']);

  doc.autoTable({
    startY: y,
    head: [['Item Description', 'Asset Tag', 'Qty']],
    body: tableRows,
    styles: { fontSize: 9, cellPadding: 3.5, lineColor: [0,0,0], lineWidth: 0.25 },
    headStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontStyle: 'bold', lineWidth: 0.3, lineColor: [0,0,0], halign: 'center' },
    bodyStyles: { minCellHeight: 10, lineWidth: 0.2, lineColor: [0,0,0] },
    columnStyles: { 0:{cellWidth:104}, 1:{cellWidth:44,halign:'center'}, 2:{cellWidth:22,halign:'center'} },
    tableLineColor: [0,0,0], tableLineWidth: 0.3, margin: { left: M, right: M },
  });

  const fy = doc.lastAutoTable.finalY + 12;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.line(M, fy, M + 42, fy); doc.text('Account', M + 10, fy + 5);
  doc.line(W - M - 58, fy, W - M, fy); doc.text('Received by/ Date / Time', W - M - 58, fy + 5);
  doc.save(`Transmittal_Slip_PO${first.po_number || ''}.pdf`);
};

// ─── Filter Panel ─────────────────────────────────────────────────────────────
const FilterPanel = ({ filters, onChange, onReset, categories }) => {
  const STATUSES = ['In Progress','Deployed','For Delivery','On Hold','Completed','Cancelled'];
  const inp = 'w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const lbl = 'block text-xs font-medium text-gray-500 mb-1';
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Filters</p>
        <button onClick={onReset} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><X size={11} /> Reset all</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div><label className={lbl}>Asset ID</label>
          <input type="text" value={filters.assetId} onChange={e => onChange('assetId', e.target.value)} placeholder="Search ID" className={inp} /></div>
        <div><label className={lbl}>Category</label>
          <select value={filters.category} onChange={e => onChange('category', e.target.value)} className={inp}>
            <option value="">All</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select></div>
        <div><label className={lbl}>Status</label>
          <select value={filters.status} onChange={e => onChange('status', e.target.value)} className={inp}>
            <option value="">All</option>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select></div>
        <div><label className={lbl}>Assigned To</label>
          <input type="text" value={filters.assignedTo} onChange={e => onChange('assignedTo', e.target.value)} placeholder="Search name" className={inp} /></div>
        <div><label className={lbl}>Location</label>
          <input type="text" value={filters.location} onChange={e => onChange('location', e.target.value)} placeholder="Search location" className={inp} /></div>
        <div><label className={lbl}>Date Added From</label>
          <input type="date" value={filters.dateFrom} onChange={e => onChange('dateFrom', e.target.value)} className={inp} /></div>
        <div><label className={lbl}>Date Added To</label>
          <input type="date" value={filters.dateTo} onChange={e => onChange('dateTo', e.target.value)} className={inp} /></div>
      </div>
    </div>
  );
};

// ─── Constants ─────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const EMPTY_FILTERS = { assetId: '', category: '', status: '', assignedTo: '', location: '', dateFrom: '', dateTo: '' };

// ─── Main Component ─────────────────────────────────────────────────────────
const Assets = () => {
  const { assets: rawAssets, deleteAsset, cancelAsset, bulkCancelAssets, getStats, loading, updateAsset } = useWMS();
  const { categories } = useSettings();
  const assets = rawAssets ?? [];
  const stats  = getStats();

  const [activeTab,       setActiveTab]       = useState('list');
  const [isAddModalOpen,  setIsAddModalOpen]  = useState(false);
  const [viewAsset,       setViewAsset]       = useState(null);
  const [editAsset,       setEditAsset]       = useState(null);
  const [cancelTarget,    setCancelTarget]    = useState(null);
  const [deleteTarget,    setDeleteTarget]    = useState(null);
  const [bulkCancelQueue, setBulkCancelQueue] = useState(null);
  const [editGroupTarget,  setEditGroupTarget]  = useState(null); // { poKey, assets[] }
  const [selectedQRAsset, setSelectedQRAsset] = useState(null);
  const [isScannerOpen,   setIsScannerOpen]   = useState(false);
  const [showFilters,     setShowFilters]     = useState(false);
  const [filters,         setFilters]         = useState(EMPTY_FILTERS);
  const [search,          setSearch]          = useState('');
  const [page,            setPage]            = useState(1);
  const [pageSize,        setPageSize]        = useState(10);
  const [exporting,       setExporting]       = useState(false);
  const [selectedIds,     setSelectedIds]     = useState(new Set());
  const [expandedGroups, setExpandedGroups] = useState(new Set()); // empty = all collapsed by default

  const handleFilterChange = (key, val) => { setFilters(p => ({ ...p, [key]: val })); setPage(1); };
  const resetFilters = () => { setFilters(EMPTY_FILTERS); setSearch(''); setPage(1); };

  // ── Bulk selection helpers ──
  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginated.map(a => a.id)));
  };
  const clearSelection = () => setSelectedIds(new Set());
  const selectedAssets = assets.filter(a => selectedIds.has(a.id));

  // Collapse all groups when clicking outside the table
  const tableRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (tableRef.current && !tableRef.current.contains(e.target)) {
        setExpandedGroups(new Set());
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleGroup = (key) => setExpandedGroups(prev => {
    const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next;
  });
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // ── Filtering ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return assets.filter(a => {
      const date     = a.created_at ? new Date(a.created_at) : null;
      const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
      const dateTo   = filters.dateTo   ? new Date(filters.dateTo + 'T23:59:59') : null;
      return (
        (!q || [a.asset_id, a.description, a.category, a.location, a.assigned_to,
                 a.serial_number, a.po_number, a.pr_number, a.jor_number,
                 a.transmittal_seq, a.accountability_seq]
          .some(f => String(f || '').toLowerCase().includes(q))) &&
        (!filters.assetId    || String(a.asset_id    || '').toLowerCase().includes(filters.assetId.toLowerCase())) &&
        (!filters.category   || a.category  === filters.category) &&
        (!filters.status     || a.status    === filters.status) &&
        (!filters.assignedTo || String(a.assigned_to || '').toLowerCase().includes(filters.assignedTo.toLowerCase())) &&
        (!filters.location   || String(a.location    || '').toLowerCase().includes(filters.location.toLowerCase())) &&
        (!dateFrom || (date && date >= dateFrom)) &&
        (!dateTo   || (date && date <= dateTo))
      );
    });
  }, [assets, filters, search]);

  // Group filtered assets by PO number first
  const groupedByPO = useMemo(() => {
    const groups = {};
    filtered.forEach(asset => {
      const key = asset.po_number?.trim() || '(No PO Number)';
      if (!groups[key]) groups[key] = [];
      groups[key].push(asset);
    });
    return Object.entries(groups); // [ [poKey, assets[]], ... ]
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(groupedByPO.length / pageSize));
  const paginatedGroups = groupedByPO.slice((page - 1) * pageSize, page * pageSize);
  // paginated still needed for select-all count
  const paginated = paginatedGroups.flatMap(([, assets]) => assets);

  const inUse       = assets.filter(a => a.status === 'In Use').length;
  const maintenance = assets.filter(a => a.status === 'Maintenance' || a.status === 'Repair').length;
  const cancelled   = assets.filter(a => a.status === 'Cancelled').length;
  const completed   = assets.filter(a => a.status === 'Completed').length;

  const handleCancelConfirm = async (reason) => {
    const ok = await cancelAsset(cancelTarget.id, reason);
    if (!ok) alert('Failed to cancel asset.');
    setCancelTarget(null);
  };

  const handleBulkCancelConfirm = async (reason) => {
    if (!bulkCancelQueue?.length) return;
    // Use bulkCancelAssets: batch DB update + sequential inventory restoration
    const { succeeded, failed } = await bulkCancelAssets(bulkCancelQueue, reason);
    if (failed > 0) alert(`${failed} asset(s) failed to cancel.`);
    setBulkCancelQueue(null);
    clearSelection();
  };

  const handleDeleteConfirm = async (reason) => {
    const ok = await deleteAsset(deleteTarget.id, reason);
    if (!ok) alert('Failed to delete asset.');
    setDeleteTarget(null);
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try { await exportToExcel(filtered); } catch(e) { alert('Export failed'); } finally { setExporting(false); }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try { await exportToPDF(filtered); } catch(e) { alert('Export failed'); } finally { setExporting(false); }
  };

  return (
    <div className="space-y-4">

      {/* Module Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'list' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <Scan size={15} /> Asset Tracking
        </button>
        <button onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'audit' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <ShieldAlert size={15} /> Cancellation Audit Log
        </button>
      </div>

      {/* ── Audit Tab ── */}
      {activeTab === 'audit' && <AssetAuditLog />}

      {/* ── List Tab ── */}
      {activeTab === 'list' && <div className="space-y-4">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Button variant="purple" icon={Plus} onClick={() => setIsAddModalOpen(true)}>Add Asset</Button>

            <button onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                showFilters || activeFilterCount > 0 ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              <Filter size={15} /> Filter
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{activeFilterCount}</span>
              )}
            </button>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Quick search…"
                className="pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
            </div>

          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportExcel} disabled={exporting || filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
              <FileSpreadsheet size={15} className="text-green-600" /> Excel
            </button>
            <button onClick={handleExportPDF} disabled={exporting || filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
              <Download size={15} className="text-red-600" /> PDF
            </button>
          </div>
        </div>

        {showFilters && (
          <FilterPanel filters={filters} onChange={handleFilterChange} onReset={resetFilters} categories={categories} />
        )}


        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-900 text-white rounded-xl">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <div className="flex items-center gap-2 ml-2">
              <button onClick={() => {
                const toCancel = selectedAssets.filter(a => a.status !== 'Cancelled');
                if (toCancel.length === 0) { alert('All selected assets are already cancelled.'); return; }
                setBulkCancelQueue(toCancel);
              }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 rounded-lg text-xs font-medium transition-colors">
                <Ban size={13} /> Cancel Selected ({selectedAssets.filter(a => a.status !== 'Cancelled').length})
              </button>

            </div>
            <button onClick={clearSelection} className="ml-auto p-1 hover:bg-white/20 rounded-lg transition-colors"><X size={14} /></button>
          </div>
        )}

        {/* Results summary */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Showing <strong>{paginatedGroups.length}</strong> PO group{paginatedGroups.length !== 1 ? 's' : ''} (<strong>{paginated.length}</strong> assets) of <strong>{groupedByPO.length}</strong> total groups
          </span>
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-gray-300 rounded px-2 py-0.5 text-sm">
              {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div ref={tableRef}>
        <Card padding="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-700">
                      {selectedIds.size > 0 && selectedIds.size === paginated.length
                        ? <CheckSquare size={16} className="text-blue-600" />
                        : <Square size={16} />}
                    </button>
                  </th>
                  {['Asset Tag','Description','Category','Serial No.','Location','Assigned To','Status','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan="9" className="px-6 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative w-10 h-10">
                        <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
                      </div>
                      <p className="text-sm">Loading assets…</p>
                    </div>
                  </td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan="9" className="px-6 py-16 text-center text-gray-400">
                    <Scan size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No assets found</p>
                    <p className="text-sm mt-1">{activeFilterCount > 0 || search ? 'Try adjusting your filters.' : 'Click "Add Asset" to get started.'}</p>
                  </td></tr>
                ) : (() => {
                  return paginatedGroups.map(([poKey, groupAssets]) => {
                    const collapsed = !expandedGroups.has(poKey); // collapsed by default
                    const allSelected = groupAssets.every(a => selectedIds.has(a.id));

                    return (
                      <React.Fragment key={poKey}>
                        {/* PO Group header row */}
                        <tr className="bg-blue-950 text-white">
                          <td className="px-4 py-2">
                            <button onClick={() => {
                              if (allSelected) groupAssets.forEach(a => setSelectedIds(prev => { const n = new Set(prev); n.delete(a.id); return n; }));
                              else groupAssets.forEach(a => setSelectedIds(prev => new Set([...prev, a.id])));
                            }} className="text-blue-300 hover:text-white">
                              {allSelected
                                ? <CheckSquare size={16} className="text-blue-300" />
                                : <Square size={16} />}
                            </button>
                          </td>
                          <td colSpan="7" className="px-4 py-2">
                            <button onClick={() => toggleGroup(poKey)}
                              className="flex items-center gap-2 text-sm font-semibold w-full text-left">
                              {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                              <span className="text-blue-300 text-xs font-medium uppercase tracking-wide mr-1">PO#</span>
                              <span className="font-bold">{poKey}</span>
                              <span className="ml-2 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-normal">
                                {groupAssets.length} asset{groupAssets.length !== 1 ? 's' : ''}
                              </span>
                              {/* Show PR / JOR if present */}
                              {groupAssets[0]?.pr_number && (
                                <span className="text-blue-300 text-xs ml-2">PR: {groupAssets[0].pr_number}</span>
                              )}
                              {groupAssets[0]?.jor_number && (
                                <span className="text-blue-300 text-xs ml-1">JOR: {groupAssets[0].jor_number}</span>
                              )}
                            </button>
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => printGroupAccountability(groupAssets)}
                                title="Print Accountability Form"
                                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors"
                              >
                                <Printer size={11} /> Accountability
                              </button>
                              <button
                                onClick={() => printGroupTransmittal(groupAssets)}
                                title="Print Transmittal Slip"
                                className="flex items-center gap-1 px-2.5 py-1 bg-green-700 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors"
                              >
                                <Printer size={11} /> Transmittal
                              </button>
                              <button
                                onClick={() => setEditGroupTarget({ poKey, assets: groupAssets })}
                                title="Edit PO Group"
                                className="flex items-center gap-1 px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors"
                              >
                                <Edit size={12} /> Edit Group
                              </button>
                            </div>
                          </td>
                        </tr>
                        {/* Asset rows within the group */}
                        {!collapsed && groupAssets.map((asset, i) => (
                          <tr key={`${poKey}-${asset.id || asset.asset_id}-${i}`} className={`hover:bg-gray-50 transition-colors border-l-4 ${selectedIds.has(asset.id) ? 'bg-blue-50 border-blue-400' : 'border-transparent'}`}>
                            <td className="px-4 py-3">
                              <button onClick={() => toggleSelect(asset.id)} className="text-gray-400 hover:text-blue-600">
                                {selectedIds.has(asset.id) ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold whitespace-nowrap">
                              {(asset.is_tagged || asset.isTagged) && asset.inventory_asset_tag?.trim()
                                ? <span className="text-blue-700">{asset.inventory_asset_tag}</span>
                                : <span className="text-gray-400 font-normal text-xs">N/A</span>}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-800 max-w-48 truncate">{asset.description}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{asset.category}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{asset.serial_number || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{asset.location || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{asset.assigned_to || '—'}</td>
                            <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={asset.status} /></td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <button onClick={() => setViewAsset(asset)} title="View"
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye size={15} /></button>
                                {asset.status !== 'Cancelled' && (
                                  <button onClick={() => setEditAsset(asset)} title="Edit"
                                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"><Edit size={15} /></button>
                                )}
                                {asset.status !== 'Cancelled' && (
                                  <button onClick={() => setCancelTarget(asset)} title="Cancel Asset"
                                    className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"><Ban size={15} /></button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={page===1} className="px-2 py-1 rounded text-sm border border-gray-300 disabled:opacity-40 hover:bg-gray-50">«</button>
                <button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft size={14}/></button>
                {Array.from({length:Math.min(5,totalPages)},(_,i)=>{const start=Math.max(1,Math.min(page-2,totalPages-4));const p=start+i;return(
                  <button key={p} onClick={()=>setPage(p)} className={`w-8 h-8 rounded text-sm border transition-colors ${p===page?'bg-blue-900 text-white border-blue-900':'border-gray-300 hover:bg-gray-50'}`}>{p}</button>
                );}).filter((_,i)=>i<Math.min(5,totalPages))}
                <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"><ChevronRight size={14}/></button>
                <button onClick={()=>setPage(totalPages)} disabled={page===totalPages} className="px-2 py-1 rounded text-sm border border-gray-300 disabled:opacity-40 hover:bg-gray-50">»</button>
              </div>
            </div>
          )}
        </Card>

        {/* Modals */}
        <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Asset" size="lg">
          <AssetForm onClose={() => setIsAddModalOpen(false)} onSuccess={() => {}} />
        </Modal>

        <Modal isOpen={!!viewAsset} onClose={() => setViewAsset(null)} title="Asset Details" size="lg">
          <AssetDetails asset={viewAsset} onUpdate={updateAsset} />
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={() => setViewAsset(null)}>Close</Button>
            {viewAsset?.status !== 'Cancelled' && (
            <Button variant="primary" onClick={() => { setEditAsset(viewAsset); setViewAsset(null); }}>Edit</Button>
          )}
          </div>
        </Modal>

        <Modal isOpen={!!editAsset} onClose={() => setEditAsset(null)} title="Edit Asset" size="lg">
          {editAsset && <AssetEditForm asset={editAsset} onClose={() => setEditAsset(null)} onSuccess={() => setEditAsset(null)} />}
        </Modal>

        {/* Bulk cancel modal */}
        <Modal isOpen={!!bulkCancelQueue} onClose={() => setBulkCancelQueue(null)} title={`Cancel ${bulkCancelQueue?.length || 0} Asset(s)`} size="md">
          {bulkCancelQueue && (
            <BulkCancelModal
              assets={bulkCancelQueue}
              onConfirm={handleBulkCancelConfirm}
              onCancel={() => setBulkCancelQueue(null)}
            />
          )}
        </Modal>

        <Modal isOpen={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancel Asset" size="md">
          <CancelConfirmModal asset={cancelTarget} onConfirm={handleCancelConfirm} onCancel={() => setCancelTarget(null)} />
        </Modal>

        <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Asset" size="md">
          <DeleteConfirmModal asset={deleteTarget} onConfirm={handleDeleteConfirm} onCancel={() => setDeleteTarget(null)} />
        </Modal>

        {/* Edit PO Group Modal */}
        <Modal isOpen={!!editGroupTarget} onClose={() => setEditGroupTarget(null)}
          title={`Edit PO Group: ${editGroupTarget?.poKey || ''}`} size="lg">
          {editGroupTarget && (
            <EditGroupForm
              groupAssets={editGroupTarget.assets}
              onClose={() => setEditGroupTarget(null)}
              onSuccess={() => setEditGroupTarget(null)}
            />
          )}
        </Modal>

        {selectedQRAsset && <QRModal asset={selectedQRAsset} onClose={() => setSelectedQRAsset(null)} />}
        {isScannerOpen   && <QRScanner onClose={() => setIsScannerOpen(false)} />}
          </div>
      </div>}
    </div>
  );
};

export default Assets;