import React, { useState } from 'react';
import {
  Calendar, User, Package, FileText, Clock,
  Hash, Building2, Phone, CreditCard, ArrowRight,
  CheckCircle, PlusCircle, Edit3
} from 'lucide-react';

const STATUS_STYLES = {
  Submitted:    'bg-blue-100 text-blue-800',
  Approved:     'bg-green-100 text-green-800',
  'For Canvass':'bg-yellow-100 text-yellow-800',
  Cancelled:    'bg-red-100 text-red-800',
  Completed:    'bg-purple-100 text-purple-800',
};

const StatusBadge = ({ status }) => (
  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'}`}>
    {status || '—'}
  </span>
);

const InfoRow = ({ icon: Icon, label, value }) => {
  if (!value) return null;
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

// Icon + color per action type
const entryMeta = (entry) => {
  if (entry.action === 'Created') return { icon: PlusCircle, color: 'text-green-500', bg: 'bg-green-50 border-green-200' };
  if (entry.field === 'Status')   return { icon: CheckCircle, color: 'text-blue-500',  bg: 'bg-blue-50 border-blue-200'  };
  return                                 { icon: Edit3,        color: 'text-orange-500',bg: 'bg-orange-50 border-orange-200' };
};

const PRDetails = ({ pr }) => {
  const [tab, setTab] = useState('details');
  if (!pr) return null;

  const totalEstimated = (pr.items || []).reduce(
    (sum, i) => sum + (parseFloat(i.estimatedPrice) || 0) * (parseInt(i.quantity) || 1), 0
  );

  const history = [...(pr.history || [])].reverse(); // newest first

  return (
    <div className="space-y-4">

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {['details', 'history'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
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

          {/* Status */}
          <div className="flex items-center justify-between">
            <StatusBadge status={pr.status} />
            <span className="text-xs text-gray-400">
              {pr.created_at ? new Date(pr.created_at).toLocaleString() : ''}
            </span>
          </div>

          {/* PR / JOR numbers */}
          <div className="grid grid-cols-2 gap-4">
            <InfoRow icon={Hash}     label="PR Number"    value={pr.pr_number  || pr.prNumber} />
            <InfoRow icon={Hash}     label="JOR Number"   value={pr.jor_number || pr.jorNumber} />
            <InfoRow icon={User}     label="Requester's Name" value={pr.requested_by || pr.requestedBy} />
            <InfoRow icon={Package}  label="Department"   value={pr.department} />
            <InfoRow icon={User}     label="Created By"   value={pr.created_by} />
            <InfoRow icon={User}     label="Last Updated By" value={pr.updated_by} />
          </div>

          {/* Supplier */}
          {(pr.supplier || pr.company_name || pr.contact_person || pr.contact_number || pr.terms) && (
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Supplier Information</p>
              <div className="grid grid-cols-2 gap-3">
                <InfoRow icon={Building2} label="Supplier"       value={pr.supplier} />
                <InfoRow icon={Building2} label="Company"        value={pr.company_name || pr.companyName} />
                <InfoRow icon={User}      label="Contact Person" value={pr.contact_person || pr.contactPerson} />
                <InfoRow icon={Phone}     label="Contact Number" value={pr.contact_number || pr.contactNumber} />
                <InfoRow icon={CreditCard}label="Payment Terms"  value={pr.terms} />
              </div>
            </div>
          )}

          {/* Items */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Items Requested</p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">#</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Qty</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Unit</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Est. Price</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(pr.items || []).map((item, i) => {
                    const price = parseFloat(item.estimatedPrice) || 0;
                    const qty   = parseInt(item.quantity) || 1;
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-2 text-gray-800">{item.description}</td>
                        <td className="px-4 py-2 text-center text-gray-600">{qty}</td>
                        <td className="px-4 py-2 text-gray-600">{item.unit || '—'}</td>
                        <td className="px-4 py-2 text-right text-gray-600">₱{price.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-800">₱{(price * qty).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {totalEstimated > 0 && (
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan="5" className="px-4 py-2 text-right text-sm font-semibold text-gray-600">Estimated Total</td>
                      <td className="px-4 py-2 text-right text-sm font-bold text-blue-700">
                        ₱{totalEstimated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Notes */}
          {pr.notes && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1.5">Notes</p>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">{pr.notes}</p>
            </div>
          )}
        </div>
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
            <div className="relative">
              {/* vertical line */}
              <div className="absolute left-[18px] top-0 bottom-0 w-px bg-gray-200" />

              <div className="space-y-3">
                {history.map((entry, i) => {
                  const { icon: Icon, color, bg } = entryMeta(entry);
                  return (
                    <div key={i} className="flex gap-3 relative">
                      {/* dot */}
                      <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 bg-white z-10 ${bg}`}>
                        <Icon size={15} className={color} />
                      </div>

                      <div className={`flex-1 rounded-xl border p-3 text-sm ${bg}`}>
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            {/* Main message */}
                            {entry.action === 'Created' ? (
                              <p className="font-semibold text-gray-800">{entry.details || 'Purchase Request created'}</p>
                            ) : entry.from && entry.to ? (
                              <div>
                                <p className="font-semibold text-gray-800 mb-1">
                                  {entry.field} updated
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs text-gray-600 font-mono">
                                    {entry.from}
                                  </span>
                                  <ArrowRight size={12} className="text-gray-400 flex-shrink-0" />
                                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${
                                    entry.field === 'Status'
                                      ? STATUS_STYLES[entry.to] || 'bg-gray-100 text-gray-700'
                                      : 'bg-white border border-blue-300 text-blue-700'
                                  }`}>
                                    {entry.to}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <p className="font-medium text-gray-700">{entry.details || entry.action}</p>
                            )}
                          </div>
                        </div>

                        {/* Footer: user + time */}
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
          )}
        </div>
      )}
    </div>
  );
};

export default PRDetails;