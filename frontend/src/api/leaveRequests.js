import { apiFetch } from './client';

export const applyLeave = (leaveData) => {
  return apiFetch('/leave-requests', {
    method: 'POST',
    body: leaveData
  });
};

export const getMyLeaveRequests = () => {
  return apiFetch('/leave-requests/my', {
    method: 'GET'
  });
};

export const getAllLeaveRequests = (filters = {}) => {
  const query = new URLSearchParams();
  if (filters.status) query.append('status', filters.status);
  if (filters.department) query.append('department', filters.department);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiFetch(`/leave-requests${queryString}`, {
    method: 'GET'
  });
};

export const getLeaveRequestById = (id) => {
  return apiFetch(`/leave-requests/${id}`, {
    method: 'GET'
  });
};

export const cancelLeaveRequest = (id) => {
  return apiFetch(`/leave-requests/${id}/cancel`, {
    method: 'PATCH'
  });
};

export const approveLeaveRequest = (id, data = {}) => {
  return apiFetch(`/leave-requests/${id}/approve`, {
    method: 'PATCH',
    body: data
  });
};

export const rejectLeaveRequest = (id, data = {}) => {
  return apiFetch(`/leave-requests/${id}/reject`, {
    method: 'PATCH',
    body: data
  });
};
