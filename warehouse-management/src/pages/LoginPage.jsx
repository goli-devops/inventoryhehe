import React, { useState } from 'react';
import { Package, Eye, EyeOff, Loader, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { signIn } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'Incorrect email or password. Please try again.'
          : err.message || 'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-950 via-blue-900 to-green-800 flex items-center justify-center p-4">

      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-700 opacity-20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600 opacity-20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Brand header */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-8 py-8 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <Package size={24} className="text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide">ICT ASSET – WMS</h1>
            <p className="text-blue-200 text-sm mt-1">Warehouse Management System</p>
          </div>

          {/* Form body */}
          <div className="px-8 py-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-1">Welcome back</h2>
            <p className="text-sm text-gray-500 mb-6">Sign in to your account to continue</p>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-5">
                <AlertCircle size={16} className="text-red-500 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  required
                  autoComplete="email"
                  placeholder="you@goli.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end -mt-2">
                <p className="text-xs text-gray-400">Contact your administrator to create your account or if you want to reset your password.</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading
                  ? <><Loader size={16} className="animate-spin" /> Signing in…</>
                  : 'Sign In'
                }
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-blue-300 text-xs mt-6">
          © {new Date().getFullYear()} Global Officium Limited Inc. — ICT Asset Use Only
        </p>
      </div>
    </div>
  );
};

export default LoginPage;