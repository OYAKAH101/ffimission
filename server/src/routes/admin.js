import { Router } from 'express';
import { AuditLog, FeeItem, Payment, Pupil, SchoolClass, User } from '../models/index.js';
import { asyncHandler, requireAuth, requirePasswordChanged, requireRole } from '../middleware/auth.js';
import { ROLES } from '../lib/constants.js';
import { currentTerm } from '../lib/pupilOverview.js';

const router = Router();
router.use(requireAuth, requirePasswordChanged, requireRole(ROLES.ADMIN));

// Everything the administrator's dashboard shows, computed from the real records.
router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const [pupils, teachers, classes, counts, term] = await Promise.all([
      Pupil.countDocuments({ status: 'active' }),
      User.countDocuments({ role: ROLES.TEACHER, active: true }),
      SchoolClass.find().sort({ order: 1, name: 1 }).lean(),
      Pupil.aggregate([{ $match: { status: 'active' } }, { $group: { _id: '$classId', n: { $sum: 1 } } }]),
      currentTerm(),
    ]);
    const perClass = new Map(counts.map((c) => [String(c._id), c.n]));

    let feesCollectedPercent = null;
    if (term) {
      const [items, payments] = await Promise.all([
        FeeItem.find({ session: term.session, term: term.term }).lean(),
        Payment.aggregate([
          { $match: { session: term.session, term: term.term } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);
      // Expected = class-wide charges x pupils in that class, plus charges set for single pupils.
      let expected = 0;
      for (const item of items) {
        expected += item.classId ? item.amount * (perClass.get(String(item.classId)) ?? 0) : item.amount;
      }
      const paid = payments[0]?.total ?? 0;
      feesCollectedPercent = expected > 0 ? Math.min(100, Math.round((paid / expected) * 100)) : null;
    }

    // Sign-ins are security noise, not school activity; the rest is shown to the administrator.
    const activity = await AuditLog.find({ action: { $nin: ['login', 'login_failed'] } }).sort({ at: -1 }).limit(8).lean();

    res.set('Cache-Control', 'no-store');
    res.json({
      stats: {
        pupils,
        teachers,
        classes: classes.length,
        classRange: classes.length ? `${classes[0].name} to ${classes[classes.length - 1].name}` : '',
        feesCollectedPercent,
      },
      enrolment: classes.map((c) => ({ name: c.name, pupils: perClass.get(String(c._id)) ?? 0 })),
      activities: activity.map((a) => ({ id: String(a._id), text: a.message, at: a.at })),
    });
  }),
);

export default router;
