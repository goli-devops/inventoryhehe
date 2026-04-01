import React, { useState, useMemo, useRef } from 'react';
import {
  Plus, Filter, Download, FileText, Eye, Edit, Trash2,
  ChevronLeft, ChevronRight, X, FileSpreadsheet, Search, ShieldAlert, Square, CheckSquare
} from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import PRForm from './PRForm';
import PRDetails from './PRDetails';
import PREditForm from './PREditForm';
import PRAuditLog from './PRAuditLog';
import { useWMS } from '../../context/WMSContext';
import { useSettings } from '../../context/SettingsContext';
import usePreventDoubleSubmit from '../../utils/usePreventDoubleSubmit';

// ─── Export helpers (CDN-loaded, no npm) ─────────────────────────────────────
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
    ['PR Number', 'Date', 'Department', 'Requested By', 'Supplier', 'Company', 'Contact Person', 'Terms', 'Items', 'Est. Total', 'Status'],
    ...rows.map(pr => [
      pr.pr_number || pr.prNumber || '',
      pr.created_at ? new Date(pr.created_at).toLocaleDateString() : '',
      pr.department || '',
      pr.requested_by || pr.requestedBy || '',
      pr.supplier || '',
      pr.company_name || pr.companyName || '',
      pr.contact_person || pr.contactPerson || '',
      pr.terms || '',
      (pr.items || []).length,
      (pr.items || []).reduce((s, i) => s + (parseFloat(i.estimatedPrice) || 0) * (parseInt(i.quantity) || 1), 0),
      pr.status || '',
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Purchase Requests');
  XLSX.writeFile(wb, `PurchaseRequests_${new Date().toISOString().split('T')[0]}.xlsx`);
};

const exportToPDF = async (rows) => {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(16);
  doc.text('GOLI ICT — Purchase Requests', 14, 15);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

  doc.autoTable({
    startY: 27,
    head: [['PR Number', 'Date', 'Department', 'Supplier', 'Company', 'Terms', 'Items', 'Status']],
    body: rows.map(pr => [
      pr.pr_number || pr.prNumber || '',
      pr.created_at ? new Date(pr.created_at).toLocaleDateString() : '',
      pr.department || '',
      pr.supplier || '',
      pr.company_name || pr.companyName || '',
      pr.terms || '',
      (pr.items || []).length,
      pr.status || '',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 58, 138] },
    alternateRowStyles: { fillColor: [239, 246, 255] },
  });

  doc.save(`PurchaseRequests_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
const DeleteConfirmModal = ({ pr, onConfirm, onCancel, isProcessing }) => {
  const [reason, setReason] = useState('');
  const [error,  setError]  = useState('');

  const handleConfirm = () => {
    if (isProcessing) return; // Prevent double submission
    if (!reason.trim()) { setError('Please provide a reason for deletion.'); return; }
    onConfirm(reason.trim());
  };

  if (!pr) return null;
  return (
    <div className="space-y-5">
      {/* Warning banner */}
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
        <Trash2 size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-700">You are about to delete a Purchase Request</p>
          <p className="text-sm text-red-600 mt-0.5">
            This action cannot be undone. The record will be permanently removed but logged in the Deletion Audit Trail.
          </p>
        </div>
      </div>

      {/* PR summary */}
      <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm">
        <div>
          <p className="text-xs text-gray-400">PR Number</p>
          <p className="font-semibold text-gray-800">{pr.pr_number || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">JOR Number</p>
          <p className="font-semibold text-gray-800">{pr.jor_number || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Requester's Name</p>
          <p className="font-medium text-gray-700">{pr.requested_by || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Status</p>
          <p className="font-medium text-gray-700">{pr.status || '—'}</p>
        </div>
      </div>

      {/* Reason input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Reason for Deletion <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={e => { setReason(e.target.value); setError(''); }}
          rows={3}
          placeholder="e.g. Duplicate entry, incorrect items, cancelled by requester…"
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none ${
            error ? 'border-red-400 bg-red-50' : 'border-gray-300'
          }`}
        />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
        <button onClick={onCancel} disabled={isProcessing}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
          Cancel
        </button>
        <button onClick={handleConfirm} disabled={isProcessing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
          <Trash2 size={14} />
          {isProcessing ? 'Deleting...' : 'Confirm Delete'}
        </button>
      </div>
    </div>
  );
};


const StatusBadge = ({ status }) => {
  const map = {
    Submitted:    'bg-blue-100 text-blue-800',
    Approved:     'bg-green-100 text-green-800',
    'For Canvass':'bg-yellow-100 text-yellow-800',
    Cancelled:    'bg-red-100 text-red-800',
    Completed:    'bg-purple-100 text-purple-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status || 'Unknown'}
    </span>
  );
};

// ─── Filter Panel ─────────────────────────────────────────────────────────────
const FilterPanel = ({ filters, onChange, onReset, departments }) => {
  const statuses = ['Submitted', 'Approved', 'For Canvass', 'Cancelled', 'Completed'];
  const inp = 'w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const lbl = 'block text-xs font-medium text-gray-500 mb-1';

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Filters</p>
        <button onClick={onReset} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
          <X size={11} /> Reset all
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className={lbl}>PR Number</label>
          <input type="text" value={filters.prNumber} onChange={e => onChange('prNumber', e.target.value)}
            placeholder="Search PR#" className={inp} />
        </div>
        <div>
          <label className={lbl}>JOR Number</label>
          <input type="text" value={filters.jorNumber} onChange={e => onChange('jorNumber', e.target.value)}
            placeholder="Search JOR#" className={inp} />
        </div>
        <div>
          <label className={lbl}>Department</label>
          <select value={filters.department} onChange={e => onChange('department', e.target.value)} className={inp}>
            <option value="">All</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Status</label>
          <select value={filters.status} onChange={e => onChange('status', e.target.value)} className={inp}>
            <option value="">All</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Supplier</label>
          <input type="text" value={filters.supplier} onChange={e => onChange('supplier', e.target.value)}
            placeholder="Search supplier" className={inp} />
        </div>
        <div>
          <label className={lbl}>Company</label>
          <input type="text" value={filters.company} onChange={e => onChange('company', e.target.value)}
            placeholder="Search company" className={inp} />
        </div>
        <div>
          <label className={lbl}>Contact Person</label>
          <input type="text" value={filters.contactPerson} onChange={e => onChange('contactPerson', e.target.value)}
            placeholder="Search contact" className={inp} />
        </div>
        <div>
          <label className={lbl}>Payment Terms</label>
          <select value={filters.terms} onChange={e => onChange('terms', e.target.value)} className={inp}>
            <option value="">All</option>
            {['Cash on Delivery','Net 15','Net 30','Net 60','50% Down Payment','Full Payment in Advance'].map(t =>
              <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Date From</label>
          <input type="date" value={filters.dateFrom} onChange={e => onChange('dateFrom', e.target.value)} className={inp} />
        </div>
        <div>
          <label className={lbl}>Date To</label>
          <input type="date" value={filters.dateTo} onChange={e => onChange('dateTo', e.target.value)} className={inp} />
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const EMPTY_FILTERS = {
  prNumber: '', jorNumber: '', department: '', status: '', supplier: '',
  company: '', contactPerson: '', terms: '', dateFrom: '', dateTo: '',
};

const PurchaseRequests = () => {
  const { purchaseRequests, deletePR, loading } = useWMS();
  const { departments } = useSettings();
  const [isProcessing, withProcessing] = usePreventDoubleSubmit();
  const prs = purchaseRequests ?? [];

  const [activeTab,         setActiveTab]         = useState('list');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen,   setIsViewModalOpen]   = useState(false);
  const [isEditModalOpen,   setIsEditModalOpen]   = useState(false);
  const [selectedPR,        setSelectedPR]        = useState(null);
  const [deleteTarget,      setDeleteTarget]      = useState(null);
  const [showFilters,       setShowFilters]       = useState(false);
  const [filters,           setFilters]           = useState(EMPTY_FILTERS);
  const [search,            setSearch]            = useState('');
  const [page,              setPage]              = useState(1);
  const [pageSize,          setPageSize]          = useState(10);
  const [exporting,         setExporting]         = useState(false);
  const [selectedIds,       setSelectedIds]       = useState(new Set());

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };
  const resetFilters = () => { setFilters(EMPTY_FILTERS); setSearch(''); setPage(1); };

  // ── Bulk selection helpers ──
  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginated.map(pr => pr.id)));
  };
  const clearSelection = () => setSelectedIds(new Set());
  const selectedPRs = prs.filter(pr => selectedIds.has(pr.id));

  // ── Filtering ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return prs.filter(pr => {
      const date = pr.created_at ? new Date(pr.created_at) : null;
      const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
      const dateTo   = filters.dateTo   ? new Date(filters.dateTo + 'T23:59:59') : null;

      return (
        (!q || [pr.pr_number, pr.jor_number, pr.department, pr.supplier, pr.company_name, pr.contact_person, pr.requested_by]
          .some(f => String(f || '').toLowerCase().includes(q))) &&
        (!filters.prNumber      || String(pr.pr_number  || '').toLowerCase().includes(filters.prNumber.toLowerCase())) &&
        (!filters.jorNumber     || String(pr.jor_number || '').toLowerCase().includes(filters.jorNumber.toLowerCase())) &&
        (!filters.department    || pr.department === filters.department) &&
        (!filters.status        || pr.status === filters.status) &&
        (!filters.supplier      || String(pr.supplier      || '').toLowerCase().includes(filters.supplier.toLowerCase())) &&
        (!filters.company       || String(pr.company_name  || '').toLowerCase().includes(filters.company.toLowerCase())) &&
        (!filters.contactPerson || String(pr.contact_person|| '').toLowerCase().includes(filters.contactPerson.toLowerCase())) &&
        (!filters.terms         || pr.terms === filters.terms) &&
        (!dateFrom || (date && date >= dateFrom)) &&
        (!dateTo   || (date && date <= dateTo))
      );
    });
  }, [prs, filters, search]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleView   = (pr) => { setSelectedPR(pr); setIsViewModalOpen(true); };
  const handleEdit   = (pr) => { setSelectedPR(pr); setIsEditModalOpen(true); };
  const handleDelete = (pr) => {
    if (isProcessing) return; // Prevent opening modal if already processing
    setDeleteTarget(pr);
  };
  const handleDeleteConfirm = async (reason) => {
    if (isProcessing) return; // Prevent double submission
    
    await withProcessing(async () => {
      const ok = await deletePR(deleteTarget.id, reason);
      if (!ok) alert('Failed to delete Purchase Request');
      setDeleteTarget(null);
    });
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
            activeTab === 'list'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          <FileText size={15} />
          Purchase Requests
        </button>
        <button onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'audit'
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          <ShieldAlert size={15} />
          PR Deletion Audit Log
        </button>
      </div>

      {/* ── Audit Log Tab ── */}
      {activeTab === 'audit' && <PRAuditLog />}

      {/* ── PR List Tab ── */}
      {activeTab === 'list' && <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Button variant="primary" icon={Plus} onClick={() => setIsCreateModalOpen(true)}>
            New PR
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

          {/* Search bar */}
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

        {/* Export buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={exporting || filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <FileSpreadsheet size={15} className="text-green-600" />
            Excel
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting || filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <Download size={15} className="text-red-600" />
            PDF
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-900 text-white rounded-xl">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 ml-2">
            <button onClick={async () => {
              if (!window.confirm(`Delete ${selectedIds.size} selected PR(s)?`)) return;
              for (const pr of selectedPRs) await deletePR(pr.id);
              clearSelection();
            }} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-xs font-medium transition-colors">
              <Trash2 size={13} /> Delete Selected
            </button>
          </div>
          <button onClick={clearSelection} className="ml-auto p-1 hover:bg-white/20 rounded-lg transition-colors"><X size={14} /></button>
        </div>
      )}

      {/* Filter panel */}
      {showFilters && (
        <FilterPanel
          filters={filters}
          onChange={handleFilterChange}
          onReset={resetFilters}
          departments={departments}
        />
      )}

      {/* Results summary */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          Showing <strong>{paginated.length}</strong> of <strong>{filtered.length}</strong> purchase requests
          {filtered.length !== prs.length && ` (filtered from ${prs.length})`}
        </span>
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="border border-gray-300 rounded px-2 py-0.5 text-sm"
          >
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
              {['PR Number','JOR Number','Date','Department','Requested By','Supplier','Company','Contact','Terms','Items','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="13" className="px-6 py-16 text-center text-gray-400">
                    <FileText size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No purchase requests found</p>
                    <p className="text-sm mt-1">
                      {activeFilterCount > 0 || search
                        ? 'Try adjusting your filters or search.'
                        : 'Click "New PR" to create one.'}
                    </p>
                  </td>
                </tr>
              ) : paginated.map(pr => (
                <tr key={pr.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(pr.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleSelect(pr.id)} className="text-gray-400 hover:text-blue-600">
                      {selectedIds.has(pr.id) ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-blue-700 whitespace-nowrap">
                    {pr.pr_number || pr.prNumber || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-indigo-600 whitespace-nowrap">
                    {pr.jor_number || pr.jorNumber || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {pr.created_at ? new Date(pr.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{pr.department || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{pr.requested_by || pr.requestedBy || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{pr.supplier || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{pr.company_name || pr.companyName || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{pr.contact_person || pr.contactPerson || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{pr.terms || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap text-center">{(pr.items || []).length}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={pr.status} /></td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleView(pr)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                        <Eye size={15} />
                      </button>
                      <button onClick={() => handleEdit(pr)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="Edit">
                        <Edit size={15} />
                      </button>
                      <button onClick={() => handleDelete(pr)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Delete" disabled={isProcessing}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2 py-1 rounded text-sm border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
              >«</button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
              ><ChevronLeft size={14} /></button>

              {/* Page number buttons */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded text-sm border transition-colors ${
                      p === page
                        ? 'bg-blue-900 text-white border-blue-900'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >{p}</button>
                );
              })}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
              ><ChevronRight size={14} /></button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2 py-1 rounded text-sm border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
              >»</button>
            </div>
          </div>
        )}
      </Card>

      {/* Modals */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="New Purchase Request" size="lg">
        <PRForm onClose={() => setIsCreateModalOpen(false)} onSuccess={() => {}} />
      </Modal>

      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Purchase Request Details" size="lg">
        <PRDetails pr={selectedPR} />
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
          <Button variant="primary" onClick={() => { setIsViewModalOpen(false); handleEdit(selectedPR); }}>Edit</Button>
        </div>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Purchase Request" size="lg">
        {selectedPR && (
          <PREditForm pr={selectedPR} onClose={() => setIsEditModalOpen(false)} onSuccess={() => {}} />
        )}
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => !isProcessing && setDeleteTarget(null)} title="Delete Purchase Request" size="md">
        <DeleteConfirmModal
          pr={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => !isProcessing && setDeleteTarget(null)}
          isProcessing={isProcessing}
        />
      </Modal>
      </div>} {/* end activeTab === 'list' */}
    </div>
  );
};

export default PurchaseRequests;