import { apiFetch } from './client';

export const getEmployeeDashboard = () => {
  return apiFetch('/dashboard/employee', {
    method: 'GET'
  });
};

export const getAdminDashboard = () => {
  return apiFetch('/dashboard/admin', {
    method: 'GET'
  });
};
