import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { WMSProvider } from './context/WMSContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import { Loader } from 'lucide-react';

// Inner component so it can consume AuthContext
const AppContent = () => {
  const { user, loading } = useAuth();

  // Waiting for Supabase to resolve the initial session
  if (loading) {
    return (
      <div className="min-h-screen bg-blue-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader size={32} className="text-blue-300 animate-spin" />
          <p className="text-blue-300 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  // Not authenticated — show login
  if (!user) return <LoginPage />;

  // Authenticated — show the full app
  return (
    <SettingsProvider>
      <WMSProvider>
        <Layout />
      </WMSProvider>
    </SettingsProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;