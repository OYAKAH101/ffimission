import { API_BASE_URL } from '../utils/config';

// Thin wrapper around fetch for the real backend ("api" auth mode).
//
// Security notes:
// - The session lives in an httpOnly cookie set by the server. JavaScript never
//   sees it, so it cannot be stolen by a script and is never put in localStorage.
// - Because the browser attaches that cookie automatically, state-changing
//   requests also send a CSRF token that the server issues and checks.

let csrfToken = null;

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function clearCsrfToken() {
  csrfToken = null;
}

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  const response = await fetch(`${API_BASE_URL}/auth/csrf`, { credentials: 'include' });
  if (!response.ok) {
    throw new ApiError('Could not start a secure session. Please try again.', response.status);
  }
  const data = await response.json();
  csrfToken = data.csrfToken;
  return csrfToken;
}

// `file` sends a File/Blob as the raw request body (used for photograph uploads).
export async function apiRequest(path, { method = 'GET', body, file } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (file) headers['Content-Type'] = file.type;
  if (method !== 'GET') headers['X-CSRF-Token'] = await getCsrfToken();

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: file ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError(
      'Unable to reach the school server. Check your connection and try again.',
      0,
    );
  }

  let data = null;
  if (response.status !== 204) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (response.status === 403 && data?.code === 'CSRF') clearCsrfToken();
    // A 401 anywhere except the sign-in calls means the session has ended.
    if (response.status === 401 && !path.startsWith('/auth/')) {
      window.dispatchEvent(new Event('auth:expired'));
    }
    throw new ApiError(data?.message || 'Something went wrong. Please try again.', response.status, data);
  }

  return data;
}
