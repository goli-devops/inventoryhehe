import React from 'react';
import { Calendar, User, Package, FileText, Clock } from 'lucide-react';

const PRDetails = ({ pr }) => {
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

      {/* History */}
      {pr.history && pr.history.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">History</p>
          <div className="space-y-2">
            {pr.history.map((entry, index) => (
              <div key={index} className="flex items-start gap-3 text-sm">
                <Clock size={16} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-800">
                    <span className="font-medium">{entry.action}</span> by {entry.user}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(entry.date).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PRDetails;