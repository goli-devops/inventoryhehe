import React, { useState } from 'react';
import { LayoutDashboard, FileText, ShoppingCart, Package, Scan, BarChart3, Settings, Users, Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ activeModule, setActiveModule, sidebarOpen, setSidebarOpen }) => {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const modules = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'pr', name: 'Purchase Requests', icon: FileText },
    { id: 'inventory', name: 'Inventory', icon: Package },
    { id: 'assets', name: 'Asset Tracking', icon: Scan },
    { id: 'reports', name: 'Reports & Analytics', icon: BarChart3 },
    { id: 'users', name: 'User Management', icon: Users },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  const displayName = user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split('@')[0]
    || 'User';
  const displayRole = user?.user_metadata?.role || 'Staff';
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const handleSignOut = async () => {
    if (!window.confirm('Are you sure you want to sign out?')) return;
    setSigningOut(true);
    try { await signOut(); } catch (e) { console.error(e); setSigningOut(false); }
  };

  return (
    <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-blue-900 to-blue-800 text-white transition-all duration-300 ease-in-out flex flex-col`}>
      {/* Logo */}
      <div className="p-4 border-b border-blue-700">
        <div className="flex items-center justify-between">
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
            <div className="whitespace-nowrap">
              <h1 className="text-xl font-bold">GOLI - ICT</h1>
              <p className="text-xs text-blue-200">Warehouse Management System</p>
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

      {/* User info + logout */}
      <div className="p-4 border-t border-blue-700">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold">{initials}</span>
          </div>

          {/* Name + role */}
          <div className={`flex-1 min-w-0 overflow-hidden transition-all duration-300 ${sidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
            <p className="text-sm font-medium whitespace-nowrap truncate">{displayName}</p>
            <p className="text-xs text-blue-200 whitespace-nowrap">{displayRole}</p>
          </div>

          {/* Logout button */}
          {sidebarOpen && (
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              title="Sign out"
              className="p-1.5 text-blue-300 hover:text-white hover:bg-blue-700 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;