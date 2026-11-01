import rateLimit from 'express-rate-limit';

const limiter = (options) =>
  rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
    handler: (req, res) => res.status(429).json({ message: options.message }),
  });

// Failed attempts only: a successful login does not use up the allowance.
export const loginLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: 'Too many sign-in attempts. Please wait 15 minutes and try again.',
});

export const forgotPasswordLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: 'Too many requests. Please try again later.',
});

export const passwordChangeLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: 'Too many attempts. Please wait and try again.',
});

// A generous ceiling for everything else under /api.
export const apiLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  message: 'Too many requests. Please slow down.',
});
