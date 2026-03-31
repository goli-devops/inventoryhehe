import React, { useState, useMemo } from 'react';
import {
  Plus, Filter, Package, Eye, Edit, Trash2,
  ChevronLeft, ChevronRight, X, FileSpreadsheet, Download, Search,
  AlertTriangle, AlertCircle, ShieldAlert, FileText, Square, CheckSquare
} from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import InventoryForm from './InventoryForm';
import InventoryDetails from './InventoryDetails';
import InventoryEditForm from './InventoryEditForm';
import InventoryAuditLog from './InventoryAuditLog';
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
    ['Item Code', 'Description', 'Category', 'Quantity', 'Unit', 'Unit Price', 'Total Value',
     'Min Stock', 'Max Stock', 'Location', 'Supplier', 'Status', 'Date Added'],
    ...rows.map(i => [
      i.item_code || i.itemCode || '',
      i.description || '',
      i.category || '',
      i.quantity ?? 0,
      i.unit || '',
      i.unit_price || i.unitPrice || 0,
      (i.quantity ?? 0) * (i.unit_price || i.unitPrice || 0),
      i.min_stock_level ?? i.minStockLevel ?? 0,
      i.max_stock_level ?? i.maxStockLevel ?? 0,
      i.location || '',
      i.supplier || '',
      i.status || '',
      i.created_at ? new Date(i.created_at).toLocaleDateString() : '',
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
  XLSX.writeFile(wb, `Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
};

const exportToPDF = async (rows) => {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(16);
  doc.text('GOLI ICT — Inventory', 14, 15);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}  |  Total items: ${rows.length}`, 14, 22);

  doc.autoTable({
    startY: 27,
    head: [['Item Code', 'Description', 'Category', 'Qty', 'Unit', 'Unit Price', 'Location', 'Supplier', 'Status']],
    body: rows.map(i => [
      i.item_code || i.itemCode || '',
      i.description || '',
      i.category || '',
      i.quantity ?? 0,
      i.unit || '',
      `₱${(i.unit_price || i.unitPrice || 0).toLocaleString()}`,
      i.location || '',
      i.supplier || '',
      i.status || '',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 58, 138] },
    alternateRowStyles: { fillColor: [239, 246, 255] },
    didParseCell: (data) => {
      if (data.column.index === 8 && data.section === 'body') {
        const status = data.cell.raw;
        if (status === 'Out of Stock') data.cell.styles.textColor = [220, 38, 38];
        else if (status === 'Low Stock') data.cell.styles.textColor = [234, 88, 12];
        else data.cell.styles.textColor = [22, 163, 74];
      }
    },
  });

  doc.save(`Inventory_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
const DeleteConfirmModal = ({ item, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  const [error,  setError]  = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) { setError('Please provide a reason for deletion.'); return; }
    onConfirm(reason.trim());
  };

  if (!item) return null;
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
        <Trash2 size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-700">You are about to delete an Inventory Item</p>
          <p className="text-sm text-red-600 mt-0.5">This action cannot be undone. The record will be permanently removed but logged in the Deletion Audit Trail.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm">
        <div>
          <p className="text-xs text-gray-400">Item Code</p>
          <p className="font-semibold text-gray-800">{item.item_code || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Category</p>
          <p className="font-semibold text-gray-800">{item.category || '—'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-gray-400">Description</p>
          <p className="font-medium text-gray-700">{item.description || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Quantity</p>
          <p className="font-medium text-gray-700">{item.quantity ?? 0} {item.unit}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Status</p>
          <p className="font-medium text-gray-700">{item.status || '—'}</p>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Reason for Deletion <span className="text-red-500">*</span>
        </label>
        <textarea value={reason} onChange={e => { setReason(e.target.value); setError(''); }} rows={3}
          placeholder="e.g. Item disposed, duplicate entry, damaged beyond use…"
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none ${error ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
        <button onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button onClick={handleConfirm}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
          <Trash2 size={14} />
          Confirm Delete
        </button>
      </div>
    </div>
  );
};

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    'In Stock':     'bg-green-100 text-green-700',
    'Low Stock':    'bg-orange-100 text-orange-700',
    'Out of Stock': 'bg-red-100 text-red-700',
  };
  const icons = {
    'Low Stock':    <AlertTriangle size={11} className="inline mr-1" />,
    'Out of Stock': <AlertCircle   size={11} className="inline mr-1" />,
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {icons[status]}{status || '—'}
    </span>
  );
};

// ─── Filter Panel ─────────────────────────────────────────────────────────────
const FilterPanel = ({ filters, onChange, onReset, categories }) => {
  const inp = 'w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const lbl = 'block text-xs font-medium text-gray-500 mb-1';
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Filters</p>
        <button onClick={onReset} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
          <X size={11} /> Reset all
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className={lbl}>Item Code</label>
          <input type="text" value={filters.itemCode} onChange={e => onChange('itemCode', e.target.value)}
            placeholder="Search code" className={inp} />
        </div>
        <div>
          <label className={lbl}>Category</label>
          <select value={filters.category} onChange={e => onChange('category', e.target.value)} className={inp}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Supplier</label>
          <input type="text" value={filters.supplier} onChange={e => onChange('supplier', e.target.value)}
            placeholder="Search supplier" className={inp} />
        </div>
        <div>
          <label className={lbl}>Status</label>
          <select value={filters.status} onChange={e => onChange('status', e.target.value)} className={inp}>
            <option value="">All</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Date Added From</label>
          <input type="date" value={filters.dateFrom} onChange={e => onChange('dateFrom', e.target.value)} className={inp} />
        </div>
        <div>
          <label className={lbl}>Date Added To</label>
          <input type="date" value={filters.dateTo} onChange={e => onChange('dateTo', e.target.value)} className={inp} />
        </div>
      </div>
    </div>
  );
};

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const EMPTY_FILTERS = { itemCode: '', category: '', supplier: '', status: '', dateFrom: '', dateTo: '' };

// ─── Main Component ───────────────────────────────────────────────────────────
const Inventory = () => {
  const { inventory: rawInventory, getStats, deleteInventoryItem, loading } = useWMS();
  const [operationLoading, setOperationLoading] = React.useState(null);
  const { categories } = useSettings();
  const inventory = rawInventory ?? [];
  const stats = getStats();

  const [activeTab,         setActiveTab]         = useState('list');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen,   setIsViewModalOpen]   = useState(false);
  const [isEditModalOpen,   setIsEditModalOpen]   = useState(false);
  const [selectedItem,      setSelectedItem]      = useState(null);
  const [deleteTarget,      setDeleteTarget]      = useState(null);
  const [showFilters,       setShowFilters]       = useState(false);
  const [filters,           setFilters]           = useState(EMPTY_FILTERS);
  const [search,            setSearch]            = useState('');
  const [page,              setPage]              = useState(1);
  const [pageSize,          setPageSize]          = useState(10);
  const [exporting,         setExporting]         = useState(false);
  const [selectedIds,       setSelectedIds]       = useState(new Set());

  const handleFilterChange = (key, value) => { setFilters(p => ({ ...p, [key]: value })); setPage(1); };
  const resetFilters = () => { setFilters(EMPTY_FILTERS); setSearch(''); setPage(1); };

  // ── Bulk selection helpers ──
  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginated.map(i => i.id)));
  };
  const clearSelection = () => setSelectedIds(new Set());
  const selectedItems = inventory.filter(i => selectedIds.has(i.id));

  // ── Filtering ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return inventory.filter(item => {
      const date     = item.created_at ? new Date(item.created_at) : null;
      const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
      const dateTo   = filters.dateTo   ? new Date(filters.dateTo + 'T23:59:59') : null;
      
      // Parse asset tags and serial numbers for searching
      let assetTagsStr = '';
      let serialNumbersStr = '';
      
      // Get asset tags as searchable string
      if (item.asset_tags) {
        let tags = item.asset_tags;
        if (typeof tags === 'string') {
          try { tags = JSON.parse(tags); } catch { tags = []; }
        }
        if (Array.isArray(tags)) {
          assetTagsStr = tags.filter(Boolean).join(' ');
        } else if (typeof tags === 'object') {
          assetTagsStr = Object.values(tags).filter(Boolean).join(' ');
        }
      }
      
      // Get serial numbers as searchable string
      if (item.serial_numbers) {
        let serials = item.serial_numbers;
        if (typeof serials === 'string') {
          try { serials = JSON.parse(serials); } catch { serials = []; }
        }
        if (Array.isArray(serials)) {
          serialNumbersStr = serials.filter(Boolean).join(' ');
        }
      }
      
      return (
        (!q || [item.item_code, item.description, item.category, item.supplier, item.location, assetTagsStr, serialNumbersStr]
          .some(f => (f || '').toLowerCase().includes(q))) &&
        (!filters.itemCode  || (item.item_code || '').toLowerCase().includes(filters.itemCode.toLowerCase())) &&
        (!filters.category  || item.category === filters.category) &&
        (!filters.supplier  || (item.supplier || '').toLowerCase().includes(filters.supplier.toLowerCase())) &&
        (!filters.status    || item.status === filters.status) &&
        (!dateFrom || (date && date >= dateFrom)) &&
        (!dateTo   || (date && date <= dateTo))
      );
    });
  }, [inventory, filters, search]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  const totalValue = filtered.reduce((s, i) =>
    s + (i.quantity ?? 0) * (i.unit_price || i.unitPrice || 0), 0);

  const handleView   = (item) => { setSelectedItem(item); setIsViewModalOpen(true); };
  const handleEdit   = (item) => { setSelectedItem(item); setIsEditModalOpen(true); };
  const handleDelete = (item) => setDeleteTarget(item);
  const handleDeleteConfirm = async (reason) => {
    const ok = await deleteInventoryItem(deleteTarget.id, reason);
    if (!ok) alert('Failed to delete inventory item');
    setDeleteTarget(null);
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try { await exportToExcel(filtered); }
    catch (e) { console.error(e); alert('Export failed'); }
    finally { setExporting(false); }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try { await exportToPDF(filtered); }
    catch (e) { console.error(e); alert('Export failed'); }
    finally { setExporting(false); }
  };

  return (
    <div className="space-y-4">

      {/* Module Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'list' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          <Package size={15} />
          Inventory
        </button>
        <button onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'audit' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          <ShieldAlert size={15} />
          Deletion Audit Log
        </button>
      </div>

      {/* ── Audit Log Tab ── */}
      {activeTab === 'audit' && <InventoryAuditLog />}

      {/* ── Inventory List Tab ── */}
      {activeTab === 'list' && <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Button variant="primary" icon={Plus} onClick={() => setIsCreateModalOpen(true)}>
            Add Item
          </Button>

          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter size={15} />
            Filter
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Quick search…"
              className="pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
            />
          </div>
        </div>

        {/* Export */}
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

      {/* Filter panel */}
      {showFilters && (
        <FilterPanel filters={filters} onChange={handleFilterChange} onReset={resetFilters} categories={categories} />
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="p-4">
          <p className="text-xs text-gray-500 mb-1">Total Items</p>
          <p className="text-2xl font-bold text-gray-800">{stats.totalInventoryItems}</p>
        </Card>
        <Card padding="p-4">
          <p className="text-xs text-gray-500 mb-1">Low Stock</p>
          <p className="text-2xl font-bold text-orange-600">{stats.lowStockItems}</p>
        </Card>
        <Card padding="p-4">
          <p className="text-xs text-gray-500 mb-1">Out of Stock</p>
          <p className="text-2xl font-bold text-red-600">{stats.outOfStockItems}</p>
        </Card>
        <Card padding="p-4">
          <p className="text-xs text-gray-500 mb-1">
            {filtered.length !== inventory.length ? 'Filtered Value' : 'Inventory Total Value'}
          </p>
          <p className="text-2xl font-bold text-blue-700">
            ₱{totalValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </p>
        </Card>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-900 text-white rounded-xl">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 ml-2">
            <button onClick={async () => {
              if (!window.confirm(`Delete ${selectedIds.size} selected item(s)?`)) return;
              for (const item of selectedItems) await deleteInventoryItem(item.id, 'Bulk deletion');
              clearSelection();
            }} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-xs font-medium transition-colors">
              <Trash2 size={13} /> Delete Selected
            </button>
          </div>
          <button onClick={clearSelection} className="ml-auto p-1 hover:bg-white/20 rounded-lg transition-colors"><X size={14} /></button>
        </div>
      )}

      {/* Results summary */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          Showing <strong>{paginated.length}</strong> of <strong>{filtered.length}</strong> items
          {filtered.length !== inventory.length && ` (filtered from ${inventory.length})`}
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
              {['Item Code','Description','Category','Qty','Unit','Unit Price','Location','Supplier','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="11" className="px-6 py-16 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-10 h-10">
                      <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
                    </div>
                    <p className="text-sm">Loading inventory…</p>
                  </div>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-6 py-16 text-center text-gray-400">
                    <Package size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No inventory items found</p>
                    <p className="text-sm mt-1">
                      {activeFilterCount > 0 || search ? 'Try adjusting your filters.' : 'Click "Add Item" to get started.'}
                    </p>
                  </td>
                </tr>
              ) : paginated.map(item => {
                const minStock = item.min_stock_level ?? item.minStockLevel ?? 0;
                const qtyColor = item.quantity === 0 ? 'text-red-600 font-bold'
                  : item.quantity <= minStock ? 'text-orange-600 font-semibold'
                  : 'text-gray-800';
                return (
                  <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(item.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelect(item.id)} className="text-gray-400 hover:text-blue-600">
                        {selectedIds.has(item.id) ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-blue-700 whitespace-nowrap">
                      {item.item_code || item.itemCode || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 max-w-48 truncate">
                      {item.description || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.category || '—'}</td>
                    <td className={`px-4 py-3 text-sm whitespace-nowrap ${qtyColor}`}>
                      {item.quantity ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.unit || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      ₱{(item.unit_price || item.unitPrice || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.location || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.supplier || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleView(item)} title="View"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Eye size={15} />
                        </button>
                        <button onClick={() => handleEdit(item)} title="Edit"
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                          <Edit size={15} />
                        </button>
                        <button onClick={() => handleDelete(item)} title="Delete"
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="px-2 py-1 rounded text-sm border border-gray-300 disabled:opacity-40 hover:bg-gray-50">«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                <ChevronLeft size={14} /></button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded text-sm border transition-colors ${
                      p === page ? 'bg-blue-900 text-white border-blue-900' : 'border-gray-300 hover:bg-gray-50'
                    }`}>{p}</button>
                );
              })}

              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                <ChevronRight size={14} /></button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                className="px-2 py-1 rounded text-sm border border-gray-300 disabled:opacity-40 hover:bg-gray-50">»</button>
            </div>
          </div>
        )}
      </Card>

      {/* Modals */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Add Inventory Item" size="lg">
        <InventoryForm
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => { setIsCreateModalOpen(false); }}
        />
      </Modal>

      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Inventory Item Details" size="lg">
        <InventoryDetails item={selectedItem} />
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
          <Button variant="primary" onClick={() => { setIsViewModalOpen(false); handleEdit(selectedItem); }}>Edit</Button>
        </div>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Inventory Item" size="lg">
        {selectedItem && (
          <InventoryEditForm item={selectedItem} onClose={() => setIsEditModalOpen(false)} onSuccess={() => {}} />
        )}
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Inventory Item" size="md">
        <DeleteConfirmModal
          item={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      </Modal>
      </div>} {/* end activeTab === 'list' */}
    </div>
  );
};

export default Inventory;