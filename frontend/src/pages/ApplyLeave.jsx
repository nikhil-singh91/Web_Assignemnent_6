import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeaveTypes } from '../api/leaveTypes';
import { applyLeave } from '../api/leaveRequests';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';

export default function ApplyLeave() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch active leave types from backend
  const fetchTypes = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError('');
      setErrorMessage('');
      const res = await getLeaveTypes();
      const types = res.data || [];
      setLeaveTypes(types);

      // If only one leave category exists, auto-select it
      if (types.length === 1) {
        setSelectedLeaveType(types[0]._id);
      } else if (types.length > 1 && !selectedLeaveType) {
        // Keep placeholder selected so the user makes an explicit choice
        setSelectedLeaveType('');
      }
    } catch (err) {
      setFetchError(err.message || 'Failed to load leave types from server');
    } finally {
      setLoading(false);
    }
  }, [selectedLeaveType]);

  useEffect(() => {
    fetchTypes();
  }, []);

  // Compute available balance for selected leave type
  const currentBalance = useMemo(() => {
    if (!user || !user.leaveBalances || !selectedLeaveType) return null;
    const record = user.leaveBalances.find(
      (b) => b.leaveType && (b.leaveType._id === selectedLeaveType || b.leaveType === selectedLeaveType)
    );
    if (!record) return null;
    return record.allocated - record.used;
  }, [user, selectedLeaveType]);

  // Calculate inclusive duration in days (e.g. Mon to Mon = 1 day, Mon to Tue = 2 days)
  const calculatedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    if (end < start) return -1; // End before start is invalid

    const diffMs = end.getTime() - start.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!selectedLeaveType) {
      setErrorMessage('Please choose a valid leave type from the dropdown');
      return;
    }

    if (!startDate || !endDate) {
      setErrorMessage('Please select both start date and end date');
      return;
    }

    if (calculatedDays <= 0) {
      setErrorMessage('End date cannot be earlier than start date');
      return;
    }

    if (currentBalance !== null && calculatedDays > currentBalance) {
      setErrorMessage(
        `Insufficient balance: Requested ${calculatedDays} days, but you only have ${currentBalance} days remaining for this leave type.`
      );
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('Please describe the reason for your leave');
      return;
    }

    setSubmitting(true);

    try {
      const res = await applyLeave({
        leaveType: selectedLeaveType,
        startDate,
        endDate,
        reason: reason.trim()
      });

      setSuccessMessage(res.message || 'Leave request submitted successfully!');
      await refreshUser();

      setTimeout(() => {
        navigate('/my-leaves');
      }, 1200);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '680px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Apply for Leave</h1>
          <p className="page-subtitle">Submit a leave application for manager approval</p>
        </div>
      </div>

      {/* Fetch error with Retry button */}
      {fetchError && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            marginBottom: '16px',
            color: '#991b1b',
            fontSize: '14px'
          }}
        >
          <span>
            <strong>Error loading leave types:</strong> {fetchError}
          </span>
          <button
            type="button"
            onClick={fetchTypes}
            className="btn btn-secondary btn-sm"
            style={{ marginLeft: '12px' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State Banner if no leave types exist */}
      {!loading && !fetchError && leaveTypes.length === 0 && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            marginBottom: '16px',
            color: '#1e40af',
            fontSize: '14px'
          }}
        >
          <strong style={{ display: 'block', marginBottom: '4px' }}>
            No leave categories available:
          </strong>
          There are currently no leave types configured in the system. The administrator needs to
          create leave categories (such as Casual Leave or Sick Leave) before employees can submit
          applications.
        </div>
      )}

      {errorMessage && <Alert type="error" message={errorMessage} />}
      {successMessage && <Alert type="success" message={successMessage} />}

      <div className="card">
        {loading ? (
          <div className="loading-container" style={{ padding: '30px 0', textAlign: 'center' }}>
            <p style={{ color: '#475569', fontSize: '15px' }}>Loading available leave options...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="leaveType">
                Leave Type <span className="required">*</span>
              </label>
              <select
                id="leaveType"
                className="form-select"
                value={selectedLeaveType}
                onChange={(e) => setSelectedLeaveType(e.target.value)}
                required
                disabled={leaveTypes.length === 0}
              >
                <option value="">-- Select Leave Type --</option>
                {leaveTypes.map((type) => (
                  <option key={type._id} value={type._id}>
                    {type.name} (Quota: {type.yearlyQuota} days/yr)
                  </option>
                ))}
              </select>

              {currentBalance !== null && (
                <div className="form-helper">
                  Your remaining available balance for this category:{' '}
                  <strong>{currentBalance} day(s)</strong>
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="startDate">
                  Start Date <span className="required">*</span>
                </label>
                <input
                  id="startDate"
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="endDate">
                  End Date <span className="required">*</span>
                </label>
                <input
                  id="endDate"
                  type="date"
                  className="form-control"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Dynamic duration preview */}
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: calculatedDays < 0 ? '#fee2e2' : '#f1f5f9',
                borderRadius: '4px',
                marginBottom: '16px',
                border: '1px solid #e2e8f0',
                fontSize: '14px'
              }}
            >
              {calculatedDays < 0 ? (
                <span style={{ color: '#dc2626', fontWeight: 600 }}>
                  Invalid date range: End date must be on or after start date.
                </span>
              ) : (
                <span>
                  Calculated duration (inclusive):{' '}
                  <strong style={{ color: '#2563eb', fontSize: '16px' }}>
                    {calculatedDays} {calculatedDays === 1 ? 'day' : 'days'}
                  </strong>
                  {currentBalance !== null && calculatedDays > currentBalance && (
                    <span style={{ color: '#dc2626', marginLeft: '10px', fontWeight: 600 }}>
                      (Exceeds your available balance of {currentBalance} days)
                    </span>
                  )}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reason">
                Reason for Leave <span className="required">*</span>
              </label>
              <textarea
                id="reason"
                className="form-textarea"
                placeholder="Please provide a brief, clear explanation for your leave request..."
                rows="4"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              ></textarea>
              <div className="form-helper">
                Maximum 500 characters. Will be reviewed by your department manager/administrator.
              </div>
            </div>

            <div className="btn-group" style={{ marginTop: '24px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  submitting ||
                  !selectedLeaveType ||
                  leaveTypes.length === 0 ||
                  calculatedDays <= 0 ||
                  (currentBalance !== null && calculatedDays > currentBalance)
                }
              >
                {submitting ? 'Submitting Application...' : 'Submit Leave Request'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(-1)}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
