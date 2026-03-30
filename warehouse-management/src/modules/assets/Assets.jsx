import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, Filter, Scan, Eye, Edit, Trash2, Ban, Printer,
  ChevronLeft, ChevronRight, X, FileSpreadsheet, Download,
  Search, ShieldAlert, Square, CheckSquare,
  ChevronDown, ChevronUp, CheckCircle, AlertCircle,
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
      a.po_number?.startsWith('__NOPO__') ? '' : (a.po_number || ''), a.inventory_asset_tag || a.asset_id || '', a.description || '', a.category || '',
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

// ── Print Group Accountability Form ──────────────────────────────────────────
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

const printGroupAccountability = async (groupAssets) => {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 14;
  const today = new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  const first = groupAssets[0] || {};

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
  doc.text(String(first.accountability_seq || ''), W - 32, 12);
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
  doc.line(M + 11, y + 0.5, 80, y + 0.5);
  doc.text(today, M + 12, y - 0.5);
  y += 6;

  const groupedAcc = {};
  groupAssets.forEach(a => {
    const key = a.description || 'Unknown';
    if (!groupedAcc[key]) groupedAcc[key] = { tags: [], qty: 0 };
    const tag = a.inventory_asset_tag?.trim();
    if (tag && tag !== 'N/A') groupedAcc[key].tags.push(tag);
    groupedAcc[key].qty++;
  });
  const tableRows = Object.entries(groupedAcc).map(([desc, v]) => [
    today,
    v.tags.length > 0 ? v.tags.join(', ') : 'N/A',
    desc,
    String(v.qty),
  ]);
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
    tableLineColor: [0,0,0], tableLineWidth: 0.3,
    margin: { left: M, right: M },
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

  doc.save(`Accountability_${first.po_number || first.asset_id || 'form'}.pdf`);
};

// ── Print Group Transmittal Slip ──────────────────────────────────────────────
const printGroupTransmittal = async (groupAssets) => {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 20;
  const today = new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  const first = groupAssets[0] || {};

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
  doc.text(String(first.transmittal_seq || ''), W - 32, y);
  doc.setTextColor(0, 0, 0); y += 10;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text('Date:', W - 55, y);
  doc.line(W - 47, y + 0.5, W - M, y + 0.5);
  doc.text(today, W - 46, y - 0.5); y += 8;

  const itemMap = {};
  groupAssets.forEach(a => {
    const key = a.description || 'Unknown';
    if (!itemMap[key]) itemMap[key] = { qty: 0, tags: [] };
    const tag = a.inventory_asset_tag?.trim();
    if (tag && tag !== 'N/A') itemMap[key].tags.push(tag);
    itemMap[key].qty++;
  });
  const tableRows = Object.entries(itemMap).map(([desc, v]) => [
    desc,
    v.tags.length > 0 ? v.tags.join(', ') : 'N/A',
    String(v.qty),
  ]);
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
    tableLineColor: [0,0,0], tableLineWidth: 0.3,
    margin: { left: M, right: M },
  });

  const fy = doc.lastAutoTable.finalY + 12;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.line(M, fy, M + 42, fy); doc.text('Account', M + 10, fy + 5);
  doc.line(W - M - 58, fy, W - M, fy); doc.text('Received by/ Date / Time', W - M - 58, fy + 5);

  doc.save(`Transmittal_${first.po_number || first.asset_id || 'slip'}.pdf`);
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
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="max-h-60 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Asset Tag</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Item Description</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assets.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono font-semibold text-blue-700 whitespace-nowrap">
                    {a.inventory_asset_tag?.trim() || <span className="text-gray-400 font-normal">N/A</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{a.description}</td>
                  <td className="px-3 py-2 text-gray-500">{a.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
const EditGroupForm = ({ groupAssets, onClose, onSuccess, setOperationLoading, allAssets }) => {
  const { updateAsset, deployAsset, inventory } = useWMS();
  const first = groupAssets[0] || {};

  const [activeTab, setActiveTab] = useState('assets');
  const [loading, setLoading]     = useState(false);
  const [saved, setSaved]         = useState(false);
  const [reactivationError, setReactivationError] = useState(null);

  // ── Tab 1: Per-asset rows ─────────────────────────────────────────────────
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
  const STATUSES = ['In Progress','Deployed','For Delivery','On Hold','Completed','Cancelled'];
  const updateRow = (i, field, value) =>
    setRows(prev => { const n = [...prev]; n[i] = { ...n[i], [field]: value }; return n; });

  const handleSaveAssets = async () => {
    setLoading(true);
    setOperationLoading({ type: 'save', count: rows.length });
    try {
      // Check if any asset is being reactivated from Cancelled
      const reactivations = [];
      for (const row of rows) {
        const currentAsset = groupAssets.find(a => a.id === row.id);
        if (currentAsset?.status === 'Cancelled' && row.status !== 'Cancelled') {
          // Check if this asset's inventory item is already deployed elsewhere
          const invItemId = currentAsset.inventory_item_id;
          const assetTag = currentAsset.inventory_asset_tag;
          
          if (invItemId && assetTag) {
            // Find if this asset tag is already used in another active deployment
            const duplicate = (allAssets || []).find(a => 
              a.id !== currentAsset.id &&
              a.inventory_asset_tag === assetTag &&
              a.status !== 'Cancelled'
            );
            
            if (duplicate) {
              reactivations.push({
                assetTag,
                description: duplicate.description,
                poNumber: duplicate.po_number,
                prNumber: duplicate.pr_number,
                jorNumber: duplicate.jor_number,
                accountabilitySeq: duplicate.accountability_seq,
                transmittalSeq: duplicate.transmittal_seq,
                status: duplicate.status,
              });
            }
          }
        }
      }
      
      // If there are conflicts, show error modal and stop
      if (reactivations.length > 0) {
        setReactivationError(reactivations);
        return;
      }
      
      // Process sequentially to ensure each update sees the previous status change
      for (const row of rows) {
        await updateAsset(row.id, {
          assigned_to:   row.assigned_to,
          location:      row.location,
          status:        row.status,
          warranty:      row.warranty,
        });
      }
      setSaved(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 800);
    } catch (err) { 
      alert('Failed to update assets: ' + (err.message || err)); 
    }
    finally { 
      setLoading(false);
      setOperationLoading(null);
    }
  };

  // ── Tab 2: Reference Numbers ──────────────────────────────────────────────
  const [refs, setRefs] = useState({
    po_number:          first.po_number          || '',
    pr_number:          first.pr_number          || '',
    jor_number:         first.jor_number         || '',
    accountability_seq: first.accountability_seq || '',
    transmittal_seq:    first.transmittal_seq     || '',
    rr_number:          first.rr_number           || '',
    si_number:          first.si_number           || '',
  });

  const handleSaveRefs = async () => {
    setLoading(true);
    setOperationLoading({ type: 'save', count: groupAssets.length });
    try {
      await Promise.all(groupAssets.map(a => updateAsset(a.id, refs)));
      setSaved(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 800);
    } catch (err) { alert('Failed to update reference numbers'); }
    finally { 
      setLoading(false);
      setOperationLoading(null);
    }
  };

  // ── Tab 3: Add New Item ───────────────────────────────────────────────────
  const availableItems = (inventory || []).filter(item => item.quantity > 0);
  const [newItem, setNewItem] = useState({
    inventoryItemId: '',
    quantity: 1,
    serialNumber: '',
    assignedTo: first.assigned_to || '',
    location:   first.location    || '',
    status:     first.status      || 'In Progress',
    warranty:   '',
  });
  const selectedItem = inventory?.find(i => i.id === newItem.inventoryItemId) || null;
  const maxQty = selectedItem?.quantity || 1;

  const handleAddItem = async () => {
    if (!newItem.inventoryItemId) { alert('Please select an inventory item.'); return; }
    setLoading(true);
    try {
      const item = selectedItem;
      const assetTags = (() => {
        let tags = item.asset_tags;
        if (!tags) return [];
        if (typeof tags === 'string') { try { tags = JSON.parse(tags); } catch { return []; } }
        if (Array.isArray(tags)) return tags.filter(Boolean);
        return Object.values(tags).filter(Boolean);
      })();
      await deployAsset({
        inventoryItemId:   newItem.inventoryItemId,
        quantity:          newItem.quantity,
        description:       item.description,
        category:          item.category,
        purchasePrice:     item.unit_price || 0,
        poNumber:          refs.po_number,
        prNumber:          refs.pr_number,
        jorNumber:         refs.jor_number,
        accountabilitySeq: refs.accountability_seq,
        transmittalSeq:    refs.transmittal_seq,
        rrNumber:          refs.rr_number,
        siNumber:          refs.si_number,
        serialNumber:      newItem.serialNumber,
        assignedTo:        newItem.assignedTo,
        location:          newItem.location,
        status:            newItem.status,
        purchaseDate:      new Date().toISOString().split('T')[0],
        warranty:          newItem.warranty,
        inventoryAssetTag: assetTags[0] || '',
        inventoryAssetTags: assetTags,
      });
      onSuccess?.();
      onClose();
    } catch (err) { alert('Failed to add item to group'); }
    finally { setLoading(false); }
  };

  const inp = 'w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500';
  const lbl = 'block text-xs text-gray-500 mb-1';

  const tabs = [
    { id: 'assets',     label: `Assets (${rows.length})` },
    { id: 'references', label: 'Reference Numbers' },
    { id: 'additem',    label: '+ Add Item' },
  ];

  // Show reactivation error modal
  if (reactivationError) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={22} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700">Unable to Change Status</p>
            <p className="text-xs text-red-600 mt-1">
              The following item{reactivationError.length !== 1 ? 's are' : ' is'} already in an active deployment
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {reactivationError.map((item, i) => (
            <div key={i} className="p-4 bg-white border border-red-200 rounded-xl space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.description || 'Unknown Item'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Asset Tag: <span className="font-mono font-semibold text-blue-700">{item.assetTag}</span></p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  item.status === 'Deployed' ? 'bg-green-100 text-green-700' :
                  item.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {item.status}
                </span>
              </div>
              
              {(item.poNumber || item.prNumber || item.jorNumber || item.accountabilitySeq || item.transmittalSeq) && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1.5">Reference Numbers:</p>
                  <div className="flex flex-wrap gap-2">
                    {item.poNumber && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                        PO# {item.poNumber}
                      </span>
                    )}
                    {item.prNumber && (
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs font-medium rounded">
                        PR# {item.prNumber}
                      </span>
                    )}
                    {item.jorNumber && (
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded">
                        JOR# {item.jorNumber}
                      </span>
                    )}
                    {item.accountabilitySeq && (
                      <span className="px-2 py-0.5 bg-orange-50 text-orange-700 text-xs font-medium rounded">
                        ACC# {item.accountabilitySeq}
                      </span>
                    )}
                    {item.transmittalSeq && (
                      <span className="px-2 py-0.5 bg-pink-50 text-pink-700 text-xs font-medium rounded">
                        TRS# {item.transmittalSeq}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-3 bg-red-100 border border-red-200 rounded-lg">
          <p className="text-xs text-white-800">
            <strong>Note:</strong> These items cannot be re-deployed because they are currently deployed elsewhere. 
            Please cancel the existing deployment first or use different inventory items.
          </p>
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-200">
          <button
            onClick={() => setReactivationError(null)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
              activeTab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Assets ── */}
      {activeTab === 'assets' && (
        <div className="space-y-3">
          {/* Apply-to-all strip */}
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs font-semibold text-blue-700 mb-2">Apply to all:</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={lbl}>Status</label>
                <select onChange={e => rows.forEach((_, i) => updateRow(i, 'status', e.target.value))}
                  defaultValue="" className={inp}>
                  <option value="" disabled>— Set all —</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Location</label>
                <input type="text" placeholder="Set all" onChange={e => rows.forEach((_, i) => updateRow(i, 'location', e.target.value))} className={inp} />
              </div>
              <div>
                <label className={lbl}>Assigned To</label>
                <input type="text" placeholder="Set all" onChange={e => rows.forEach((_, i) => updateRow(i, 'assigned_to', e.target.value))} className={inp} />
              </div>
            </div>
          </div>

          {/* Per-asset table */}
          <div className="overflow-x-auto max-h-72 overflow-y-auto border border-gray-200 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {['Asset Tag','Description','Assigned To','Location','Status','Warranty'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, i) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-gray-500 whitespace-nowrap">
                      {groupAssets[i]?.inventory_asset_tag || 'N/A'}
                    </td>
                    <td className="px-3 py-2 text-gray-700 max-w-28 truncate">{row.description}</td>
                    <td className="px-3 py-2"><input type="text" value={row.assigned_to} onChange={e => updateRow(i,'assigned_to',e.target.value)} className={inp} /></td>
                    <td className="px-3 py-2"><input type="text" value={row.location} onChange={e => updateRow(i,'location',e.target.value)} className={inp} /></td>
                    <td className="px-3 py-2">
                      <select value={row.status} onChange={e => updateRow(i,'status',e.target.value)} className={inp}>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2"><input type="text" value={row.warranty} onChange={e => updateRow(i,'warranty',e.target.value)} className={inp} placeholder="e.g. 1 Year/s" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            {saved && (
              <div className="flex items-center gap-2 text-green-600 animate-pulse">
                <CheckCircle size={16} />
                <p className="text-sm font-semibold">Saved!</p>
              </div>
            )}
            {!saved && <span />}
            <button onClick={handleSaveAssets} disabled={loading}
              className="px-4 py-2 bg-blue-900 text-white text-sm font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors">
              {loading ? 'Saving…' : `Save ${rows.length} Assets`}
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Reference Numbers ── */}
      {activeTab === 'references' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Update reference numbers for all <strong>{groupAssets.length}</strong> assets in this PO group at once.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'po_number',          label: 'PO Number' },
              { key: 'pr_number',          label: 'PR Number' },
              { key: 'jor_number',         label: 'JOR Number' },
              { key: 'accountability_seq', label: 'Accountability Seq. No.' },
              { key: 'transmittal_seq',    label: 'Transmittal Seq. No.' },
              { key: 'rr_number',          label: 'Receiving Report No.' },
              { key: 'si_number',          label: 'Sales Invoice No.' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input type="text" value={refs[key]} onChange={e => setRefs(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            {saved && (
              <div className="flex items-center gap-2 text-green-600 animate-pulse">
                <CheckCircle size={16} />
                <p className="text-sm font-semibold">Saved!</p>
              </div>
            )}
            {!saved && <span />}
            <button onClick={handleSaveRefs} disabled={loading}
              className="px-4 py-2 bg-blue-900 text-white text-sm font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors">
              {loading ? 'Saving…' : 'Update All Reference Numbers'}
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Add Item ── */}
      {activeTab === 'additem' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Add a new inventory item to this PO group (<strong>{refs.po_number || 'no PO#'}</strong>).
            It will inherit the same reference numbers.
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Inventory Item <span className="text-red-500">*</span></label>
            <select value={newItem.inventoryItemId}
              onChange={e => setNewItem(p => ({ ...p, inventoryItemId: e.target.value, quantity: 1 }))}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}>
              <option value="" disabled>— Choose an inventory item —</option>
              {availableItems.map(inv => (
                <option key={inv.id} value={inv.id}>
                  [{inv.item_code}] {inv.description} — {inv.quantity} available
                </option>
              ))}
            </select>
          </div>

          {selectedItem && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Quantity (max {maxQty})</label>
                <input type="number" value={newItem.quantity} min={1} max={maxQty}
                  onChange={e => setNewItem(p => ({ ...p, quantity: Math.max(1, Math.min(parseInt(e.target.value)||1, maxQty)) }))}
                  className={inp} />
              </div>
              <div>
                <label className={lbl}>Serial Number</label>
                <input type="text" value={newItem.serialNumber}
                  onChange={e => setNewItem(p => ({ ...p, serialNumber: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                  placeholder="Scan or type" className={inp} />
              </div>
              <div>
                <label className={lbl}>Assigned To</label>
                <input type="text" value={newItem.assignedTo}
                  onChange={e => setNewItem(p => ({ ...p, assignedTo: e.target.value }))}
                  className={inp} />
              </div>
              <div>
                <label className={lbl}>Location</label>
                <input type="text" value={newItem.location}
                  onChange={e => setNewItem(p => ({ ...p, location: e.target.value }))}
                  className={inp} />
              </div>
              <div>
                <label className={lbl}>Status</label>
                <select value={newItem.status}
                  onChange={e => setNewItem(p => ({ ...p, status: e.target.value }))}
                  className={inp}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Warranty</label>
                <input type="text" value={newItem.warranty}
                  onChange={e => setNewItem(p => ({ ...p, warranty: e.target.value }))}
                  placeholder="e.g. 1 Year/s" className={inp} />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-gray-200">
            <button onClick={handleAddItem} disabled={loading || !newItem.inventoryItemId}
              className="px-4 py-2 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors">
              {loading ? 'Deploying…' : 'Add to This PO Group'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
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
  const [editGroupTarget,   setEditGroupTarget]  = useState(null);
  const [operationLoading,  setOperationLoading] = useState(null); // { type: 'deploy'|'cancel', count: N }
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
        (!q || [a.inventory_asset_tag, a.asset_id, a.description, a.category,
                 a.location, a.assigned_to, a.serial_number,
                 a.po_number, a.pr_number, a.jor_number,
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
      // If no PO, use asset_id as unique key so each asset is its own group
      const key = asset.po_number?.trim() || `__NOPO__${asset.asset_id || asset.id}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(asset);
    });
    return Object.entries(groups); // [ [poKey, assets[]], ... ]
  }, [filtered]);

  // Flatten groups with single items for direct display
  const displayRows = useMemo(() => {
    return groupedByPO.map(([poKey, assets]) => ({
      poKey,
      assets,
      isGroup: assets.length > 1, // Only show group header if multiple items
    }));
  }, [groupedByPO]);

  const totalPages = Math.max(1, Math.ceil(displayRows.length / pageSize));
  const paginatedRows = displayRows.slice((page - 1) * pageSize, page * pageSize);
  // paginated still needed for select-all count
  const paginated = paginatedRows.flatMap(row => row.assets);

  const inUse       = assets.filter(a => a.status === 'In Use').length;
  const maintenance = assets.filter(a => a.status === 'Maintenance' || a.status === 'Repair').length;
  const cancelled   = assets.filter(a => a.status === 'Cancelled').length;
  const completed   = assets.filter(a => a.status === 'Completed').length;

  const handleCancelConfirm = async (reason) => {
    const target = cancelTarget;
    setCancelTarget(null);
    setOperationLoading({ type: 'cancel', count: 1 });
    try {
      const ok = await cancelAsset(target.id, reason);
      if (!ok) alert('Failed to cancel asset.');
    } finally {
      setOperationLoading(null);
    }
  };

  const handleBulkCancelConfirm = async (reason) => {
    if (!bulkCancelQueue?.length) return;
    setOperationLoading({ type: 'cancel', count: bulkCancelQueue.length });
    setBulkCancelQueue(null);
    try {
      const { succeeded, failed } = await bulkCancelAssets(bulkCancelQueue, reason);
      if (failed > 0) alert(`${failed} asset(s) failed to cancel.`);
    } finally {
      setOperationLoading(null);
      clearSelection();
    }
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
            <Button variant="primary" icon={Scan} onClick={() => setIsScannerOpen(true)}>Scan QR</Button>

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
          <span>Showing <strong>{paginatedRows.length}</strong> row{paginatedRows.length !== 1 ? 's' : ''} (<strong>{paginated.length}</strong> assets) of <strong>{displayRows.length}</strong> total rows
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
                  return paginatedRows.map(({ poKey, assets: groupAssets, isGroup }) => {
                    const collapsed = !expandedGroups.has(poKey); // collapsed by default
                    const allSelected = groupAssets.every(a => selectedIds.has(a.id));

                    return (
                      <React.Fragment key={poKey}>
                        {/* Show group header only if multiple items */}
                        {isGroup && (
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
                                {poKey.startsWith('__NOPO__') ? (
                                  <span className="font-bold">
                                    {groupAssets[0]?.inventory_asset_tag?.trim() || groupAssets[0]?.asset_id || 'N/A'}
                                  </span>
                                ) : (
                                  <>
                                    <span className="text-blue-300 text-xs font-medium uppercase tracking-wide mr-1">PO#</span>
                                    <span className="font-bold">{poKey}</span>
                                  </>
                                )}
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
                                  <Printer size={11} /> Accountability Form
                                </button>
                                <button
                                  onClick={() => printGroupTransmittal(groupAssets)}
                                  title="Print Transmittal Slip"
                                  className="flex items-center gap-1 px-2.5 py-1 bg-green-700 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors"
                                >
                                  <Printer size={11} /> Transmittal Slip
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
                        )}
                        {/* Asset rows - show directly if single item, or under group if multiple */}
                        {(isGroup ? !collapsed : true) && groupAssets.map((asset, i) => (
                          <tr key={`${poKey}-${asset.id || asset.asset_id}-${i}`} className={`hover:bg-gray-50 transition-colors border-l-4 ${
                            selectedIds.has(asset.id) 
                              ? 'bg-blue-50 border-blue-400' 
                              : isGroup 
                                ? 'bg-green-50 border-transparent border-b-2 border-b-blue-300' 
                                : 'border-transparent'
                          }`}>
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
              setOperationLoading={setOperationLoading}
              allAssets={assets}
            />
          )}
        </Modal>

        {selectedQRAsset && <QRModal asset={selectedQRAsset} onClose={() => setSelectedQRAsset(null)} />}
        {isScannerOpen   && <QRScanner onClose={() => setIsScannerOpen(false)} />}

        {/* Operation Loading Overlay */}
        {operationLoading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4">
              <div className="flex flex-col items-center gap-5">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-700 animate-spin" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold text-gray-800">
                    {operationLoading.type === 'cancel' ? 'Cancelling Assets' : 
                     operationLoading.type === 'save' ? 'Updating' : 'Processing'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {operationLoading.type === 'cancel'
                      ? `Cancelling ${operationLoading.count} asset${operationLoading.count !== 1 ? 's' : ''}…`
                      : operationLoading.type === 'save'
                      ? `Saving ${operationLoading.count} asset${operationLoading.count !== 1 ? 's' : ''}…`
                      : 'Please wait…'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
          </div>
      </div>}
    </div>
  );
};

export default Assets;