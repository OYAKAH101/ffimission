import { Router } from 'express';
import { asyncHandler, requireAuth, requirePasswordChanged } from '../middleware/auth.js';
import { currentTerm } from '../lib/pupilOverview.js';

const router = Router();

// The session and term the school is currently running, shown in the top bar of every dashboard.
router.get(
  '/',
  requireAuth,
  requirePasswordChanged,
  asyncHandler(async (req, res) => {
    const term = await currentTerm();
    res.set('Cache-Control', 'no-store');
    res.json({ term: term ? { session: term.session, term: term.term } : null });
  }),
);

export default router;
