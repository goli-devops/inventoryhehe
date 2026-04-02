import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Dashboard from '../../modules/dashboard/Dashboard';
import PurchaseRequests from '../../modules/purchase-requests/PurchaseRequests';
import Inventory from '../../modules/inventory/Inventory';
import Assets from '../../modules/assets/Assets';
import Reports from '../../modules/reports/Reports';
import Users from '../../modules/users/Users';
import Settings from '../../modules/settings/Settings';
import ErrorBoundary from '../common/ErrorBoundary';

const moduleNames = {
  dashboard: 'Dashboard',
  pr: 'Purchase Requests',
  inventory: 'Inventory',
  assets: 'Asset Tracking',
  reports: 'Reports & Analytics',
  users: 'User Management',
  settings: 'Settings',
};

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);

  const activeModule = location.pathname.slice(1) || 'dashboard';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSelectedItemId(params.get('itemId'));
  }, [location.search]);

  const navigateToModule = (module, itemId = null) => {
    const path = `/${module}${itemId ? `?itemId=${itemId}` : ''}`;
    navigate(path);
  };

  const renderContent = () => {
    switch(activeModule) {
      case 'dashboard':  return <Dashboard setActiveModule={navigateToModule} />;
      case 'pr':         return <PurchaseRequests selectedItemId={selectedItemId} clearSelectedItem={() => setSelectedItemId(null)} />;
      case 'inventory':  return <Inventory />;
      case 'assets':     return <Assets selectedItemId={selectedItemId} clearSelectedItem={() => setSelectedItemId(null)} />;
      case 'reports':    return <Reports />;
      case 'users':      return <Users />;
      case 'settings':   return <Settings />;
      default:           return <Dashboard setActiveModule={navigateToModule} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Backdrop overlay — clicking closes sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-20 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed overlay, slides in/out */}
      <div className={`fixed top-0 left-0 h-full z-30 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar
          activeModule={activeModule}
          setActiveModule={(mod) => { navigate(`/${mod}`); setSidebarOpen(false); }}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
      </div>

      {/* Main content — always full width */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          activeModule={activeModule}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary
            key={activeModule}
            fallbackTitle={`Failed to load ${moduleNames[activeModule] || 'this module'}`}
          >
            {renderContent()}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default Layout;