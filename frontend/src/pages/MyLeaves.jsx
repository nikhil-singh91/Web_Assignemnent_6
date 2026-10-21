import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyLeaveRequests, cancelLeaveRequest } from '../api/leaveRequests';
import Alert from '../components/Alert';
import Badge from '../components/Badge';

export default function MyLeaves() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getMyLeaveRequests();
      setRequests(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load your leave history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this leave application?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      const res = await cancelLeaveRequest(id);
      setSuccess(res.message || 'Leave request cancelled successfully');
      fetchRequests();
    } catch (err) {
      setError(err.message || 'Failed to cancel leave request');
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === 'ALL') return true;
    return r.status.toUpperCase() === statusFilter;
  });

  if (loading) {
    return <div className="container loading-container">Loading your leave requests...</div>;
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Leave Applications</h1>
          <p className="page-subtitle">Track your leave history, approval status, and remarks</p>
        </div>
        <Link to="/apply-leave" className="btn btn-primary">
          + New Leave Application
        </Link>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      {/* Filter Bar */}
      <div className="filter-bar">
        <label htmlFor="statusFilter" style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
          Filter by Status:
        </label>
        <select
          id="statusFilter"
          className="form-select"
          style={{ width: 'auto', padding: '4px 10px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Applications ({requests.length})</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="card">
        {filteredRequests.length > 0 ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>Dates (Start — End)</th>
                  <th>Duration</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
                  <tr key={req._id}>
                    <td>
                      <strong>{req.leaveType?.name || 'N/A'}</strong>
                    </td>
                    <td>
                      {new Date(req.startDate).toLocaleDateString()} &mdash;{' '}
                      {new Date(req.endDate).toLocaleDateString()}
                    </td>
                    <td>
                      {req.numberOfDays} {req.numberOfDays === 1 ? 'day' : 'days'}
                    </td>
                    <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.reason}>
                      {req.reason}
                    </td>
                    <td>
                      <Badge status={req.status} />
                    </td>
                    <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="btn-group">
                        <Link to={`/my-leaves/${req._id}`} className="btn btn-secondary btn-sm">
                          View
                        </Link>
                        {req.status === 'Pending' && (
                          <button
                            onClick={() => handleCancel(req._id)}
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
            <div className="empty-state-title">No leave applications found</div>
            <div className="empty-state-desc">
              {statusFilter === 'ALL'
                ? "You haven't submitted any leave applications yet."
                : `No leave applications with status '${statusFilter.toLowerCase()}'.`}
            </div>
            {statusFilter === 'ALL' && (
              <Link to="/apply-leave" className="btn btn-primary btn-sm">
                Apply for Leave
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
