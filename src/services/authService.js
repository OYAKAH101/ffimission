import { apiRequest, clearCsrfToken } from './apiClient';

// The rest of the app only talks to this file for sign-in. Passwords are checked by the
// server; the browser keeps no password or token (the session is an httpOnly cookie).

export async function login({ identifier, password, remember }) {
  clearCsrfToken();
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: { identifier, password, remember },
  });
  clearCsrfToken(); // the session changed, so fetch a fresh CSRF token next time
  return data.user;
}

export async function getCurrentUser() {
  try {
    const data = await apiRequest('/auth/me');
    return data.user;
  } catch (error) {
    if (error.status === 401) return null; // not signed in
    throw error;
  }
}

export async function logout() {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } finally {
    clearCsrfToken();
  }
}

export async function changePassword({ currentPassword, newPassword }) {
  const data = await apiRequest('/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });
  clearCsrfToken(); // the server started a new session
  return data.user;
}

// Email delivery is not set up: the server records the request for the school office.
// The answer is the same whether or not the address belongs to an account.
export async function requestPasswordReset(email) {
  await apiRequest('/auth/forgot-password', { method: 'POST', body: { email } });
}
