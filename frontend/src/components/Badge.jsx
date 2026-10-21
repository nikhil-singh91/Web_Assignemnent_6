import React from 'react';

export default function Badge({ status }) {
  if (!status) return null;

  const statusLower = status.toLowerCase();
  let badgeClass = 'badge-cancelled';

  if (statusLower === 'pending') {
    badgeClass = 'badge-pending';
  } else if (statusLower === 'approved') {
    badgeClass = 'badge-approved';
  } else if (statusLower === 'rejected') {
    badgeClass = 'badge-rejected';
  } else if (statusLower === 'cancelled') {
    badgeClass = 'badge-cancelled';
  } else if (statusLower === 'active' || status === true) {
    badgeClass = 'badge-active';
  } else if (statusLower === 'inactive' || status === false) {
    badgeClass = 'badge-inactive';
  }

  const label = typeof status === 'boolean' ? (status ? 'Active' : 'Inactive') : status;

  return <span className={`badge ${badgeClass}`}>{label}</span>;
}
