import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';

export const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner message="Checking administrator privileges..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#ef4444' }}>
        <h2>403 — Forbidden</h2>
        <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>
          You do not have administrative privileges to access this page.
        </p>
      </div>
    );
  }

  return children;
};

export default AdminRoute;
