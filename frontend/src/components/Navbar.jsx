import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#2563eb">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM7 11h5v5H7z" />
          </svg>
          Leave Management System
        </Link>

        <nav>
          <ul className="navbar-links">
            {isAuthenticated ? (
              <>
                {isAdmin ? (
                  <>
                    <li>
                      <NavLink
                        to="/admin/dashboard"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        Admin Dashboard
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/admin/requests"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        All Requests
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/admin/leave-types"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        Leave Types
                      </NavLink>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <NavLink
                        to="/"
                        end
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        My Dashboard
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/apply-leave"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        Apply for Leave
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/my-leaves"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        My Leave History
                      </NavLink>
                    </li>
                  </>
                )}

                <li className="navbar-user">
                  <span className="user-tag">
                    {user?.name}
                    <span
                      className={
                        user?.role === 'admin'
                          ? 'role-tag-admin'
                          : 'role-tag-employee'
                      }
                    >
                      {user?.role}
                    </span>
                  </span>
                  <button
                    onClick={handleLogout}
                    className="btn btn-secondary btn-sm"
                    title="Sign out"
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <NavLink
                    to="/login"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                  >
                    Login
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/register"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                  >
                    Register Employee
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
