// Rules for choosing a password. Kept separate from hashing so it is easy to test.

const COMMON = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890',
  'qwertyuiop', 'immaculate', 'immaculate1', 'welcome123', 'iloveyou', '11111111',
]);

// Returns an error message, or null when the password is acceptable.
export function passwordProblem(password, { login } = {}) {
  if (typeof password !== 'string' || password.length < 8) return 'Use at least 8 characters.';
  if (password.length > 128) return 'Use 128 characters or fewer.';
  if (COMMON.has(password.toLowerCase())) return 'That password is too common. Choose something harder to guess.';
  if (login && password.toLowerCase() === String(login).toLowerCase()) return 'Your password must not be the same as your login.';
  if (/^(.)\1+$/.test(password)) return 'Do not repeat one character.';
  return null;
}
