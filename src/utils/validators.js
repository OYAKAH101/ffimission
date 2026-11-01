const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[A-Za-z0-9._-]{3,32}$/;

export function isValidEmail(value) {
  return EMAIL_RE.test(value.trim());
}

// Client-side checks only improve the experience. The server must validate
// everything again because anyone can bypass the browser.
export function validateLogin({ identifier, password }) {
  const errors = {};
  const id = identifier.trim();

  if (!id) {
    errors.identifier = 'Enter your email address or username.';
  } else if (id.includes('@')) {
    if (!isValidEmail(id)) {
      errors.identifier = 'Enter a valid email address, for example name@example.com.';
    }
  } else if (!USERNAME_RE.test(id)) {
    errors.identifier =
      'Usernames are 3 to 32 characters: letters, numbers, dots, dashes or underscores.';
  }

  if (!password) {
    errors.password = 'Enter your password.';
  } else if (password.length < 6) {
    errors.password = 'Passwords are at least 6 characters long.';
  }

  return errors;
}

export function validateEmailOnly(email) {
  const value = email.trim();
  if (!value) return 'Enter the email address linked to your account.';
  if (!isValidEmail(value)) return 'Enter a valid email address, for example name@example.com.';
  return '';
}
