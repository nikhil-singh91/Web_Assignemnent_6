import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getAllLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest
} from '../api/leaveRequests';
import Alert from '../components/Alert';
import Badge from '../components/Badge';

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Modal / Inline review state
  const [activeReviewReq, setActiveReviewReq] = useState(null);
  const [managerRemarks, setManagerRemarks] = useState('');
  const [reviewAction, setReviewAction] = useState(''); // 'approve' | 'reject'
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError('');
      const filters = {};
      if (statusFilter) filters.status = statusFilter;
      if (deptFilter) filters.department = deptFilter;

      const res = await getAllLeaveRequests(filters);
      setRequests(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load company leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, deptFilter]);

  const openReviewModal = (req, action) => {
    setActiveReviewReq(req);
    setReviewAction(action);
    setManagerRemarks('');
    setError('');
    setSuccess('');
  };

  const closeReviewModal = () => {
    setActiveReviewReq(null);
    setReviewAction('');
    setManagerRemarks('');
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!activeReviewReq) return;

    if (reviewAction === 'reject' && !managerRemarks.trim()) {
      setError('Please provide manager remarks explaining the rejection reason');
      return;
    }

    try {
      setSubmittingReview(true);
      setError('');
      setSuccess('');

      if (reviewAction === 'approve') {
        const res = await approveLeaveRequest(activeReviewReq._id, { managerRemarks });
        setSuccess(res.message || 'Leave request approved successfully');
      } else {
        const res = await rejectLeaveRequest(activeReviewReq._id, { managerRemarks });
        setSuccess(res.message || 'Leave request rejected successfully');
      }

      closeReviewModal();
      fetchRequests();
    } catch (err) {
      setError(err.message || `Failed to ${reviewAction} leave request`);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Leave Requests</h1>
          <p className="page-subtitle">Review, approve, or reject company-wide leave applications</p>
        </div>
        <Link to="/admin/dashboard" className="btn btn-secondary">
          &larr; Admin Dashboard
        </Link>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      {/* Review Modal Dialog */}
      {activeReviewReq && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px'
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '540px',
              width: '100%',
              margin: 0,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            <h2 className="card-title">
              {reviewAction === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
            </h2>

            <div style={{ fontSize: '14px', marginBottom: '14px' }}>
              <p>
                <strong>Employee:</strong> {activeReviewReq.employee?.name} (
                {activeReviewReq.employee?.employeeId})
              </p>
              <p>
                <strong>Leave:</strong> {activeReviewReq.leaveType?.name} &bull;{' '}
                {activeReviewReq.numberOfDays} days
              </p>
              <p>
                <strong>Dates:</strong>{' '}
                {new Date(activeReviewReq.startDate).toLocaleDateString()} to{' '}
                {new Date(activeReviewReq.endDate).toLocaleDateString()}
              </p>
              <p style={{ marginTop: '8px', color: '#475569' }}>
                <strong>Reason:</strong> {activeReviewReq.reason}
              </p>
            </div>

            <form onSubmit={submitReview}>
              <div className="form-group">
                <label className="form-label" htmlFor="modalRemarks">
                  Manager Remarks{' '}
                  {reviewAction === 'reject' && <span className="required">*</span>}
                </label>
                <textarea
                  id="modalRemarks"
                  className="form-textarea"
                  rows="3"
                  placeholder={
                    reviewAction === 'approve'
                      ? 'e.g. Approved. Client delivery covered.'
                      : 'Please explain the rationale for rejecting this leave...'
                  }
                  value={managerRemarks}
                  onChange={(e) => setManagerRemarks(e.target.value)}
                  required={reviewAction === 'reject'}
                ></textarea>
              </div>

              <div className="btn-group" style={{ justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeReviewModal}
                  disabled={submittingReview}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={reviewAction === 'approve' ? 'btn btn-success' : 'btn btn-danger'}
                  disabled={submittingReview}
                >
                  {submittingReview
                    ? 'Processing...'
                    : reviewAction === 'approve'
                    ? 'Confirm Approval'
                    : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="filter-bar">
        <div>
          <label htmlFor="status" style={{ fontSize: '13px', fontWeight: 600, marginRight: '8px' }}>
            Status:
          </label>
          <select
            id="status"
            className="form-select"
            style={{ width: 'auto', display: 'inline-block' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label htmlFor="dept" style={{ fontSize: '13px', fontWeight: 600, marginRight: '8px' }}>
            Department:
          </label>
          <select
            id="dept"
            className="form-select"
            style={{ width: 'auto', display: 'inline-block' }}
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Product">Product</option>
            <option value="Marketing">Marketing</option>
            <option value="Finance">Finance</option>
            <option value="Human Resources">Human Resources</option>
            <option value="Operations">Operations</option>
          </select>
        </div>

        {(statusFilter || deptFilter) && (
          <button
            onClick={() => {
              setStatusFilter('');
              setDeptFilter('');
            }}
            className="btn btn-secondary btn-sm"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-container">Loading leave requests...</div>
        ) : requests.length > 0 ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Leave Type</th>
                  <th>Dates (Start &mdash; End)</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req._id}>
                    <td>
                      <strong>{req.employee?.name || 'Unknown'}</strong>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {req.employee?.employeeId} &bull; {req.employee?.designation}
                      </div>
                    </td>
                    <td>{req.employee?.department || 'N/A'}</td>
                    <td>{req.leaveType?.name || 'N/A'}</td>
                    <td>
                      {new Date(req.startDate).toLocaleDateString()} &mdash;{' '}
                      {new Date(req.endDate).toLocaleDateString()}
                    </td>
                    <td>{req.numberOfDays} d</td>
                    <td>
                      <Badge status={req.status} />
                    </td>
                    <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="btn-group">
                        <Link to={`/my-leaves/${req._id}`} className="btn btn-secondary btn-sm">
                          Details
                        </Link>
                        {req.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => openReviewModal(req, 'approve')}
                              className="btn btn-success btn-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openReviewModal(req, 'reject')}
                              className="btn btn-danger btn-sm"
                            >
                              Reject
                            </button>
                          </>
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
            <div className="empty-state-title">No matching leave requests found</div>
            <div className="empty-state-desc">
              Try adjusting your department or status filter criteria.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
