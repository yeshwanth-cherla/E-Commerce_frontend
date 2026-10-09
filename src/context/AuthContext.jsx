import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { apiClient } from '../services/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState('ROLE_USER');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetches verified user identity from backend /api/auth/me
  const fetchBackendProfile = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/auth/me');
      if (response.data) {
        setProfile(response.data);
        if (response.data.role) {
          setRole(response.data.role);
        }
      }
    } catch (err) {
      console.warn('Backend profile fetch note:', err.message);
    }
  }, []);

  const initAuth = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      if (currentSession?.user) {
        setUser(currentSession.user);
        // Extract role from app_metadata claim if present
        const appRole = currentSession.user.app_metadata?.role || 'ROLE_USER';
        const formattedRole = appRole.startsWith('ROLE_') ? appRole : `ROLE_${appRole.toUpperCase()}`;
        setRole(formattedRole);

        await fetchBackendProfile();
      } else {
        setUser(null);
        setProfile(null);
        setRole('ROLE_USER');
      }
    } catch (err) {
      console.error('Error initializing auth:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchBackendProfile]);

  useEffect(() => {
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setUser(newSession.user);
        const appRole = newSession.user.app_metadata?.role || 'ROLE_USER';
        const formattedRole = appRole.startsWith('ROLE_') ? appRole : `ROLE_${appRole.toUpperCase()}`;
        setRole(formattedRole);
        await fetchBackendProfile();
      } else {
        setUser(null);
        setProfile(null);
        setRole('ROLE_USER');
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [initAuth, fetchBackendProfile]);

  const login = async (email, password) => {
    setError(null);
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(loginError.message);
      throw loginError;
    }

    return data;
  };

  const signUp = async (email, password, fullName) => {
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      throw signUpError;
    }

    return data;
  };

  const logout = async () => {
    setError(null);
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) {
      console.error('Logout error:', logoutError);
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole('ROLE_USER');
  };

  const value = {
    session,
    user,
    profile,
    role,
    isAdmin: role === 'ROLE_ADMIN',
    isAuthenticated: !!user,
    loading,
    error,
    login,
    signUp,
    logout,
    refreshProfile: fetchBackendProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
