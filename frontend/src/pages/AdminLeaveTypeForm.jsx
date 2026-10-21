import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getLeaveTypeById,
  createLeaveType,
  updateLeaveType
} from '../api/leaveTypes';
import Alert from '../components/Alert';

export default function AdminLeaveTypeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    yearlyQuota: 12,
    isActive: true
  });

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isEditMode) {
      const fetchLeaveType = async () => {
        try {
          setLoading(true);
          const res = await getLeaveTypeById(id);
          const data = res.data;
          setFormData({
            name: data.name,
            description: data.description || '',
            yearlyQuota: data.yearlyQuota,
            isActive: data.isActive
          });
        } catch (err) {
          setErrorMessage(err.message || 'Failed to load leave type details');
        } finally {
          setLoading(false);
        }
      };

      fetchLeaveType();
    }
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const quotaNum = Number(formData.yearlyQuota);
    if (isNaN(quotaNum) || quotaNum < 1 || quotaNum > 365) {
      setErrorMessage('Yearly quota must be a number between 1 and 365 days');
      return;
    }

    setSubmitting(true);

    try {
      if (isEditMode) {
        await updateLeaveType(id, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          yearlyQuota: quotaNum,
          isActive: formData.isActive
        });
      } else {
        await createLeaveType({
          name: formData.name.trim(),
          description: formData.description.trim(),
          yearlyQuota: quotaNum,
          isActive: formData.isActive
        });
      }

      navigate('/admin/leave-types');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save leave type');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="container loading-container">Loading leave type form...</div>;
  }

  return (
    <div className="container" style={{ maxWidth: '640px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isEditMode ? 'Edit Leave Category' : 'Create New Leave Category'}
          </h1>
          <p className="page-subtitle">Configure title, annual quota, and active status</p>
        </div>
      </div>

      {errorMessage && <Alert type="error" message={errorMessage} />}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Leave Category Name <span className="required">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              className="form-control"
              placeholder="e.g. Casual Leave (CL)"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="yearlyQuota">
              Annual Days Quota (Days per calendar year) <span className="required">*</span>
            </label>
            <input
              id="yearlyQuota"
              name="yearlyQuota"
              type="number"
              min="1"
              max="365"
              className="form-control"
              value={formData.yearlyQuota}
              onChange={handleChange}
              required
            />
            <div className="form-helper">
              Standard yearly days credited to employees for this category.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="description">
              Description / Policy Details
            </label>
            <textarea
              id="description"
              name="description"
              className="form-textarea"
              rows="3"
              placeholder="Brief summary of policy conditions, guidelines, or notice requirements..."
              value={formData.description}
              onChange={handleChange}
            ></textarea>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              id="isActive"
              name="isActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={handleChange}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="isActive" style={{ fontSize: '14px', cursor: 'pointer', userSelect: 'none' }}>
              Active (Employees can apply for this leave category)
            </label>
          </div>

          <div className="btn-group" style={{ marginTop: '24px' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting
                ? 'Saving...'
                : isEditMode
                ? 'Update Leave Category'
                : 'Create Leave Category'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/admin/leave-types')}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
