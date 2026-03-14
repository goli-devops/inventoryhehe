import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard, FileText, ShoppingCart, Package,
  Scan, BarChart3, Settings, Users, X, LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ── Logout Confirmation Modal (portaled to body) ──────────────────────────────
const LogoutModal = ({ displayName, initials, onConfirm, onCancel, signingOut }) => {
  // Trap ESC key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && !signingOut) onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [signingOut, onCancel]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !signingOut && onCancel()}
      />

      {/* Dialog */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        style={{ animation: 'modalPop 0.2s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        {/* Top accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-blue-900 via-blue-600 to-blue-400" />

        <div className="p-6 space-y-5">
          {/* Avatar + heading */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-700 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-xl font-bold text-white">{initials}</span>
              </div>
              {/* Logout badge */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow">
                <LogOut size={12} className="text-white" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-800">Sign Out</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Signed in as <span className="font-semibold text-gray-700">{displayName}</span>
              </p>
            </div>
          </div>

          {/* Message */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center">
            <p className="text-sm text-amber-800">
              Are you sure you want to sign out? Any unsaved changes will be lost.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={signingOut}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
            >
              Stay
            </button>
            <button
              onClick={onConfirm}
              disabled={signingOut}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 active:bg-red-700 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
            >
              {signingOut ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing out…
                </>
              ) : (
                <>
                  <LogOut size={15} />
                  Sign Out
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Keyframe injection */}
      <style>{`
        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.88) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>
    </div>,
    document.body
  );
};

// ── Sidebar ───────────────────────────────────────────────────────────────────
const Sidebar = ({ activeModule, setActiveModule, setSidebarOpen }) => {
  const { user, signOut } = useAuth();
  const [signingOut,      setSigningOut]      = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const modules = [
    { id: 'dashboard', name: 'Dashboard',           icon: LayoutDashboard },
    { id: 'pr',        name: 'Purchase Requests',   icon: FileText        },
    { id: 'po',        name: 'Purchase Orders',     icon: ShoppingCart    },
    { id: 'inventory', name: 'Inventory',           icon: Package         },
    { id: 'assets',    name: 'Asset Tracking',      icon: Scan            },
    { id: 'reports',   name: 'Reports & Analytics', icon: BarChart3       },
    { id: 'users',     name: 'User Management',     icon: Users           },
    { id: 'settings',  name: 'Settings',            icon: Settings        },
  ];

  const displayName = user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split('@')[0]
    || 'User';
  const displayRole = user?.user_metadata?.role || 'Staff';
  const initials    = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const handleConfirmSignOut = async () => {
    setSigningOut(true);
    try { await signOut(); }
    catch (e) { console.error(e); setSigningOut(false); setShowLogoutModal(false); }
  };

  return (
    <>
      <aside className="w-64 h-full bg-gradient-to-b from-blue-900 to-blue-800 text-white flex flex-col shadow-2xl">

        {/* Header */}
        <div className="p-4 border-b border-blue-700 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">GOLI - ICT</h1>
            <p className="text-xs text-blue-200">Warehouse Management System</p>
          </div>
          <button onClick={() => setSidebarOpen(false)}
            className="p-2 hover:bg-blue-700 rounded-lg transition-colors" title="Close menu">
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {modules.map(({ id, name, icon: Icon }) => (
              <li key={id}>
                <button onClick={() => setActiveModule(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left ${
                    activeModule === id
                      ? 'bg-blue-700 text-white shadow-lg'
                      : 'hover:bg-blue-800 text-blue-100'
                  }`}>
                  <Icon size={20} className="flex-shrink-0" />
                  <span className="text-sm font-medium">{name}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User info + logout */}
        <div className="p-4 border-t border-blue-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-blue-200">{displayRole}</p>
            </div>
            <button
              onClick={() => setShowLogoutModal(true)}
              disabled={signingOut}
              title="Sign out"
              className="p-1.5 text-blue-300 hover:text-white hover:bg-blue-700 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Portal modal — renders directly on document.body, above everything */}
      {showLogoutModal && (
        <LogoutModal
          displayName={displayName}
          initials={initials}
          signingOut={signingOut}
          onConfirm={handleConfirmSignOut}
          onCancel={() => !signingOut && setShowLogoutModal(false)}
        />
      )}
    </>
  );
};

export default Sidebar;