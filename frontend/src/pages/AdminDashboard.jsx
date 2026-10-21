import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAdminDashboard } from '../api/dashboard';
import Alert from '../components/Alert';
import Badge from '../components/Badge';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getAdminDashboard();
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load administrator dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return <div className="container loading-container">Loading admin metrics...</div>;
  }

  const { summary, employeesOnLeaveToday, departmentWiseLeaves, recentRequests } = data || {};

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Administrator Dashboard</h1>
          <p className="page-subtitle">Company overview, leave requests, and workforce availability</p>
        </div>
        <div className="btn-group">
          <Link to="/admin/requests" className="btn btn-primary">
            Review Pending Requests ({summary?.pendingRequests || 0})
          </Link>
          <Link to="/admin/leave-types" className="btn btn-secondary">
            Manage Leave Quotas
          </Link>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-card-label">Total Employees</div>
          <div className="metric-card-value">{summary?.totalEmployees || 0}</div>
          <div className="metric-card-sub">Active registered workforce</div>
        </div>
        <div className="metric-card">
          <div className="metric-card-label">Pending Reviews</div>
          <div className="metric-card-value" style={{ color: '#d97706' }}>
            {summary?.pendingRequests || 0}
          </div>
          <div className="metric-card-sub">Awaiting administrative decision</div>
        </div>
        <div className="metric-card">
          <div className="metric-card-label">On Leave Today</div>
          <div className="metric-card-value" style={{ color: '#2563eb' }}>
            {summary?.employeesOnLeaveTodayCount || 0}
          </div>
          <div className="metric-card-sub">Approved leaves active today</div>
        </div>
        <div className="metric-card">
          <div className="metric-card-label">Total Approved</div>
          <div className="metric-card-value" style={{ color: '#16a34a' }}>
            {summary?.approvedRequests || 0}
          </div>
          <div className="metric-card-sub">Historical approved leaves</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Employees on Leave Today */}
        <div className="card">
          <h2 className="card-title">Employees on Leave Today ({employeesOnLeaveToday?.length || 0})</h2>
          {employeesOnLeaveToday && employeesOnLeaveToday.length > 0 ? (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Leave Type</th>
                    <th>Returning</th>
                  </tr>
                </thead>
                <tbody>
                  {employeesOnLeaveToday.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <strong>{item.employee?.name}</strong>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {item.employee?.employeeId}
                        </div>
                      </td>
                      <td>{item.employee?.department}</td>
                      <td>{item.leaveType?.name}</td>
                      <td>
                        {new Date(
                          new Date(item.endDate).getTime() + 24 * 60 * 60 * 1000
                        ).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state" style={{ padding: '24px' }}>
              No employees are currently on approved leave today.
            </p>
          )}
        </div>

        {/* Department-wise Leave Count */}
        <div className="card">
          <h2 className="card-title">Department-wise Leave Distribution</h2>
          {departmentWiseLeaves && departmentWiseLeaves.length > 0 ? (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Approved Leaves</th>
                    <th>Total Days Granted</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentWiseLeaves.map((dept) => (
                    <tr key={dept.department}>
                      <td>
                        <strong>{dept.department}</strong>
                      </td>
                      <td>{dept.count} leaves</td>
                      <td>{dept.totalDays} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state" style={{ padding: '24px' }}>
              No department leave data recorded yet.
            </p>
          )}
        </div>
      </div>

      {/* Recent Leave Requests Across Organization */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
            Recent Requests Across Organization
          </h2>
          <Link to="/admin/requests" style={{ fontSize: '13px' }}>
            View & Filter All Requests &rarr;
          </Link>
        </div>

        {recentRequests && recentRequests.length > 0 ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Leave Type</th>
                  <th>Duration</th>
                  <th>Dates</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map((req) => (
                  <tr key={req._id}>
                    <td>
                      <strong>{req.employee?.name}</strong>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {req.employee?.employeeId}
                      </div>
                    </td>
                    <td>{req.employee?.department}</td>
                    <td>{req.leaveType?.name}</td>
                    <td>{req.numberOfDays} days</td>
                    <td>
                      {new Date(req.startDate).toLocaleDateString()} &ndash;{' '}
                      {new Date(req.endDate).toLocaleDateString()}
                    </td>
                    <td><Badge status={req.status} /></td>
                    <td>
                      <Link to={`/my-leaves/${req._id}`} className="btn btn-secondary btn-sm">
                        Review Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No leave applications recorded in database.</div>
        )}
      </div>
    </div>
  );
}
