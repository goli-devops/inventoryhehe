import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Search, ChevronLeft, ChevronRight, X, Eye, RefreshCw } from 'lucide-react';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import AuditLogService from '../../services/AuditLogService';

const PAGE_SIZE = 15;

// ── Snapshot detail modal ─────────────────────────────────────────────────────
const SnapshotModal = ({ entry, onClose }) => {
  if (!entry) return null;
  const pr = entry.snapshot;

  const Field = ({ label, value }) => value
    ? <div><p className="text-xs text-gray-400">{label}</p><p className="text-sm text-gray-800 font-medium">{value}</p></div>
    : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl">
        <div>
          <p className="text-xs text-red-500 font-semibold uppercase tracking-wide">Deleted PR</p>
          <p className="text-xl font-bold text-red-700">{entry.pr_number}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Deleted by</p>
          <p className="text-sm font-semibold text-gray-800">{entry.performed_by}</p>
          <p className="text-xs text-gray-400">{new Date(entry.performed_at).toLocaleString()}</p>
        </div>
      </div>

      {pr ? (
        <>
          {/* Core fields */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="PR Number"       value={pr.pr_number} />
            <Field label="JOR Number"      value={pr.jor_number} />
            <Field label="Requester's Name" value={pr.requested_by} />
            <Field label="Department"      value={pr.department} />
            <Field label="Status at deletion" value={pr.status} />
            <Field label="Created By"      value={pr.created_by} />
          </div>

          {/* Supplier */}
          {(pr.supplier || pr.company_name || pr.contact_person) && (
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Supplier Information</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Supplier"       value={pr.supplier} />
                <Field label="Company"        value={pr.company_name} />
                <Field label="Contact Person" value={pr.contact_person} />
                <Field label="Contact Number" value={pr.contact_number} />
                <Field label="Payment Terms"  value={pr.terms} />
              </div>
            </div>
          )}

          {/* Items */}
          {pr.items?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Items ({pr.items.length})</p>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['#', 'Description', 'Qty', 'Unit', 'Est. Price'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pr.items.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-3 py-2 text-gray-800">{item.description}</td>
                        <td className="px-3 py-2 text-gray-600">{item.quantity}</td>
                        <td className="px-3 py-2 text-gray-600">{item.unit || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">
                          ₱{parseFloat(item.estimatedPrice || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          {pr.notes && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Notes</p>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">{pr.notes}</p>
            </div>
          )}
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
const PRAuditLog = () => {
  const [logs,         setLogs]         = useState([]);
  const [totalCount,   setTotalCount]   = useState(0);
  const [page,         setPage]         = useState(1);
  const [loading,      setLoading]      = useState(false);
  const [search,       setSearch]       = useState('');
  const [selectedEntry,setSelectedEntry]= useState(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const { data, count } = await AuditLogService.getAll({ page: p, pageSize: PAGE_SIZE });
      setLogs(data);
      setTotalCount(count);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  // Client-side search filter on current page
  const filtered = search.trim()
    ? logs.filter(e =>
        String(e.pr_number   || '').toLowerCase().includes(search.toLowerCase()) ||
        String(e.performed_by|| '').toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search PR number or user…"
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
          {totalCount} total deletion{totalCount !== 1 ? 's' : ''} recorded
        </span>
      </div>

      {/* Table */}
      <Card padding="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['PR Number', 'JOR Number', 'Requester\'s Name', 'Department', 'Status at Deletion', 'Deleted By', 'Deleted At', 'Details'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Loading audit log…</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-16 text-center text-gray-400">
                    <ShieldAlert size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No deletion records found</p>
                    <p className="text-sm mt-1">Deleted PRs will appear here.</p>
                  </td>
                </tr>
              ) : filtered.map((entry, i) => {
                const snap = entry.snapshot || {};
                return (
                  <tr key={entry.id || i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-red-600 whitespace-nowrap">
                      {entry.pr_number || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-indigo-600 whitespace-nowrap">
                      {snap.jor_number || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {snap.requested_by || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {snap.department || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {snap.status ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          snap.status === 'Approved'     ? 'bg-green-100 text-green-700' :
                          snap.status === 'Submitted'    ? 'bg-blue-100 text-blue-700'  :
                          snap.status === 'For Canvass'  ? 'bg-yellow-100 text-yellow-700' :
                          snap.status === 'Cancelled'    ? 'bg-red-100 text-red-700'    :
                          snap.status === 'Completed'    ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{snap.status}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">
                      {entry.performed_by || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {entry.performed_at ? new Date(entry.performed_at).toLocaleString() : '—'}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => load(1)} disabled={page === 1}
                className="px-2 py-1 rounded text-sm border border-gray-300 disabled:opacity-40 hover:bg-gray-50">«</button>
              <button onClick={() => load(page - 1)} disabled={page === 1}
                className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                <ChevronLeft size={14} /></button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                return (
                  <button key={p} onClick={() => load(p)}
                    className={`w-8 h-8 rounded text-sm border transition-colors ${
                      p === page ? 'bg-blue-900 text-white border-blue-900' : 'border-gray-300 hover:bg-gray-50'
                    }`}>{p}</button>
                );
              })}
              <button onClick={() => load(page + 1)} disabled={page === totalPages}
                className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                <ChevronRight size={14} /></button>
              <button onClick={() => load(totalPages)} disabled={page === totalPages}
                className="px-2 py-1 rounded text-sm border border-gray-300 disabled:opacity-40 hover:bg-gray-50">»</button>
            </div>
          </div>
        )}
      </Card>

      {/* Snapshot Modal */}
      <Modal isOpen={!!selectedEntry} onClose={() => setSelectedEntry(null)}
        title="Deleted PR Snapshot" size="lg">
        <SnapshotModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      </Modal>
    </div>
  );
};

export default PRAuditLog;