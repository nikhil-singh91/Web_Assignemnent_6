import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getLeaveTypes, deleteLeaveType, initDefaultLeaveTypes } from '../api/leaveTypes';
import Alert from '../components/Alert';
import Badge from '../components/Badge';

export default function AdminLeaveTypes() {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchLeaveTypes = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getLeaveTypes();
      setLeaveTypes(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load leave types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const handleInitDefaults = async () => {
    try {
      setActionLoading(true);
      setError('');
      setSuccess('');
      const res = await initDefaultLeaveTypes();
      setSuccess(res.message || 'Default leave categories initialized successfully');
      fetchLeaveTypes();
    } catch (err) {
      setError(err.message || 'Failed to initialize default leave categories');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete leave type '${name}'?`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      const res = await deleteLeaveType(id);
      setSuccess(res.message || `Leave type '${name}' deleted successfully`);
      fetchLeaveTypes();
    } catch (err) {
      setError(err.message || 'Failed to delete leave type');
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave Categories & Quotas</h1>
          <p className="page-subtitle">Configure company leave types and annual day allocations</p>
        </div>
        <div className="btn-group">
          <button
            type="button"
            onClick={handleInitDefaults}
            className="btn btn-secondary"
            disabled={actionLoading}
            title="Restore standard categories (Casual, Sick, Earned Leave) without duplicates"
          >
            {actionLoading ? 'Initializing...' : 'Reset / Add Defaults'}
          </button>
          <Link to="/admin/leave-types/new" className="btn btn-primary">
            + Add New Leave Type
          </Link>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <div className="card">
        {loading ? (
          <div className="loading-container">Loading leave types...</div>
        ) : leaveTypes.length > 0 ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Description</th>
                  <th>Annual Quota</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaveTypes.map((type) => (
                  <tr key={type._id}>
                    <td>
                      <strong>{type.name}</strong>
                    </td>
                    <td style={{ color: '#475569', fontSize: '13px' }}>
                      {type.description || 'No description provided'}
                    </td>
                    <td>
                      <strong>{type.yearlyQuota}</strong> days / year
                    </td>
                    <td>
                      <Badge status={type.isActive} />
                    </td>
                    <td>
                      <div className="btn-group">
                        <Link
                          to={`/admin/leave-types/${type._id}/edit`}
                          className="btn btn-secondary btn-sm"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(type._id, type.name)}
                          className="btn btn-danger btn-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-title">No leave categories defined</div>
            <div className="empty-state-desc">
              Initialize standard categories (Casual Leave 12d, Sick Leave 10d, Earned Leave 15d) or create a custom category.
            </div>
            <div className="btn-group" style={{ justifyContent: 'center', marginTop: '14px' }}>
              <button
                type="button"
                onClick={handleInitDefaults}
                className="btn btn-secondary btn-sm"
                disabled={actionLoading}
              >
                {actionLoading ? 'Initializing...' : 'Initialize Default Categories'}
              </button>
              <Link to="/admin/leave-types/new" className="btn btn-primary btn-sm">
                Add Custom Leave Type
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
