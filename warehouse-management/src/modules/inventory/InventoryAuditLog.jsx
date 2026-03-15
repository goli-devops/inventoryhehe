import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Search, ChevronLeft, ChevronRight, X, Eye, RefreshCw } from 'lucide-react';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import InventoryAuditLogService from '../../services/Inventoryauditlogservice';

const PAGE_SIZE = 15;

// ── Snapshot modal ────────────────────────────────────────────────────────────
const SnapshotModal = ({ entry, onClose }) => {
  if (!entry) return null;
  const item = entry.snapshot;

  const Field = ({ label, value }) => value != null && value !== ''
    ? <div><p className="text-xs text-gray-400">{label}</p><p className="text-sm font-medium text-gray-800">{value}</p></div>
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl">
        <div>
          <p className="text-xs text-red-500 font-semibold uppercase tracking-wide">Deleted Item</p>
          <p className="text-xl font-bold text-red-700">{entry.item_code}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Deleted by</p>
          <p className="text-sm font-semibold text-gray-800">{entry.performed_by}</p>
          <p className="text-xs text-gray-400">{new Date(entry.performed_at).toLocaleString()}</p>
        </div>
      </div>

      {entry.reason && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Reason for Deletion</p>
          <p className="text-sm text-amber-800 italic">"{entry.reason}"</p>
        </div>
      )}

      {item ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Item Code"    value={item.item_code} />
            <Field label="Category"     value={item.category} />
            <Field label="Description"  value={item.description} />
            <Field label="Status"       value={item.status} />
            <Field label="Created By"   value={item.created_by} />
            <Field label="Supplier"     value={item.supplier} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl text-center border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Quantity</p>
              <p className="text-2xl font-bold text-gray-800">{item.quantity ?? 0}</p>
              <p className="text-xs text-gray-400">{item.unit}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-xl text-center border border-orange-100">
              <p className="text-xs text-orange-600 mb-1">Min Stock</p>
              <p className="text-2xl font-bold text-orange-600">{item.min_stock_level ?? 0}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl text-center border border-blue-100">
              <p className="text-xs text-blue-600 mb-1">Max Stock</p>
              <p className="text-2xl font-bold text-blue-600">{item.max_stock_level ?? 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Unit Price"    value={item.unit_price != null ? `₱${parseFloat(item.unit_price).toFixed(2)}` : null} />
            <Field label="Total Value"   value={item.unit_price != null ? `₱${((item.quantity ?? 0) * parseFloat(item.unit_price)).toFixed(2)}` : null} />
            <Field label="Location"      value={item.location} />
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-400 italic text-center py-4">No snapshot data available.</p>
      )}

      <div className="flex justify-end pt-3 border-t border-gray-200">
        <button onClick={onClose}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors">
          Close
        </button>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const InventoryAuditLog = () => {
  const [logs,          setLogs]          = useState([]);
  const [totalCount,    setTotalCount]    = useState(0);
  const [page,          setPage]          = useState(1);
  const [loading,       setLoading]       = useState(false);
  const [search,        setSearch]        = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const { data, count } = await InventoryAuditLogService.getAll({ page: p, pageSize: PAGE_SIZE });
      setLogs(data);
      setTotalCount(count);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const filtered = search.trim()
    ? logs.filter(e =>
        String(e.item_code    || '').toLowerCase().includes(search.toLowerCase()) ||
        String(e.performed_by || '').toLowerCase().includes(search.toLowerCase()) ||
        String(e.snapshot?.description || '').toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search item code or user…"
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>
        <button onClick={() => load(page)} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
        <span className="text-sm text-gray-500 ml-auto">
          {totalCount} deletion{totalCount !== 1 ? 's' : ''} recorded
        </span>
      </div>

      <Card padding="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Item Code','Description','Category','Qty at Deletion','Status','Deleted By','Deleted At','Reason','Details'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="9" className="px-6 py-12 text-center text-gray-400">
                  <RefreshCw size={24} className="animate-spin mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Loading…</p>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="9" className="px-6 py-16 text-center text-gray-400">
                  <ShieldAlert size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No deletion records found</p>
                  <p className="text-sm mt-1">Deleted inventory items will appear here.</p>
                </td></tr>
              ) : filtered.map((entry, i) => {
                const snap = entry.snapshot || {};
                return (
                  <tr key={entry.id || i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-red-600 whitespace-nowrap">{entry.item_code || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-48 truncate">{snap.description || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{snap.category || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap text-center">{snap.quantity ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {snap.status ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          snap.status === 'In Stock'     ? 'bg-green-100 text-green-700'  :
                          snap.status === 'Low Stock'    ? 'bg-orange-100 text-orange-700':
                          snap.status === 'Out of Stock' ? 'bg-red-100 text-red-700'      :
                          'bg-gray-100 text-gray-600'
                        }`}>{snap.status}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{entry.performed_by || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {entry.performed_at ? new Date(entry.performed_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-48">
                      {entry.reason ? <span className="italic">"{entry.reason}"</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button onClick={() => setSelectedEntry(entry)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View snapshot">
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination — always visible */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <span className="text-sm text-gray-500">
            {totalCount === 0 ? 'No records'
              : `Showing ${Math.min((page-1)*PAGE_SIZE+1, totalCount)}–${Math.min(page*PAGE_SIZE, totalCount)} of ${totalCount}`}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => load(1)} disabled={page === 1 || !totalPages}
              className="px-2 py-1 rounded text-sm border border-gray-300 disabled:opacity-40 hover:bg-gray-50">«</button>
            <button onClick={() => load(page - 1)} disabled={page === 1}
              className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft size={14} /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = start + i;
              return (
                <button key={p} onClick={() => load(p)}
                  className={`w-8 h-8 rounded text-sm border transition-colors ${p === page ? 'bg-blue-900 text-white border-blue-900' : 'border-gray-300 hover:bg-gray-50'}`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => load(page + 1)} disabled={page === totalPages}
              className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"><ChevronRight size={14} /></button>
            <button onClick={() => load(totalPages)} disabled={page === totalPages}
              className="px-2 py-1 rounded text-sm border border-gray-300 disabled:opacity-40 hover:bg-gray-50">»</button>
          </div>
        </div>
      </Card>

      <Modal isOpen={!!selectedEntry} onClose={() => setSelectedEntry(null)} title="Deleted Item Snapshot" size="lg">
        <SnapshotModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      </Modal>
    </div>
  );
};

export default InventoryAuditLog;