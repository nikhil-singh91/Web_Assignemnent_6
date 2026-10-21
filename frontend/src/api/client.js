// Robust backend base URL configuration:
// Automatically normalizes trailing slashes and ensures the /api suffix is preserved,
// whether VITE_API_URL is set to "https://api.example.com" or "https://api.example.com/api".
const rawBase = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').trim();
const cleanedBase = rawBase.replace(/\/+$/, '');
const API_BASE_URL = cleanedBase.endsWith('/api') ? cleanedBase : `${cleanedBase}/api`;

/**
 * Universal API fetch helper
 */
export async function apiFetch(endpoint, options = {}) {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${normalizedEndpoint}`;
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data.message || `Request failed with status ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (!error.status) {
      error.message = error.message || 'Network error: could not connect to backend server';
    }
    throw error;
  }
}
