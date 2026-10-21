import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEmployeeDashboard } from '../api/dashboard';
import { cancelLeaveRequest } from '../api/leaveRequests';
import Alert from '../components/Alert';
import Badge from '../components/Badge';

export default function EmployeeDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getEmployeeDashboard();
      setDashboardData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load employee dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleCancelRequest = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) {
      return;
    }

    try {
      setActionSuccess('');
      setError('');
      const res = await cancelLeaveRequest(id);
      setActionSuccess(res.message || 'Leave request cancelled successfully');
      fetchDashboard();
    } catch (err) {
      setError(err.message || 'Failed to cancel leave request');
    }
  };

  if (loading) {
    return <div className="container loading-container">Loading your dashboard...</div>;
  }

  const { profile, balances, counts, recentRequests } = dashboardData || {};

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome, {profile?.name}</h1>
          <p className="page-subtitle">
            {profile?.employeeId} &bull; {profile?.department} &bull; {profile?.designation}
          </p>
        </div>
        <Link to="/apply-leave" className="btn btn-primary">
          + Apply for Leave
        </Link>
      </div>

      {error && <Alert type="error" message={error} />}
      {actionSuccess && <Alert type="success" message={actionSuccess} />}

      {/* Summary Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-card-label">Pending Requests</div>
          <div className="metric-card-value" style={{ color: '#d97706' }}>
            {counts?.pending || 0}
          </div>
          <div className="metric-card-sub">Awaiting HR/Manager review</div>
        </div>
        <div className="metric-card">
          <div className="metric-card-label">Approved Requests</div>
          <div className="metric-card-value" style={{ color: '#16a34a' }}>
            {counts?.approved || 0}
          </div>
          <div className="metric-card-sub">Total leaves granted</div>
        </div>
        <div className="metric-card">
          <div className="metric-card-label">Rejected Requests</div>
          <div className="metric-card-value" style={{ color: '#dc2626' }}>
            {counts?.rejected || 0}
          </div>
          <div className="metric-card-sub">Leaves not approved</div>
        </div>
      </div>

      {/* Available Leave Balances */}
      <div className="card">
        <h2 className="card-title">Available Leave Balances</h2>
        {balances && balances.length > 0 ? (
          <div className="balance-grid">
            {balances.map((b) => (
              <div key={b.leaveTypeId} className="balance-card">
                <div className="balance-card-title">{b.leaveTypeName}</div>
                <div className="balance-card-days">
                  <span className="balance-card-num">{b.available}</span>
                  <span className="balance-card-total">days available</span>
                </div>
                <div className="balance-card-used">
                  Allocated: {b.allocated} days &bull; Used: {b.used} days
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No leave quotas assigned yet.</p>
        )}
      </div>

      {/* Recent Leave Requests */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>Recent Leave Applications</h2>
          <Link to="/my-leaves" style={{ fontSize: '13px' }}>
            View All Leaves &rarr;
          </Link>
        </div>

        {recentRequests && recentRequests.length > 0 ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map((req) => (
                  <tr key={req._id}>
                    <td><strong>{req.leaveType?.name || 'N/A'}</strong></td>
                    <td>{new Date(req.startDate).toLocaleDateString()}</td>
                    <td>{new Date(req.endDate).toLocaleDateString()}</td>
                    <td>{req.numberOfDays} {req.numberOfDays === 1 ? 'day' : 'days'}</td>
                    <td><Badge status={req.status} /></td>
                    <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="btn-group">
                        <Link to={`/my-leaves/${req._id}`} className="btn btn-secondary btn-sm">
                          Details
                        </Link>
                        {req.status === 'Pending' && (
                          <button
                            onClick={() => handleCancelRequest(req._id)}
                            className="btn btn-danger btn-sm"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-title">No recent leave requests</div>
            <div className="empty-state-desc">You have not submitted any leave applications yet.</div>
            <Link to="/apply-leave" className="btn btn-primary btn-sm">
              Apply Now
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
