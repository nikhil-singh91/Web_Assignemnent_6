import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container" style={{ textAlign: 'center', padding: '60px 16px' }}>
      <h1 style={{ fontSize: '48px', fontWeight: '800', color: '#94a3b8' }}>404</h1>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1e293b', marginTop: '8px' }}>
        Page Not Found
      </h2>
      <p style={{ color: '#64748b', marginTop: '6px', marginBottom: '24px' }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/" className="btn btn-primary">
        Return to Dashboard
      </Link>
    </div>
  );
}
