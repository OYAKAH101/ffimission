import { Router } from 'express';
import { Pupil, PupilPhoto, SchoolClass } from '../models/index.js';
import { asyncHandler, parseId, requireAuth, requirePasswordChanged, requireRole } from '../middleware/auth.js';
import { canViewPupil } from '../lib/access.js';
import { ROLES } from '../lib/constants.js';
import { buildOverview, pupilSummary } from '../lib/pupilOverview.js';

const router = Router();
// Applied per route (not router.use) so this router never intercepts other API paths.
const guard = [requireAuth, requirePasswordChanged];

async function teacherClassIds(user) {
  if (user.role !== ROLES.TEACHER) return [];
  const ids = await SchoolClass.distinct('_id', { $or: [{ classTeacherId: user._id }, { 'subjectTeachers.teacherId': user._id }] });
  return ids.map(String);
}

// Loads a pupil ONLY if the signed-in user is allowed to see them. Every route below goes
// through this, so there is a single place where access is decided. A pupil that does not
// exist and one the user may not see look identical (both are "not found").
async function loadAllowedPupil(req) {
  const id = parseId(req.params.id);
  if (!id) return null;
  const pupil = await Pupil.findById(id).lean();
  if (!pupil || pupil.status !== 'active') return null;
  const allowed = canViewPupil(
    { id: String(req.user._id), role: req.user.role, pupilId: req.user.pupilId && String(req.user.pupilId) },
    { id: String(pupil._id), classId: String(pupil.classId), guardianIds: (pupil.guardianIds ?? []).map(String) },
    { teacherClassIds: await teacherClassIds(req.user) },
  );
  return allowed ? pupil : null;
}

// The pupils this account may open: a parent's children, or the pupil's own record.
router.get(
  '/me/pupils',
  ...guard,
  requireRole(ROLES.PARENT, ROLES.STUDENT),
  asyncHandler(async (req, res) => {
    const filter = req.user.role === ROLES.PARENT
      ? { guardianIds: req.user._id, status: 'active' }
      : { _id: req.user.pupilId, status: 'active' };
    const pupils = await Pupil.find(filter).sort({ firstName: 1 }).lean();
    const classes = await SchoolClass.find({ _id: { $in: pupils.map((p) => p.classId) } }).select('name').lean();
    const classNames = new Map(classes.map((c) => [String(c._id), c.name]));
    res.set('Cache-Control', 'no-store');
    res.json({ pupils: pupils.map((p) => pupilSummary(p, classNames.get(String(p.classId)) ?? 'Not assigned')) });
  }),
);

router.get(
  '/pupils/:id/overview',
  ...guard,
  asyncHandler(async (req, res) => {
    const pupil = await loadAllowedPupil(req);
    if (!pupil) return res.status(404).json({ message: 'Pupil not found.' });
    res.set('Cache-Control', 'no-store');
    return res.json({ pupil: await buildOverview(pupil) });
  }),
);

router.get(
  '/pupils/:id/photo',
  ...guard,
  asyncHandler(async (req, res) => {
    const pupil = await loadAllowedPupil(req);
    if (!pupil?.photoFile) return res.status(404).json({ message: 'No photograph.' });
    // The image bytes are stored in the database and only ever sent after the permission check above.
    const photo = await PupilPhoto.findOne({ pupilId: pupil._id }).lean();
    if (!photo) return res.status(404).json({ message: 'No photograph.' });
    res.set('Cache-Control', 'private, max-age=3600');
    res.set('X-Content-Type-Options', 'nosniff');
    return res.type(photo.contentType).send(photo.data.buffer ? Buffer.from(photo.data.buffer) : Buffer.from(photo.data));
  }),
);

export default router;
