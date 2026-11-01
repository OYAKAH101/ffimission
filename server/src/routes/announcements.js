import { Router } from 'express';
import { Announcement, Pupil, SchoolClass } from '../models/index.js';
import { targetClause } from '../lib/announcementTargets.js';
import { pupilName } from '../lib/pupilOverview.js';
import { asyncHandler, requireAuth, requirePasswordChanged } from '../middleware/auth.js';
import { ROLES } from '../lib/constants.js';

const AUDIENCES_BY_ROLE = {
  [ROLES.TEACHER]: ['Everyone', 'Teachers'],
  [ROLES.PARENT]: ['Everyone', 'Parents'],
  [ROLES.STUDENT]: ['Everyone', 'Pupils'],
};

const router = Router();

// Each role gets only the announcements meant for it (admins see everything).
router.get(
  '/',
  requireAuth,
  requirePasswordChanged,
  asyncHandler(async (req, res) => {
    const filter = { $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: new Date() } }] };
    const audiences = AUDIENCES_BY_ROLE[req.user.role];
    let query = filter;
    if (audiences) {
      // A pupil sees notices for their own class or themselves; a parent, those for their children.
      let mine = [];
      if (req.user.role === ROLES.STUDENT && req.user.pupilId) mine = await Pupil.find({ _id: req.user.pupilId }).select('classId').lean();
      if (req.user.role === ROLES.PARENT) mine = await Pupil.find({ guardianIds: req.user._id, status: 'active' }).select('classId').lean();
      const target = targetClause({ classIds: mine.map((p) => p.classId), pupilIds: mine.map((p) => p._id) });
      query = { $and: [filter, { audience: { $in: audiences } }, target] };
    }
    const rows = await Announcement.find(query).sort({ postedAt: -1 }).limit(20).lean();

    // The administrator also sees who each notice went to.
    let names = new Map();
    if (req.user.role === ROLES.ADMIN) {
      const [classes, pupils] = await Promise.all([
        SchoolClass.find({ _id: { $in: rows.map((a) => a.targetClassId).filter(Boolean) } }).lean(),
        Pupil.find({ _id: { $in: rows.map((a) => a.targetPupilId).filter(Boolean) } }).lean(),
      ]);
      names = new Map([...classes.map((c) => [String(c._id), c.name]), ...pupils.map((p) => [String(p._id), pupilName(p)])]);
    }
    res.set('Cache-Control', 'no-store');
    res.json({
      announcements: rows.map((a) => ({
        id: String(a._id), title: a.title, body: a.body, postedAt: a.postedAt,
        // what the badge shows: the class or pupil it was aimed at, or the group
        audience: names.get(String(a.targetClassId ?? a.targetPupilId)) ?? (a.targetClassId || a.targetPupilId ? 'Your class' : a.audience),
      })),
    });
  }),
);

export default router;
