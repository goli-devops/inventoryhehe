import React, { useState, useMemo } from 'react';
import {
  Package, AlertCircle, Plus, Trash2, ChevronDown, ChevronUp,
  Tag, FileText, Printer, CheckCircle2
} from 'lucide-react';
import Button from '../../components/common/Button';
import { useWMS } from '../../context/WMSContext';

// ── PDF helpers ───────────────────────────────────────────────────────────────
const loadScript = (src) => new Promise((res, rej) => {
  if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
  const s = document.createElement('script');
  s.src = src; s.onload = res; s.onerror = rej;
  document.head.appendChild(s);
});

const printAccountabilityForm = async (deployedAssets, sharedData) => {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  doc.setFontSize(14); doc.setFont(undefined, 'bold');
  doc.text('PROPERTY ACCOUNTABILITY FORM', 105, 18, { align: 'center' });
  doc.setFontSize(9); doc.setFont(undefined, 'normal');
  doc.text('GOLI – ICT Warehouse Management System', 105, 24, { align: 'center' });

  doc.setFontSize(9);
  const meta = [
    ['Accountability Seq. No.:', sharedData.accountabilitySeq || ''],
    ['PO Number:', sharedData.poNumber || ''],
    ['PR Number:', sharedData.prNumber || ''],
    ['JOR Number:', sharedData.jorNumber || ''],
    ['Date:', today],
    ['Location:', sharedData.location || ''],
    ['Assigned To:', sharedData.assignedTo || ''],
  ];
  let y = 33;
  meta.forEach(([k, v]) => {
    doc.setFont(undefined, 'bold'); doc.text(k, 14, y);
    doc.setFont(undefined, 'normal'); doc.text(v, 65, y);
    y += 6;
  });

  doc.autoTable({
    startY: y + 4,
    head: [['#', 'Asset ID', 'Description', 'Category', 'Serial No.', 'Inv. Asset Tag', 'Status']],
    body: deployedAssets.map((a, i) => [
      i + 1,
      a.asset_id || '',
      a.description || '',
      a.category || '',
      a.serial_number || '',
      a.inventory_asset_tag || '',
      a.status || '',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 58, 138] },
  });

  const finalY = doc.lastAutoTable.finalY + 16;
  doc.setFontSize(9);
  doc.text('Received by:', 14, finalY);
  doc.line(14, finalY + 14, 90, finalY + 14);
  doc.text('Signature over Printed Name / Date', 14, finalY + 19);
  doc.text('Issued by:', 110, finalY);
  doc.line(110, finalY + 14, 196, finalY + 14);
  doc.text('ICT Officer / Date', 110, finalY + 19);

  doc.save(`Accountability_Form_${sharedData.accountabilitySeq || Date.now()}.pdf`);
};

const printTransmittalSlip = async (deployedAssets, sharedData) => {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  doc.setFontSize(14); doc.setFont(undefined, 'bold');
  doc.text('TRANSMITTAL SLIP', 105, 18, { align: 'center' });
  doc.setFontSize(9); doc.setFont(undefined, 'normal');
  doc.text('GOLI – ICT Warehouse Management System', 105, 24, { align: 'center' });

  doc.setFontSize(9);
  const meta = [
    ['Transmittal Seq. No.:', sharedData.transmittalSeq || ''],
    ['PO Number:', sharedData.poNumber || ''],
    ['PR Number:', sharedData.prNumber || ''],
    ['JOR Number:', sharedData.jorNumber || ''],
    ['Date:', today],
    ['Destination:', sharedData.location || ''],
    ['Recipient:', sharedData.assignedTo || ''],
  ];
  let y = 33;
  meta.forEach(([k, v]) => {
    doc.setFont(undefined, 'bold'); doc.text(k, 14, y);
    doc.setFont(undefined, 'normal'); doc.text(v, 65, y);
    y += 6;
  });

  doc.autoTable({
    startY: y + 4,
    head: [['#', 'Asset ID', 'Description', 'Category', 'Serial No.', 'Inv. Asset Tag', 'Qty', 'Price']],
    body: deployedAssets.map((a, i) => [
      i + 1,
      a.asset_id || '',
      a.description || '',
      a.category || '',
      a.serial_number || '',
      a.inventory_asset_tag || '',
      1,
      `P${parseFloat(a.purchase_price || 0).toFixed(2)}`,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [5, 150, 105] },
  });

  const finalY = doc.lastAutoTable.finalY + 16;
  doc.setFontSize(9);
  doc.text('Received by:', 14, finalY);
  doc.line(14, finalY + 14, 90, finalY + 14);
  doc.text('Signature over Printed Name / Date', 14, finalY + 19);
  doc.text('Released by:', 110, finalY);
  doc.line(110, finalY + 14, 196, finalY + 14);
  doc.text('ICT Officer / Date', 110, finalY + 19);

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
                      : <span className="text-gray-300 italic">No tags</span>}
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
            {deployedAssets.map(a => a.asset_id).join(', ')}
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
const EMPTY_LINE = () => ({ inventoryItemId: '', quantity: 1, serialNumber: '', assignedTo: '', location: '' });

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
    status:           'In Use',
    purchaseDate:     new Date().toISOString().split('T')[0],
    assignedTo:       '',
    location:         '',
    warranty:         '',
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
    const tags = Array.isArray(item.asset_tags) ? item.asset_tags
      : (item.asset_tags && typeof item.asset_tags === 'object') ? Object.values(item.asset_tags)
      : [];
    return tags.filter(Boolean);
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
    const allDeployed = [];

    try {
      for (const line of validLines) {
        const item = getItem(line.inventoryItemId);
        if (!item) continue;
        const unitPrice = item.unit_price || item.unitPrice || 0;
        const assetTags = getAvailableAssetTags(line.inventoryItemId);
        const qty = Math.max(1, Math.min(line.quantity, item.quantity));

        for (let i = 0; i < qty; i++) {
          const inventoryAssetTag = assetTags[i] || '';
          // Build QR payload matching inventory QR format
          const inventoryQrCode = inventoryAssetTag ? [
            '== GOLI ICT INVENTORY ==',
            `Item Code : ${item.item_code || ''}`,
            `Asset Tag : ${inventoryAssetTag}`,
            `Item      : ${item.description || ''}`,
            `Category  : ${item.category || ''}`,
            `Location  : ${item.location || ''}`,
            '========================',
          ].join('\n') : null;

          const result = await deployAsset({
            inventoryItemId:  line.inventoryItemId,
            quantity:         1,
            description:      item.description,
            category:         item.category,
            purchasePrice:    unitPrice,
            poNumber:         sharedData.poNumber,
            prNumber:         sharedData.prNumber,
            jorNumber:        sharedData.jorNumber,
            accountabilitySeq:sharedData.accountabilitySeq,
            transmittalSeq:   sharedData.transmittalSeq,
            serialNumber:     line.serialNumber || '',
            assignedTo:       line.assignedTo || sharedData.assignedTo,
            location:         line.location  || sharedData.location,
            status:           sharedData.status,
            purchaseDate:     sharedData.purchaseDate,
            warranty:         sharedData.warranty,
            inventoryAssetTag,
            inventoryQrCode,
          });

          if (result) {
            const created = Array.isArray(result) ? result : [result];
            allDeployed.push(...created);
          }
        }
      }

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
              <option value="In Use">In Use</option>
              <option value="Available">Available</option>
              <option value="Maintenance">Maintenance</option>
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
          <div className="col-span-2"><label className={lbl}>Warranty</label>
            <input type="text" name="warranty" value={sharedData.warranty} onChange={handleSharedChange}
              placeholder="e.g. 3 years" className={inp} /></div>
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
                      {tags.length > 0 && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-100 rounded-lg">
                          <Tag size={13} className="text-green-600 flex-shrink-0" />
                          <div className="text-xs">
                            <p className="font-semibold text-green-700">Inventory Asset Tags:</p>
                            <p className="text-green-600 font-mono">{tags.slice(0, 5).join(', ')}{tags.length > 5 ? ` +${tags.length - 5} more` : ''}</p>
                          </div>
                        </div>
                      )}

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