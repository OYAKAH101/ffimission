import { z } from 'zod';

// Settings come from server/.env (loaded by `node --env-file=.env`, see package.json) or the
// hosting provider's environment variables. Nothing secret lives in the code.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  // Encrypts the pupil passwords the administrator can look up. Keep it safe: without it those
  // stored copies cannot be read (new passwords can still be issued).
  CREDENTIAL_KEY: z.string().min(32, 'CREDENTIAL_KEY must be at least 32 characters'),
  // Cookies are https-only in production. Set COOKIE_SECURE=false only to test a production
  // build over plain http on your own computer.
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Fail at start-up with a readable list, never run half-configured.
  const lines = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
  console.error(`Server configuration is invalid:\n${lines.join('\n')}\nSee server/.env.example.`);
  process.exit(1);
}

const env = parsed.data;
const isProduction = env.NODE_ENV === 'production';

export const config = Object.freeze({
  env: env.NODE_ENV,
  isProduction,
  port: env.PORT,
  mongoUri: env.MONGODB_URI,
  sessionSecret: env.SESSION_SECRET,
  credentialKey: env.CREDENTIAL_KEY,
  cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : isProduction,
});
