import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/index.js';
import { asyncHandler, requireAuth } from '../middleware/auth.js';
import { forgotPasswordLimiter, loginLimiter, passwordChangeLimiter } from '../middleware/rateLimit.js';
import { DUMMY_HASH, hashPassword, verifyPassword } from '../lib/passwords.js';
import { passwordProblem } from '../lib/passwordPolicy.js';
import { LOCKOUT, ROLES } from '../lib/constants.js';
import { audit } from '../lib/audit.js';

export const SESSION_COOKIE = 'immaculate.sid';
const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;

const GENERIC_LOGIN_ERROR = 'Incorrect email/username or password.';

// Strict string-only schemas also stop NoSQL-injection tricks such as { "$gt": "" }.
const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(200),
  password: z.string().min(1).max(128),
  remember: z.boolean().optional(),
});
const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email().max(200) });
const changeSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(1).max(128),
});

const newCsrf = () => randomBytes(32).toString('hex');
const regenerate = (req) => new Promise((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));

// Starts a fresh session for a user. A new session id on every sign-in blocks session fixation.
async function startSession(req, user, remember) {
  await regenerate(req);
  req.session.userId = String(user._id);
  req.session.csrf = newCsrf();
  if (remember) req.session.cookie.maxAge = REMEMBER_MS;
}

const router = Router();

// The browser asks for this before any POST and sends the value back in X-CSRF-Token.
router.get('/csrf', (req, res) => {
  if (!req.session.csrf) req.session.csrf = newCsrf();
  res.set('Cache-Control', 'no-store');
  res.json({ csrfToken: req.session.csrf });
});

router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Enter your email or username and your password.' });
    const { password, remember } = parsed.data;
    const identifier = parsed.data.identifier.toLowerCase();

    const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] }).select('+passwordHash');

    // Always run one bcrypt comparison, even for an unknown account, so timing reveals nothing.
    const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
    const locked = Boolean(user?.lockedUntil && user.lockedUntil > new Date());

    if (!user || !user.active || locked || !passwordOk) {
      if (user && user.active && !locked) {
        const updated = await User.findByIdAndUpdate(user._id, { $inc: { failedLogins: 1 } }, { new: true });
        if (updated.failedLogins >= LOCKOUT.maxFailures) {
          await User.updateOne(
            { _id: user._id },
            { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCKOUT.minutes * 60 * 1000) },
          );
          await audit({ action: 'account_locked', actorId: user._id, message: `${user.name}'s account was locked after repeated failed sign-ins.`, ip: req.ip });
        }
      }
      await audit({
        action: 'login_failed',
        actorId: user?._id,
        message: user ? `Failed sign-in for ${user.name}.` : 'Failed sign-in for an unknown account.',
        ip: req.ip,
      });
      // Same answer whether the account exists, the password is wrong, or the account is locked.
      return res.status(401).json({ message: GENERIC_LOGIN_ERROR });
    }

    await User.updateOne({ _id: user._id }, { failedLogins: 0, $unset: { lockedUntil: 1 }, lastLoginAt: new Date() });
    await startSession(req, user, remember);
    await audit({ action: 'login', actorId: user._id, message: `${user.name} signed in.`, ip: req.ip });
    return res.json({ user: user.toPublic() });
  }),
);

router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Not signed in.' });
  res.set('Cache-Control', 'no-store');
  return res.json({ user: req.user.toPublic() });
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie(SESSION_COOKIE);
    return res.status(204).end();
  });
});

// Email delivery is not set up yet. This records the request for the school office, who then
// issue a new temporary password with `npm run reset-password`. The answer is identical
// whether or not the address belongs to an account.
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  asyncHandler(async (req, res) => {
    const parsed = forgotSchema.safeParse(req.body);
    if (parsed.success) {
      const user = await User.findOne({ email: parsed.data.email, active: true });
      if (user) {
        await audit({ action: 'password_reset_requested', actorId: user._id, message: `${user.name} asked for a password reset.`, ip: req.ip });
      }
    }
    res.status(204).end();
  }),
);

router.post(
  '/change-password',
  requireAuth,
  passwordChangeLimiter,
  asyncHandler(async (req, res) => {
    // Pupil passwords are issued and looked after by the school office.
    if (req.user.role === ROLES.STUDENT) return res.status(403).json({ message: 'Your password is set by the school office. Ask them if you need it.' });
    const parsed = changeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Enter your current and new password.' });
    const { currentPassword, newPassword } = parsed.data;

    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      return res.status(400).json({ message: 'Your current password is not correct.', field: 'currentPassword' });
    }
    const problem = passwordProblem(newPassword, { login: user.email ?? user.username });
    if (problem) return res.status(400).json({ message: problem, field: 'newPassword' });
    if (await verifyPassword(newPassword, user.passwordHash)) {
      return res.status(400).json({ message: 'Choose a password you have not used before.', field: 'newPassword' });
    }

    user.passwordHash = await hashPassword(newPassword);
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();
    await user.save();

    await startSession(req, user, false);
    await audit({ action: 'password_changed', actorId: user._id, message: `${user.name} changed their password.`, ip: req.ip });
    return res.json({ user: user.toPublic() });
  }),
);

export default router;
