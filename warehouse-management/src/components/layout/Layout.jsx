import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Dashboard from '../../modules/dashboard/Dashboard';
import PurchaseRequests from '../../modules/purchase-requests/PurchaseRequests';
import Inventory from '../../modules/inventory/Inventory';
import Assets from '../../modules/assets/Assets';
import Reports from '../../modules/reports/Reports';
import Users from '../../modules/users/Users';
import Settings from '../../modules/settings/Settings';

const Layout = () => {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderContent = () => {
    switch(activeModule) {
      case 'dashboard':
        return <Dashboard />;
      case 'pr':
        return <PurchaseRequests />;
      case 'po':
        return <PurchaseOrders />;
      case 'inventory':
        return <Inventory />;
      case 'assets':
        return <Assets />;
      case 'reports':
        return <Reports />;
      case 'users':
        return <Users />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          activeModule={activeModule}
          sidebarOpen={sidebarOpen}
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Layout;