import React from 'react';
import { LayoutDashboard, FileText, ShoppingCart, Package, Scan, BarChart3, Settings, Users, Menu, X } from 'lucide-react';

const Sidebar = ({ activeModule, setActiveModule, sidebarOpen, setSidebarOpen }) => {
  const modules = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'pr', name: 'Purchase Requests', icon: FileText },
    { id: 'inventory', name: 'Inventory', icon: Package },
    { id: 'assets', name: 'Asset Tracking', icon: Scan },
    { id: 'reports', name: 'Reports & Analytics', icon: BarChart3 },
    { id: 'users', name: 'User Management', icon: Users },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  return (
    <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-blue-900 to-blue-800 text-white transition-all duration-300 ease-in-out flex flex-col`}>
      {/* Logo */}
      <div className="p-4 border-b border-blue-700">
        <div className="flex items-center justify-between">
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
            <div className="whitespace-nowrap">
              <h1 className="text-xl font-bold">GOLI WMS</h1>
              <p className="text-xs text-blue-200">Warehouse Management</p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-blue-700 rounded-lg transition-colors flex-shrink-0"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <li key={module.id}>
                <button
                  onClick={() => setActiveModule(module.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    activeModule === module.id
                      ? 'bg-blue-700 text-white shadow-lg'
                      : 'hover:bg-blue-800 text-blue-100'
                  }`}
                  title={!sidebarOpen ? module.name : ''}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  <span className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                    sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'
                  }`}>
                    {module.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info */}
      <div className={`p-4 border-t border-blue-700 overflow-hidden transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold">AP</span>
          </div>
          <div className={`flex-1 overflow-hidden transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'
          }`}>
            <p className="text-sm font-medium whitespace-nowrap">Ariel Parcon</p>
            <p className="text-xs text-blue-200 whitespace-nowrap">Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;