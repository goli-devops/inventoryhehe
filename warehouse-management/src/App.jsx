import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { WMSProvider } from './context/WMSContext';
import { CalendarProvider } from './context/CalendarContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';

// Inner component so it can consume AuthContext
const AppContent = () => {
  const { user, loading, showInactivityWarning, resetInactivityTimer, signOut } = useAuth();

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

  // Inactivity warning modal
  const InactivityModal = showInactivityWarning ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
            <span className="text-yellow-600 text-xl">⏱</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800">Session Expiring Soon</h3>
            <p className="text-sm text-gray-500 mt-1">
              You've been inactive for 9 minutes. You'll be automatically logged out in <strong>1 minute</strong> to protect your account.
            </p>
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button
            onClick={resetInactivityTimer}
            className="flex-1 px-4 py-2 bg-blue-900 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors"
          >
            Stay Logged In
          </button>
          <button
            onClick={() => signOut()}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            Log Out Now
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // Authenticated — show the full app
  return (
    <>
      {InactivityModal}
      <SettingsProvider>
        <WMSProvider>
          <CalendarProvider>
            <Layout />
          </CalendarProvider>
        </WMSProvider>
      </SettingsProvider>
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;