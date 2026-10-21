import { apiFetch } from './client';

export const getLeaveTypes = () => {
  return apiFetch('/leave-types', {
    method: 'GET'
  });
};

export const getLeaveTypeById = (id) => {
  return apiFetch(`/leave-types/${id}`, {
    method: 'GET'
  });
};

export const createLeaveType = (data) => {
  return apiFetch('/leave-types', {
    method: 'POST',
    body: data
  });
};

export const updateLeaveType = (id, data) => {
  return apiFetch(`/leave-types/${id}`, {
    method: 'PUT',
    body: data
  });
};

export const deleteLeaveType = (id) => {
  return apiFetch(`/leave-types/${id}`, {
    method: 'DELETE'
  });
};

export const initDefaultLeaveTypes = () => {
  return apiFetch('/leave-types/init-defaults', {
    method: 'POST'
  });
};
