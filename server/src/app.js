import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import { config } from './config.js';
import { FRONTEND_DIST } from './lib/paths.js';
import { loadUser, csrfProtection } from './middleware/auth.js';
import { apiLimiter } from './middleware/rateLimit.js';
import authRoutes, { SESSION_COOKIE } from './routes/auth.js';
import pupilRoutes from './routes/pupils.js';
import adminRoutes from './routes/admin.js';
import adminPupilRoutes from './routes/adminPupils.js';
import teacherRoutes from './routes/teacher.js';
import announcementRoutes from './routes/announcements.js';
import adminAnnouncementRoutes from './routes/adminAnnouncements.js';
import termRoutes from './routes/term.js';
import recordRoutes from './routes/records.js';

export function createApp() {
  const app = express();

  // Behind a hosting provider's proxy, trust one hop so https detection and client IPs are right.
  if (config.isProduction) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", 'https://fonts.googleapis.com'],
          styleSrcAttr: ["'unsafe-inline'"], // progress bars set widths with style=""
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
    }),
  );
  app.use(express.json({ limit: '50kb' }));

  app.use(
    session({
      name: SESSION_COOKIE,
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false, // only visitors who need a CSRF token get a stored session
      rolling: true,
      store: MongoStore.create({ client: mongoose.connection.getClient(), ttl: 24 * 60 * 60 }),
      cookie: {
        httpOnly: true, // JavaScript can never read the session cookie
        secure: config.cookieSecure, // https only in production
        sameSite: 'lax',
      },
    }),
  );

  // ---- API
  const api = express.Router();
  api.use(apiLimiter);
  api.use(loadUser);
  api.use(csrfProtection);
  api.get('/health', (req, res) => res.json({ ok: true }));
  api.use('/auth', authRoutes);
  api.use('/', pupilRoutes);
  api.use('/admin', adminRoutes);
  api.use('/admin', adminPupilRoutes);
  api.use('/admin', adminAnnouncementRoutes);
  api.use('/records', recordRoutes);
  api.use('/teacher', teacherRoutes);
  api.use('/announcements', announcementRoutes);
  api.use('/term', termRoutes);
  api.use((req, res) => res.status(404).json({ message: 'Not found.' }));
  app.use('/api', api);

  // ---- The built website, served from the same address so cookies stay first-party.
  if (fs.existsSync(FRONTEND_DIST)) {
    app.use(express.static(FRONTEND_DIST, { index: false, maxAge: '1h' }));
    app.get('*', (req, res) => res.sendFile(path.join(FRONTEND_DIST, 'index.html')));
  }

  // ---- Errors: the browser gets a plain message; details stay in the server log.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    if (err.type === 'entity.too.large') return res.status(413).json({ message: 'That file is too large. Photographs must be under 3 MB.' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid request.' });
    return res.status(500).json({ message: 'Something went wrong on our side. Please try again.' });
  });

  return app;
}
