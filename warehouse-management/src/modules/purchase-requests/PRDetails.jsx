import React, { useState } from 'react';
import { Calendar, User, Package, FileText, Clock, ChevronDown, ChevronUp, Truck, CreditCard, Building2, Phone } from 'lucide-react';

const PRDetails = ({ pr }) => {
  const [historyOpen, setHistoryOpen] = useState(false);

  if (!pr) return null;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">PR Number</p>
            <p className="font-semibold text-gray-800">{pr.pr_number || pr.prNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Date</p>
            <p className="font-semibold text-gray-800">
              {new Date(pr.date).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <User size={18} className="text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Requested By</p>
            <p className="font-semibold text-gray-800">{pr.requested_by || pr.requestedBy}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Package size={18} className="text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Department</p>
            <p className="font-semibold text-gray-800">{pr.department}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Truck size={18} className="text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Supplier</p>
            <p className="font-semibold text-gray-800">{pr.supplier || <span className="text-gray-400">—</span>}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 col-span-2">
          <CreditCard size={18} className="text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Payment Terms</p>
            <p className="font-semibold text-gray-800">{pr.terms || <span className="text-gray-400">—</span>}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Company Name</p>
            <p className="font-semibold text-gray-800">{pr.company_name || pr.companyName || <span className="text-gray-400">—</span>}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Phone size={18} className="text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Contact Person</p>
            <p className="font-semibold text-gray-800">{pr.contact_person || pr.contactPerson || <span className="text-gray-400">—</span>}</p>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div>
        <p className="text-sm text-gray-500 mb-2">Status</p>
        <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full 
          ${pr.status === 'Submitted' ? 'bg-blue-100 text-blue-800' : ''}
          ${pr.status === 'Approved' ? 'bg-green-100 text-green-800' : ''}
          ${pr.status === 'For Canvass' ? 'bg-yellow-100 text-yellow-800' : ''}
          ${pr.status === 'Cancelled' ? 'bg-red-100 text-red-800' : ''}
        `}>
          {pr.status}
        </span>
      </div>

      {/* Items List */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Items Requested</p>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quantity</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Unit</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Est. Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pr.items && pr.items.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 text-gray-800">{item.description}</td>
                  <td className="px-4 py-2 text-gray-600">{item.quantity}</td>
                  <td className="px-4 py-2 text-gray-600">{item.unit}</td>
                  <td className="px-4 py-2 text-gray-600">
                    ₱{item.estimatedPrice ? parseFloat(item.estimatedPrice).toFixed(2) : '0.00'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes */}
      {pr.notes && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Notes</p>
          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{pr.notes}</p>
        </div>
      )}

      {/* History - Collapsible */}
      {pr.history && pr.history.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-blue-500" />
              <span className="text-sm font-medium text-gray-700">History</span>
              <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                {pr.history.length} {pr.history.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
            {historyOpen ? (
              <ChevronUp size={16} className="text-gray-400" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            )}
          </button>

          {historyOpen && (
            <div className="p-4 space-y-3">
              {pr.history.map((entry, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800">{entry.action}</span>
                      {entry.status && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full
                          ${entry.status === 'Submitted' ? 'bg-blue-100 text-blue-800' : ''}
                          ${entry.status === 'Approved' ? 'bg-green-100 text-green-800' : ''}
                          ${entry.status === 'For Canvass' ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${entry.status === 'Cancelled' ? 'bg-red-100 text-red-800' : ''}
                        `}>
                          {entry.status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      by <span className="font-medium text-gray-700">{entry.user}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(entry.date).toLocaleString()}
                    </p>
                    {entry.notes && (
                      <p className="text-xs text-gray-600 mt-2 italic bg-white p-2 rounded border-l-2 border-blue-300">
                        "{entry.notes}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PRDetails;