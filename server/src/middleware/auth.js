import { timingSafeEqual } from 'node:crypto';
import mongoose from 'mongoose';
import { User } from '../models/index.js';

// Wraps async route handlers so a thrown error reaches the error handler.
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Loads the signed-in account from the database on EVERY request. The session holds only the
// account id, so deactivating an account or changing its role takes effect straight away.
export const loadUser = asyncHandler(async (req, res, next) => {
  req.user = null;
  const userId = req.session?.userId;
  if (userId && mongoose.isValidObjectId(userId)) {
    const user = await User.findById(userId);
    if (user?.active) {
      req.user = user;
    } else {
      // Account removed or disabled since the session began: end the session.
      delete req.session.userId;
    }
  }
  next();
});

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Please sign in.' });
  return next();
}

// Blocks everything except changing the password while a temporary password is still in use.
export function requirePasswordChanged(req, res, next) {
  if (req.user?.mustChangePassword) {
    return res.status(403).json({ code: 'PASSWORD_CHANGE_REQUIRED', message: 'Please choose a new password first.' });
  }
  return next();
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have access to this.' });
  }
  return next();
};

// CSRF: the browser attaches the session cookie by itself, so any state-changing request
// must also carry the secret token the server gave this session (X-CSRF-Token header).
export function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const expected = req.session?.csrf;
  const received = req.get('x-csrf-token');
  if (typeof expected === 'string' && typeof received === 'string') {
    const a = Buffer.from(expected);
    const b = Buffer.from(received);
    if (a.length === b.length && timingSafeEqual(a, b)) return next();
  }
  return res.status(403).json({ code: 'CSRF', message: 'Your session could not be verified. Please try again.' });
}

export const parseId = (value) => (mongoose.isValidObjectId(value) ? String(value) : null);
