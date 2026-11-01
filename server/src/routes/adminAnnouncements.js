import { Router } from 'express';
import { z } from 'zod';
import { Announcement, Pupil, SchoolClass } from '../models/index.js';
import { asyncHandler, parseId, requireAuth, requirePasswordChanged, requireRole } from '../middleware/auth.js';
import { AUDIENCES, ROLES } from '../lib/constants.js';
import { pupilName } from '../lib/pupilOverview.js';
import { audit } from '../lib/audit.js';

const router = Router();
router.use(requireAuth, requirePasswordChanged, requireRole(ROLES.ADMIN));

// Who gets it: everyone / parents / teachers / pupils, OR one class, OR one pupil.
const sendSchema = z
  .object({
    title: z.string().trim().min(1, 'Enter a title.').max(200),
    body: z.string().trim().min(1, 'Write the message.').max(2000),
    audience: z.enum(AUDIENCES).default('Everyone'),
    classId: z.string().optional(),
    pupilId: z.string().optional(),
  })
  .strict();

router.post(
  '/announcements',
  asyncHandler(async (req, res) => {
    const parsed = sendSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Please check the message.' });
    const { title, body, audience, classId, pupilId } = parsed.data;

    const doc = { title, body, audience, createdBy: req.user._id };
    let sentTo = audience;
    if (pupilId) {
      const pupil = parseId(pupilId) && (await Pupil.findOne({ _id: pupilId, status: 'active' }).lean());
      if (!pupil) return res.status(400).json({ message: 'Choose a pupil from the list.' });
      doc.targetPupilId = pupil._id;
      doc.audience = 'Everyone'; // the pupil and their parents; the target does the narrowing
      sentTo = pupilName(pupil);
    } else if (classId) {
      const cls = parseId(classId) && (await SchoolClass.findById(classId).lean());
      if (!cls) return res.status(400).json({ message: 'Choose a class from the list.' });
      doc.targetClassId = cls._id;
      doc.audience = 'Everyone';
      sentTo = cls.name;
    }
    const created = await Announcement.create(doc);
    await audit({ action: 'announcement_sent', actorId: req.user._id, message: `A notice "${title}" was sent to ${sentTo}.`, ip: req.ip });
    res.status(201).json({ id: String(created._id), sentTo });
  }),
);

router.delete(
  '/announcements/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const removed = id && (await Announcement.findByIdAndDelete(id).lean());
    if (!removed) return res.status(404).json({ message: 'Notice not found.' });
    await audit({ action: 'announcement_deleted', actorId: req.user._id, message: `The notice "${removed.title}" was removed.`, ip: req.ip });
    res.status(204).end();
  }),
);

export default router;
