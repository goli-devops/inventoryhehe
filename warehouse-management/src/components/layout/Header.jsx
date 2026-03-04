import React from 'react';
import { Bell, Search } from 'lucide-react';
import { LayoutDashboard, FileText, ShoppingCart, Package, Scan, BarChart3, Settings, Users } from 'lucide-react';

const Header = ({ activeModule }) => {
  const modules = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'pr', name: 'Purchase Requests', icon: FileText },
    { id: 'inventory', name: 'Inventory', icon: Package },
    { id: 'assets', name: 'Asset Tracking', icon: Scan },
    { id: 'reports', name: 'Reports & Analytics', icon: BarChart3 },
    { id: 'users', name: 'User Management', icon: Users },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  const currentModule = modules.find(m => m.id === activeModule);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            {currentModule?.name || 'Dashboard'}
          </h2>
          <p className="text-sm text-gray-500">Global Officium Limited Inc.</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          {/* Notifications */}
          <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell size={20} className="text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;