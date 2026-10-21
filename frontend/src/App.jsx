import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ApplyLeave from './pages/ApplyLeave';
import MyLeaves from './pages/MyLeaves';
import LeaveDetails from './pages/LeaveDetails';
import AdminDashboard from './pages/AdminDashboard';
import AdminRequests from './pages/AdminRequests';
import AdminLeaveTypes from './pages/AdminLeaveTypes';
import AdminLeaveTypeForm from './pages/AdminLeaveTypeForm';
import NotFound from './pages/NotFound';

function IndexDispatcher() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="container loading-container">Initializing application...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <EmployeeDashboard />;
}

export default function App() {
  return (
    <div className="app-layout">
      <Navbar />

      <main className="main-content">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Root dispatch */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <IndexDispatcher />
              </ProtectedRoute>
            }
          />

          {/* Employee Routes */}
          <Route
            path="/apply-leave"
            element={
              <ProtectedRoute>
                <ApplyLeave />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-leaves"
            element={
              <ProtectedRoute>
                <MyLeaves />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-leaves/:id"
            element={
              <ProtectedRoute>
                <LeaveDetails />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/requests"
            element={
              <AdminRoute>
                <AdminRequests />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/leave-types"
            element={
              <AdminRoute>
                <AdminLeaveTypes />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/leave-types/new"
            element={
              <AdminRoute>
                <AdminLeaveTypeForm />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/leave-types/:id/edit"
            element={
              <AdminRoute>
                <AdminLeaveTypeForm />
              </AdminRoute>
            }
          />

          {/* Fallback 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <div className="container">
          Employee Leave Management System &bull; PS4 HR Corporate Portal
        </div>
      </footer>
    </div>
  );
}
