import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { WMSProvider } from './context/WMSContext';
import { CalendarProvider } from './context/CalendarContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import { Loader } from 'lucide-react';

// Inner component so it can consume AuthContext
const AppContent = () => {
  const { user, loading } = useAuth();

  // Waiting for Supabase to resolve the initial session
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex flex-col items-center justify-center gap-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <img src="/goli_logo.jpg" alt="GOLI ICT"
            className="h-16 w-auto object-contain drop-shadow-lg"
            onError={e => { e.target.style.display = 'none'; }} />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-wide">GOLI – ICT</h1>
            <p className="text-blue-300 text-sm">Warehouse Management System</p>
          </div>
        </div>

        {/* Spinner */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-blue-700" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white animate-spin" />
          </div>
          <p className="text-blue-300 text-sm animate-pulse">Loading, please wait…</p>
        </div>

        {/* Bottom bar */}
        <p className="absolute bottom-6 text-blue-400 text-xs">
          © {new Date().getFullYear()} Global Officium Limited Inc.
        </p>
      </div>
    );
  }

  // Not authenticated — show login
  if (!user) return <LoginPage />;

  // Authenticated — show the full app
  return (
    <SettingsProvider>
      <WMSProvider>
        <CalendarProvider>
          <Layout />
        </CalendarProvider>
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