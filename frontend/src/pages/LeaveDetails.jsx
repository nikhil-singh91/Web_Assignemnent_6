import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getLeaveRequestById,
  cancelLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest
} from '../api/leaveRequests';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';
import Badge from '../components/Badge';

export default function LeaveDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Manager action state
  const [managerRemarks, setManagerRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getLeaveRequestById(id);
      setRequest(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load leave request details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this leave application?')) {
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      setSuccess('');
      const res = await cancelLeaveRequest(id);
      setSuccess(res.message || 'Leave request successfully cancelled');
      fetchDetails();
    } catch (err) {
      setError(err.message || 'Failed to cancel request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Approve this leave request and deduct employee balance?')) {
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      setSuccess('');
      const res = await approveLeaveRequest(id, { managerRemarks });
      setSuccess(res.message || 'Leave request approved successfully');
      fetchDetails();
    } catch (err) {
      setError(err.message || 'Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!managerRemarks.trim()) {
      setError('Please provide manager remarks explaining the rejection reason');
      return;
    }

    if (!window.confirm('Reject this leave request?')) {
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      setSuccess('');
      const res = await rejectLeaveRequest(id, { managerRemarks });
      setSuccess(res.message || 'Leave request rejected');
      fetchDetails();
    } catch (err) {
      setError(err.message || 'Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="container loading-container">Loading leave request details...</div>;
  }

  if (!request && !loading) {
    return (
      <div className="container" style={{ marginTop: '30px' }}>
        <Alert type="error" message={error || 'Leave request not found'} />
        <button onClick={() => navigate(-1)} className="btn btn-secondary">
          &larr; Go Back
        </button>
      </div>
    );
  }

  const isOwner = user && request?.employee?._id === user._id;

  return (
    <div className="container" style={{ maxWidth: '820px' }}>
      <div className="page-header">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="btn btn-secondary btn-sm"
            style={{ marginBottom: '8px' }}
          >
            &larr; Back
          </button>
          <h1 className="page-title">
            Leave Request Details <Badge status={request.status} />
          </h1>
          <p className="page-subtitle">Reference ID: {request._id}</p>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      {/* Employee Information Card */}
      <div className="card">
        <h2 className="card-title">Employee Information</h2>
        <div className="detail-grid">
          <div className="detail-item">
            <div className="detail-label">Name</div>
            <div className="detail-value">{request.employee?.name}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Employee ID</div>
            <div className="detail-value">{request.employee?.employeeId}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Department</div>
            <div className="detail-value">{request.employee?.department}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Designation</div>
            <div className="detail-value">{request.employee?.designation}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Email</div>
            <div className="detail-value">{request.employee?.email}</div>
          </div>
        </div>
      </div>

      {/* Leave Details Card */}
      <div className="card">
        <h2 className="card-title">Leave Request Information</h2>
        <div className="detail-grid">
          <div className="detail-item">
            <div className="detail-label">Leave Category</div>
            <div className="detail-value">{request.leaveType?.name}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Duration</div>
            <div className="detail-value">
              {request.numberOfDays} {request.numberOfDays === 1 ? 'day' : 'days'}
            </div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Start Date</div>
            <div className="detail-value">{new Date(request.startDate).toDateString()}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">End Date</div>
            <div className="detail-value">{new Date(request.endDate).toDateString()}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Submitted On</div>
            <div className="detail-value">{new Date(request.createdAt).toLocaleString()}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Current Status</div>
            <div className="detail-value">
              <Badge status={request.status} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: '16px' }}>
          <div className="detail-label">Reason for Request</div>
          <div
            style={{
              padding: '12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              marginTop: '6px',
              fontSize: '14px',
              lineHeight: 1.6
            }}
          >
            {request.reason}
          </div>
        </div>
      </div>

      {/* Manager Review Details */}
      {(request.status === 'Approved' || request.status === 'Rejected' || request.managerRemarks) && (
        <div className="card">
          <h2 className="card-title">Review & Approval Details</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <div className="detail-label">Reviewed By</div>
              <div className="detail-value">{request.reviewedBy?.name || 'Administrator'}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Reviewed At</div>
              <div className="detail-value">
                {request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : 'N/A'}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '12px' }}>
            <div className="detail-label">Manager Remarks</div>
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: request.status === 'Approved' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${request.status === 'Approved' ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: '4px',
                marginTop: '6px',
                fontSize: '14px'
              }}
            >
              {request.managerRemarks || 'No additional remarks provided.'}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="card">
        <h2 className="card-title">Actions</h2>

        {/* Employee cancellation */}
        {request.status === 'Pending' && (isOwner || isAdmin) && (
          <div style={{ marginBottom: isAdmin ? '20px' : '0' }}>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '10px' }}>
              This request is currently pending. You may cancel it if your plans have changed.
            </p>
            <button
              onClick={handleCancel}
              className="btn btn-danger"
              disabled={actionLoading}
            >
              Cancel Leave Request
            </button>
          </div>
        )}

        {/* Admin Review Controls */}
        {isAdmin && request.status === 'Pending' && (
          <div style={{ borderTop: isOwner ? '1px solid #e2e8f0' : 'none', paddingTop: isOwner ? '16px' : '0' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>
              Administrator Review Action
            </h3>
            <div className="form-group">
              <label className="form-label" htmlFor="managerRemarks">
                Manager Remarks (Required for Rejection, Optional for Approval)
              </label>
              <input
                id="managerRemarks"
                type="text"
                className="form-control"
                placeholder="e.g. Approved. Ensure client handover is complete."
                value={managerRemarks}
                onChange={(e) => setManagerRemarks(e.target.value)}
              />
            </div>
            <div className="btn-group">
              <button
                onClick={handleApprove}
                className="btn btn-success"
                disabled={actionLoading}
              >
                &#10003; Approve Leave
              </button>
              <button
                onClick={handleReject}
                className="btn btn-danger"
                disabled={actionLoading}
              >
                &#10005; Reject Leave
              </button>
            </div>
          </div>
        )}

        {request.status !== 'Pending' && (
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            No further actions are permitted for this request (Status: <strong>{request.status}</strong>).
          </p>
        )}
      </div>
    </div>
  );
}
