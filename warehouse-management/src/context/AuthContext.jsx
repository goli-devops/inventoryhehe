import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import supabase from '../config/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [session,     setSession]     = useState(null);
  const [user,        setUser]        = useState(null);
  const [profile,     setProfile]     = useState(null);
  const [loading,     setLoading]     = useState(true);

  // Fetch the user's row from the profiles table
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return; }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', userId)
        .single();
      if (!error && data) setProfile(data);
    } catch (err) {
      console.warn('[Auth] Could not load profile:', err.message);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      // Load profile whenever auth state changes
      fetchProfile(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Derived display name — profiles table takes priority over user_metadata
  const displayName =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'User';

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  // Allow updating the profile display name from within the app
  const updateDisplayName = async (newName) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, display_name: newName, updated_at: new Date().toISOString() });
      if (error) throw error;
      setProfile(prev => ({ ...prev, display_name: newName }));
      return true;
    } catch (err) {
      console.error('[Auth] Failed to update display name:', err.message);
      return false;
    }
  };

  const value = {
    session,
    user,
    profile,
    loading,
    displayName,
    signIn,
    signOut,
    updateDisplayName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;