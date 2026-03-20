import React, { useState, useMemo } from 'react';
import {
  Package, AlertCircle, Plus, Trash2,
  Tag, FileText, Printer, CheckCircle2
} from 'lucide-react';
import Button from '../../components/common/Button';
import { useWMS } from '../../context/WMSContext';

const loadScript = (src) => new Promise((res, rej) => {
  if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
  const s = document.createElement('script');
  s.src = src; s.onload = res; s.onerror = rej;
  document.head.appendChild(s);
});

// ── Accountability Form — matches ICT DEPARTMENT ACCOUNTABILITY FORM ──────────
// ── Load logo as base64 for embedding in PDF ─────────────────────────────────
const getLogoBase64 = () => new Promise((resolve) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width; canvas.height = img.height;
    canvas.getContext('2d').drawImage(img, 0, 0);
    resolve(canvas.toDataURL('image/png'));
  };
  img.onerror = () => resolve(null); // skip logo if unavailable
  img.src = '/goli_logo.jpg';
});

// ── Accountability Form ───────────────────────────────────────────────────────
const printAccountabilityForm = async (deployedAssets, sharedData) => {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 14;
  const today = new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });

  const logoData = await getLogoBase64();
  if (logoData) doc.addImage(logoData, 'PNG', M, 8, 28, 14);

  let y = 14;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text('ICT DEPARTMENT', W / 2, y, { align: 'center' }); y += 7;
  doc.setFontSize(12);
  doc.text('ACCOUNTABILITY FORM', W / 2, y, { align: 'center' }); y += 4;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text('N\u00ba', W - 38, 12);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(200, 0, 0); doc.setFontSize(13);
  doc.text(String(sharedData.accountabilitySeq || ''), W - 32, 12);
  doc.setTextColor(0, 0, 0);

  y += 4;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('Dept.:', M, y); doc.setFont('helvetica', 'normal');
  doc.line(M + 12, y + 0.5, 110, y + 0.5);
  doc.text(sharedData.jorNumber || '', M + 13, y - 0.5);
  y += 7;
  doc.setFont('helvetica', 'bold'); doc.text('Name:', M, y); doc.setFont('helvetica', 'normal');
  doc.line(M + 12, y + 0.5, 120, y + 0.5);
  doc.text(sharedData.assignedTo || '', M + 13, y - 0.5);
  doc.setFont('helvetica', 'bold'); doc.text('Position:', 122, y); doc.setFont('helvetica', 'normal');
  doc.line(134, y + 0.5, W - M, y + 0.5);
  y += 7;
  doc.setFont('helvetica', 'bold'); doc.text('Date:', M, y); doc.setFont('helvetica', 'normal');
  doc.line(M + 11, y + 0.5, 80, y + 0.5);
  doc.text(today, M + 12, y - 0.5);
  y += 6;

  const tableRows = deployedAssets.map(a => [
    today,
    a.inventory_asset_tag?.trim() || 'N/A',
    a.description || '',
    '1',
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

  doc.save(`Accountability_Form_${sharedData.accountabilitySeq || Date.now()}.pdf`);
};

// ── Transmittal Slip ──────────────────────────────────────────────────────────
const printTransmittalSlip = async (deployedAssets, sharedData) => {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 20;
  const today = new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });

  const logoData = await getLogoBase64();
  if (logoData) doc.addImage(logoData, 'PNG', M, 8, 28, 14);

  let y = 14;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text('CORPORATE-ICT', W / 2, y, { align: 'center' }); y += 7;
  doc.setFontSize(12);
  doc.text('Transmittal Slip', W / 2, y, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text('N\u00ba', W - 38, y - 1);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(200, 0, 0); doc.setFontSize(13);
  doc.text(String(sharedData.transmittalSeq || ''), W - 32, y);
  doc.setTextColor(0, 0, 0); y += 10;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text('Date:', W - 55, y);
  doc.line(W - 47, y + 0.5, W - M, y + 0.5);
  doc.text(today, W - 46, y - 0.5);
  y += 8;

  const itemMap = {};
  deployedAssets.forEach(a => {
    const key = a.description || 'Unknown';
    if (!itemMap[key]) itemMap[key] = { qty: 0, tag: a.inventory_asset_tag?.trim() || 'N/A' };
    itemMap[key].qty++;
  });
  const tableRows = Object.entries(itemMap).map(([desc, v]) => [desc, v.tag, String(v.qty)]);
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
  doc.line(W - M - 58, fy, W - M, fy); doc.text('Received by and Date/Time', W - M - 58, fy + 5);

  doc.save(`Transmittal_Slip_${sharedData.transmittalSeq || Date.now()}.pdf`);
};


// ── Confirmation Step ────────────────────────────────────────────────────────
const ConfirmationStep = ({ lines, sharedData, getItem, getAvailableAssetTags, onConfirm, onBack, loading }) => {
  const validLines = lines.filter(l => l.inventoryItemId);
  const totalAssets = validLines.reduce((s, l) => s + l.quantity, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <Package size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Confirm Deployment</p>
          <p className="text-sm text-amber-700 mt-0.5">
            Please review the items and quantities before proceeding. This will deduct stock from inventory.
          </p>
        </div>
      </div>

      {/* Reference numbers summary */}
      <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs">
        {sharedData.poNumber && <div><p className="text-gray-400">PO Number</p><p className="font-semibold">{sharedData.poNumber}</p></div>}
        {sharedData.prNumber && <div><p className="text-gray-400">PR Number</p><p className="font-semibold">{sharedData.prNumber}</p></div>}
        {sharedData.jorNumber && <div><p className="text-gray-400">JOR Number</p><p className="font-semibold">{sharedData.jorNumber}</p></div>}
        {sharedData.accountabilitySeq && <div><p className="text-gray-400">Accountability Seq.</p><p className="font-semibold">{sharedData.accountabilitySeq}</p></div>}
        {sharedData.transmittalSeq && <div><p className="text-gray-400">Transmittal Seq.</p><p className="font-semibold">{sharedData.transmittalSeq}</p></div>}
        {sharedData.assignedTo && <div><p className="text-gray-400">Assigned To</p><p className="font-semibold">{sharedData.assignedTo}</p></div>}
        {sharedData.location && <div><p className="text-gray-400">Location</p><p className="font-semibold">{sharedData.location}</p></div>}
      </div>

      {/* Items table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Item</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Qty</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Asset Tags</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {validLines.map((line, i) => {
              const item = getItem(line.inventoryItemId);
              const tags = getAvailableAssetTags(line.inventoryItemId);
              const price = item ? (item.unit_price || 0) : 0;
              return (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{item?.description || '—'}</p>
                    {line.serialNumber && <p className="text-xs text-gray-400">SN: {line.serialNumber}</p>}
                    {(line.assignedTo || sharedData.assignedTo) && (
                      <p className="text-xs text-gray-400">Assigned: {line.assignedTo || sharedData.assignedTo}</p>
                    )}
                    {line.warranty && <p className="text-xs text-gray-400">Warranty: {line.warranty}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item?.category || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                      {line.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">
                    {tags.length > 0
                      ? tags.slice(0, line.quantity).join(', ')
                      : <span className="text-gray-400 italic">N/A — no QR will be generated</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    &#8369;{(price * line.quantity).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50 border-t border-gray-200">
            <tr>
              <td colSpan="3" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                Total: {validLines.length} item type{validLines.length !== 1 ? 's' : ''}
              </td>
              <td className="px-4 py-2 text-center font-bold text-blue-700">{totalAssets}</td>
              <td />
              <td className="px-4 py-2 text-right font-bold text-gray-800">
                &#8369;{validLines.reduce((s, l) => {
                  const item = getItem(l.inventoryItemId);
                  return s + (item?.unit_price || 0) * l.quantity;
                }, 0).toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex justify-between gap-3 pt-2 border-t border-gray-200">
        <button onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          &#8592; Back to Edit
        </button>
        <button onClick={onConfirm} disabled={loading}
          className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors">
          <Package size={15} />
          {loading ? 'Deploying…' : `Confirm & Deploy ${totalAssets} Asset${totalAssets !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
};

// ── Success Modal ─────────────────────────────────────────────────────────────
const SuccessModal = ({ deployedAssets, sharedData, onClose }) => {
  const [printing, setPrinting] = useState('');
  const print = async (type) => {
    setPrinting(type);
    try {
      if (type === 'accountability') await printAccountabilityForm(deployedAssets, sharedData);
      else await printTransmittalSlip(deployedAssets, sharedData);
    } finally { setPrinting(''); }
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 size={30} className="text-green-600" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-gray-800">
            {deployedAssets.length} Asset{deployedAssets.length !== 1 ? 's' : ''} Deployed Successfully
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {deployedAssets.map(a => a.inventory_asset_tag || 'N/A').join(', ')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs">
        {sharedData.poNumber && <div><p className="text-gray-400">PO Number</p><p className="font-semibold">{sharedData.poNumber}</p></div>}
        {sharedData.prNumber && <div><p className="text-gray-400">PR Number</p><p className="font-semibold">{sharedData.prNumber}</p></div>}
        {sharedData.jorNumber && <div><p className="text-gray-400">JOR Number</p><p className="font-semibold">{sharedData.jorNumber}</p></div>}
        {sharedData.accountabilitySeq && <div><p className="text-gray-400">Accountability Seq.</p><p className="font-semibold">{sharedData.accountabilitySeq}</p></div>}
        {sharedData.transmittalSeq && <div><p className="text-gray-400">Transmittal Seq.</p><p className="font-semibold">{sharedData.transmittalSeq}</p></div>}
      </div>

      <p className="text-xs text-center text-gray-500">Generate and print the official documents:</p>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => print('accountability')} disabled={printing === 'accountability'}
          className="flex flex-col items-center gap-2 p-4 border-2 border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-400 transition-colors">
          <Printer size={22} className="text-blue-600" />
          <span className="text-sm font-semibold text-blue-700">
            {printing === 'accountability' ? 'Generating…' : 'Accountability Form'}
          </span>
          <span className="text-xs text-gray-400">PDF with signatures</span>
        </button>
        <button onClick={() => print('transmittal')} disabled={printing === 'transmittal'}
          className="flex flex-col items-center gap-2 p-4 border-2 border-green-200 rounded-xl hover:bg-green-50 hover:border-green-400 transition-colors">
          <FileText size={22} className="text-green-600" />
          <span className="text-sm font-semibold text-green-700">
            {printing === 'transmittal' ? 'Generating…' : 'Transmittal Slip'}
          </span>
          <span className="text-xs text-gray-400">PDF with items list</span>
        </button>
      </div>

      <div className="flex justify-end pt-2 border-t border-gray-200">
        <Button variant="primary" onClick={onClose}>Done</Button>
      </div>
    </div>
  );
};

// ── Main Form ─────────────────────────────────────────────────────────────────
const EMPTY_LINE = () => ({ inventoryItemId: '', quantity: 1, serialNumber: '', assignedTo: '', location: '', warranty: '', warrantyValue: '', warrantyUnit: 'Year/s' });

const AssetForm = ({ onClose, onSuccess }) => {
  const { inventory, deployAsset } = useWMS();

  const availableItems = useMemo(() =>
    inventory.filter(item => item.quantity > 0),
    [inventory]
  );

  // Multiple line items — each picks a different inventory item
  const [lines, setLines] = useState([EMPTY_LINE()]);

  const [sharedData, setSharedData] = useState({
    poNumber:         '',
    prNumber:         '',
    jorNumber:        '',
    accountabilitySeq:'',
    transmittalSeq:   '',
    status:           'In Progress',
    purchaseDate:     new Date().toISOString().split('T')[0],
    assignedTo:       '',
    location:         '',
  });

  const [loading,        setLoading]        = useState(false);
  const [confirmStep,    setConfirmStep]    = useState(false); // confirmation screen
  const [deployedAssets, setDeployedAssets] = useState(null); // success state

  const handleSharedChange = (e) => {
    const { name, value } = e.target;
    setSharedData(prev => ({ ...prev, [name]: value }));
  };

  const addLine = () => setLines(prev => [...prev, EMPTY_LINE()]);
  const removeLine = (i) => setLines(prev => prev.filter((_, idx) => idx !== i));

  const updateLine = (i, field, value) => {
    setLines(prev => {
      const updated = [...prev];
      updated[i] = { ...updated[i], [field]: value };
      // Reset quantity when item changes
      if (field === 'inventoryItemId') updated[i].quantity = 1;
      return updated;
    });
  };

  const getItem = (id) => inventory.find(inv => inv.id === id) || null;

  const getAvailableAssetTags = (id) => {
    const item = getItem(id);
    if (!item) return [];
    // If item has no asset tag (item_code is N/A or blank), return empty
    if (!item.item_code || item.item_code === 'N/A') return [];
    let tags = item.asset_tags;
    if (!tags) return [];
    if (typeof tags === 'string') {
      try { tags = JSON.parse(tags); } catch { return []; }
    }
    if (Array.isArray(tags)) return tags.filter(t => t && t !== 'N/A');
    if (typeof tags === 'object') return Object.values(tags).filter(t => t && t !== 'N/A');
    return [];
  };

  const getMaxQty = (id) => getItem(id)?.quantity || 1;

  const handleConfirm = () => {
    const validLines = lines.filter(l => l.inventoryItemId);
    if (validLines.length === 0) { alert('Please select at least one inventory item.'); return; }
    setConfirmStep(true);
  };

  const handleSubmit = async () => {
    const validLines = lines.filter(l => l.inventoryItemId);

    setConfirmStep(false);
    setLoading(true);

    try {
      // Build all deploy calls up front, then run in parallel per inventory item
      const deployPromises = validLines.map(async (line) => {
        const item = getItem(line.inventoryItemId);
        if (!item) return [];
        const unitPrice = item.unit_price || item.unitPrice || 0;
        const assetTags = getAvailableAssetTags(line.inventoryItemId);
        const qty = Math.max(1, Math.min(line.quantity, item.quantity));

        // Build payload for each unit, then fire ONE deployAsset call (internally uses Promise.all)
        // Pass the first asset tag as inventoryAssetTag — service uses it as asset_id
        // For qty > 1, pass assetTags array via inventoryAssetTags so service assigns one per unit
        const inventoryAssetTag = assetTags[0] || '';

        const result = await deployAsset({
          inventoryItemId:   line.inventoryItemId,
          quantity:          qty,
          description:       item.description,
          category:          item.category,
          purchasePrice:     unitPrice,
          poNumber:          sharedData.poNumber,
          prNumber:          sharedData.prNumber,
          jorNumber:         sharedData.jorNumber,
          accountabilitySeq: sharedData.accountabilitySeq,
          transmittalSeq:    sharedData.transmittalSeq,
          serialNumber:      line.serialNumber || '',
          assignedTo:        line.assignedTo || sharedData.assignedTo,
          location:          line.location || sharedData.location,
          status:            sharedData.status,
          purchaseDate:      sharedData.purchaseDate,
          warranty:          line.warrantyValue ? `${line.warrantyValue} ${line.warrantyUnit}` : '',
          inventoryAssetTag,
          inventoryAssetTags: assetTags, // pass full array for per-unit ID assignment
        });

        if (!result) return [];
        return Array.isArray(result) ? result : [result];
      });

      // Run all line deployments in parallel
      const results = await Promise.all(deployPromises);
      const allDeployed = results.flat();

      if (allDeployed.length > 0) {
        setDeployedAssets(allDeployed);
        onSuccess?.(allDeployed);
      } else {
        alert('Failed to deploy assets. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Error deploying assets');
    } finally {
      setLoading(false);
    }
  };

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const lbl = 'block text-xs font-medium text-gray-600 mb-1';

  // Show confirmation step
  if (confirmStep && !deployedAssets) {
    return (
      <ConfirmationStep
        lines={lines}
        sharedData={sharedData}
        getItem={getItem}
        getAvailableAssetTags={getAvailableAssetTags}
        onConfirm={handleSubmit}
        onBack={() => setConfirmStep(false)}
        loading={loading}
      />
    );
  }

  // Show success modal after deploy
  if (deployedAssets) {
    return (
      <SuccessModal
        deployedAssets={deployedAssets}
        sharedData={sharedData}
        onClose={onClose}
      />
    );
  }

  return (
    <form onSubmit={e => { e.preventDefault(); handleConfirm(); }} className="space-y-5">

      {/* ── Reference Numbers ── */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reference Numbers</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>PO Number</label>
            <input type="text" name="poNumber" value={sharedData.poNumber} onChange={handleSharedChange}
              placeholder="e.g. PO-2025-001" className={inp} /></div>
          <div><label className={lbl}>PR Number</label>
            <input type="text" name="prNumber" value={sharedData.prNumber} onChange={handleSharedChange}
              placeholder="e.g. PR-2025-001" className={inp} /></div>
          <div><label className={lbl}>JOR Number</label>
            <input type="text" name="jorNumber" value={sharedData.jorNumber} onChange={handleSharedChange}
              placeholder="e.g. JOR-2025-001" className={inp} /></div>
          <div><label className={lbl}>Accountability Seq. No.</label>
            <input type="text" name="accountabilitySeq" value={sharedData.accountabilitySeq} onChange={handleSharedChange}
              placeholder="e.g. ACC-001" className={inp} /></div>
          <div><label className={lbl}>Transmittal Seq. No.</label>
            <input type="text" name="transmittalSeq" value={sharedData.transmittalSeq} onChange={handleSharedChange}
              placeholder="e.g. TRS-001" className={inp} /></div>
        </div>
      </div>

      {/* ── Deployment Details ── */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Deployment Details</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Status <span className="text-red-500">*</span></label>
            <select name="status" value={sharedData.status} onChange={handleSharedChange} required className={inp}>
              <option value="In Progress">In Progress</option>
              <option value="Deployed">Deployed</option>
              <option value="For Delivery">For Delivery</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select></div>
          <div><label className={lbl}>Deployment Date <span className="text-red-500">*</span></label>
            <input type="date" name="purchaseDate" value={sharedData.purchaseDate} onChange={handleSharedChange}
              required className={inp} /></div>
          <div><label className={lbl}>Default Assigned To</label>
            <input type="text" name="assignedTo" value={sharedData.assignedTo} onChange={handleSharedChange}
              placeholder="Employee name" className={inp} /></div>
          <div><label className={lbl}>Default Location</label>
            <input type="text" name="location" value={sharedData.location} onChange={handleSharedChange}
              placeholder="e.g. Office 3F" className={inp} /></div>

        </div>
      </div>

      {/* ── Item Lines ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Inventory Items to Deploy</p>
          <button type="button" onClick={addLine}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 text-white text-xs font-medium rounded-lg hover:bg-blue-800 transition-colors">
            <Plus size={13} /> Add Item
          </button>
        </div>

        {availableItems.length === 0 ? (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle size={16} className="text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-700">No items with available stock. Add inventory first.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lines.map((line, i) => {
              const item = getItem(line.inventoryItemId);
              const tags = getAvailableAssetTags(line.inventoryItemId);
              const maxQty = item ? item.quantity : 1;

              return (
                <div key={i} className="p-4 border border-gray-200 rounded-xl bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Item {i + 1}</span>
                    {lines.length > 1 && (
                      <button type="button" onClick={() => removeLine(i)}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Inventory selector */}
                  <div>
                    <label className={lbl}>Inventory Item <span className="text-red-500">*</span></label>
                    <select value={line.inventoryItemId}
                      onChange={e => updateLine(i, 'inventoryItemId', e.target.value)}
                      className={inp}>
                      <option value="">— Choose an item —</option>
                      {availableItems.map(inv => (
                        <option key={inv.id} value={inv.id}>
                          [{inv.item_code}] {inv.description} ({inv.category}) — {inv.quantity} available
                        </option>
                      ))}
                    </select>
                  </div>

                  {item && (
                    <>
                      {/* Item summary */}
                      <div className="grid grid-cols-3 gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs">
                        <div><p className="text-blue-500 font-medium uppercase">Category</p>
                          <p className="font-semibold text-gray-800">{item.category}</p></div>
                        <div><p className="text-blue-500 font-medium uppercase">Available</p>
                          <p className="font-semibold text-gray-800">{item.quantity} {item.unit}</p></div>
                        <div><p className="text-blue-500 font-medium uppercase">Unit Price</p>
                          <p className="font-semibold text-gray-800">&#8369;{(item.unit_price || 0).toLocaleString()}</p></div>
                      </div>

                      {/* Asset tags from inventory */}
                      <div className={`flex items-center gap-2 p-2 border rounded-lg ${tags.length > 0 ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-200'}`}>
                        <Tag size={13} className={tags.length > 0 ? 'text-green-600 flex-shrink-0' : 'text-gray-400 flex-shrink-0'} />
                        <div className="text-xs">
                          {tags.length > 0 ? (
                            <>
                              <p className="font-semibold text-green-700">Inventory Asset Tags:</p>
                              <p className="text-green-600 font-mono">{tags.slice(0, 5).join(', ')}{tags.length > 5 ? ` +${tags.length - 5} more` : ''}</p>
                            </>
                          ) : (
                            <>
                              <p className="font-semibold text-gray-500">No Asset Tags</p>
                              <p className="text-gray-400">Asset ID will show as N/A, no QR generated</p>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Per-line fields */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Quantity stepper */}
                        <div>
                          <label className={lbl}>Qty to Deploy <span className="text-xs text-gray-400">max {maxQty}</span></label>
                          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                            <button type="button"
                              onClick={() => updateLine(i, 'quantity', Math.max(1, line.quantity - 1))}
                              className="px-3 py-2 text-gray-600 hover:bg-gray-100 text-lg font-medium">-</button>
                            <input type="number" value={line.quantity} min={1} max={maxQty}
                              onChange={e => updateLine(i, 'quantity', Math.max(1, Math.min(parseInt(e.target.value) || 1, maxQty)))}
                              className="w-14 text-center py-2 border-x border-gray-300 focus:outline-none font-semibold text-gray-800 text-sm" />
                            <button type="button"
                              onClick={() => updateLine(i, 'quantity', Math.min(maxQty, line.quantity + 1))}
                              className="px-3 py-2 text-gray-600 hover:bg-gray-100 text-lg font-medium">+</button>
                          </div>
                        </div>
                        <div><label className={lbl}>Serial Number</label>
                          <input type="text" value={line.serialNumber}
                            onChange={e => updateLine(i, 'serialNumber', e.target.value)}
                            placeholder="SN-xxxxx" className={inp} /></div>
                        <div><label className={lbl}>Assigned To <span className="text-xs text-gray-400">(overrides default)</span></label>
                          <input type="text" value={line.assignedTo}
                            onChange={e => updateLine(i, 'assignedTo', e.target.value)}
                            placeholder={sharedData.assignedTo || 'Employee name'} className={inp} /></div>
                        <div><label className={lbl}>Location <span className="text-xs text-gray-400">(overrides default)</span></label>
                          <input type="text" value={line.location}
                            onChange={e => updateLine(i, 'location', e.target.value)}
                            placeholder={sharedData.location || 'Location'} className={inp} /></div>
                        <div>
                          <label className={lbl}>Warranty</label>
                          <div className="flex gap-1.5">
                            <input type="number" min="0" value={line.warrantyValue || ''}
                              onChange={e => updateLine(i, 'warrantyValue', e.target.value)}
                              placeholder="e.g. 1" className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <select value={line.warrantyUnit || 'Year/s'}
                              onChange={e => updateLine(i, 'warrantyUnit', e.target.value)}
                              className="flex-1 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                              <option>Days</option>
                              <option>Weeks</option>
                              <option>Months</option>
                              <option>Year/s</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Stock bar */}
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${(line.quantity / maxQty) * 100}%` }} />
                      </div>
                      <p className="text-xs text-gray-400">
                        Deploying {line.quantity} — Remaining after: {maxQty - line.quantity} {item.unit}
                      </p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      {lines.some(l => l.inventoryItemId) && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Package size={15} className="text-green-600 mt-0.5 shrink-0" />
          <p className="text-sm text-green-800">
            Deploying{' '}
            <strong>{lines.filter(l => l.inventoryItemId).reduce((s, l) => s + l.quantity, 0)} asset record(s)</strong>
            {' '}across <strong>{lines.filter(l => l.inventoryItemId).length} item type(s)</strong>.
            QR codes will be taken from inventory asset tags where available.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="purple" disabled={loading || !lines.some(l => l.inventoryItemId)}>
          {loading ? 'Deploying…' : `Deploy ${lines.filter(l => l.inventoryItemId).reduce((s, l) => s + l.quantity, 0)} Asset(s)`}
        </Button>
      </div>
    </form>
  );
};

export default AssetForm;