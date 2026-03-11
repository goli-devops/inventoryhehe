import React from 'react';
import { Package, MapPin, TrendingDown, TrendingUp, DollarSign, User } from 'lucide-react';

const InventoryDetails = ({ item }) => {
  if (!item) return null;

  const getStatusColor = () => {
    if (item.quantity === 0) return 'text-red-600 bg-red-50';
    if (item.quantity <= (item.min_stock_level || item.minStockLevel || 0)) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Package size={18} className="text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Item Code</p>
            <p className="font-semibold text-gray-800">{item.item_code || item.itemCode}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Package size={18} className="text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Category</p>
            <p className="font-semibold text-gray-800">{item.category}</p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <p className="text-sm text-gray-500 mb-1">Description</p>
        <p className="text-gray-800 font-medium">{item.description}</p>
      </div>

      {/* Stock Information */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg ${getStatusColor()}`}>
          <p className="text-xs font-medium mb-1">Current Stock</p>
          <p className="text-2xl font-bold">{item.quantity}</p>
          <p className="text-xs mt-1">{item.unit}</p>
        </div>
        <div className="p-4 bg-orange-50 rounded-lg">
          <p className="text-xs font-medium text-orange-900 mb-1">Min Level</p>
          <p className="text-2xl font-bold text-orange-600">
            {item.min_stock_level || item.minStockLevel || 0}
          </p>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-xs font-medium text-blue-900 mb-1">Max Level</p>
          <p className="text-2xl font-bold text-blue-600">
            {item.max_stock_level || item.maxStockLevel || 0}
          </p>
        </div>
      </div>

      {/* Additional Details */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <DollarSign size={18} className="text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Unit Price</p>
            <p className="font-semibold text-gray-800">
              ₱{item.unit_price ? parseFloat(item.unit_price).toFixed(2) : ''}
              required
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign size={18} className="text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Total Value</p>
            <p className="font-semibold text-gray-800">
              ₱{((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Location</p>
            <p className="font-semibold text-gray-800">{item.location || 'Not specified'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <User size={18} className="text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Supplier</p>
            <p className="font-semibold text-gray-800">{item.supplier || 'Not specified'}</p>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div>
        <p className="text-sm text-gray-500 mb-2">Status</p>
        <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full 
          ${item.status === 'In Stock' ? 'bg-green-100 text-green-800' : ''}
          ${item.status === 'Low Stock' ? 'bg-orange-100 text-orange-800' : ''}
          ${item.status === 'Out of Stock' ? 'bg-red-100 text-red-800' : ''}
        `}>
          {item.status}
        </span>
      </div>

      {/* History */}
      {item.history && item.history.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Recent Activity</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {item.history.slice(-5).reverse().map((entry, index) => (
              <div key={index} className="flex items-start gap-3 text-sm p-2 bg-gray-50 rounded">
                {entry.adjustment > 0 ? (
                  <TrendingUp size={16} className="text-green-500 mt-0.5" />
                ) : entry.adjustment < 0 ? (
                  <TrendingDown size={16} className="text-red-500 mt-0.5" />
                ) : (
                  <Package size={16} className="text-gray-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-gray-800">
                    <span className="font-medium">{entry.action}</span>
                    {entry.adjustment && (
                      <span className={entry.adjustment > 0 ? 'text-green-600' : 'text-red-600'}>
                        {' '}({entry.adjustment > 0 ? '+' : ''}{entry.adjustment})
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {entry.user} • {new Date(entry.date).toLocaleString()}
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

export default InventoryDetails;