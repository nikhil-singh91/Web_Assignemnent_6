import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="container loading-container">
        Verifying administrator privileges...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="container" style={{ marginTop: '40px' }}>
        <div className="alert alert-error">
          <strong>Access Denied:</strong> This page requires administrator privileges.
        </div>
      </div>
    );
  }

  return children;
}
