import { Router } from 'express';
import { z } from 'zod';
import { Announcement, Attendance, Pupil, Result, SchoolClass, Term } from '../models/index.js';
import { asyncHandler, parseId, requireAuth, requirePasswordChanged, requireRole } from '../middleware/auth.js';
import { ROLES } from '../lib/constants.js';
import { currentTerm, pupilName } from '../lib/pupilOverview.js';
import { parseDay, schoolToday } from '../lib/dates.js';
import { parseRegister, parseScoreRows, parseTerm, subjectListSchemaError, usualSubjectsFor } from '../lib/recordInput.js';
import { audit } from '../lib/audit.js';

// Where administrators and teachers enter what pupils then see on their own pages:
// scores, the daily register, subjects, the current term, and notices to a class.
const router = Router();
router.use(requireAuth, requirePasswordChanged, requireRole(ROLES.ADMIN, ROLES.TEACHER));

const noStore = (res) => res.set('Cache-Control', 'no-store');
const sameId = (a, b) => a != null && b != null && String(a) === String(b);

// What this signed-in person may work on. Teachers: classes they teach, and only their own
// subjects unless they are the class teacher. The administrator: everything.
export function permissionFor(user, cls) {
  if (user.role === ROLES.ADMIN) return { subjects: cls.subjects ?? [], canRegister: true, canManage: true };
  if (sameId(cls.classTeacherId, user._id)) return { subjects: cls.subjects ?? [], canRegister: true, canManage: true };
  const mine = (cls.subjectTeachers ?? []).filter((s) => sameId(s.teacherId, user._id)).map((s) => s.subject);
  if (mine.length) return { subjects: mine, canRegister: false, canManage: false };
  return null;
}

async function loadClass(req, res, rawId) {
  const id = parseId(rawId);
  const cls = id && (await SchoolClass.findById(id).lean());
  const permission = cls && permissionFor(req.user, cls);
  if (!permission) {
    res.status(404).json({ message: 'Class not found.' }); // same answer whether it exists or not
    return {};
  }
  return { cls, permission };
}

const pupilsOf = (cls) => Pupil.find({ classId: cls._id, status: 'active' }).select('firstName lastName otherNames').lean();
const byName = (a, b) => a.name.localeCompare(b.name);

// ------------------------------------------------------------------ classes and term

router.get(
  '/classes',
  asyncHandler(async (req, res) => {
    const filter = req.user.role === ROLES.ADMIN ? {} : { $or: [{ classTeacherId: req.user._id }, { 'subjectTeachers.teacherId': req.user._id }] };
    const classes = await SchoolClass.find(filter).sort({ order: 1, name: 1 }).lean();
    const term = await currentTerm();
    noStore(res);
    res.json({
      term: term ? { session: term.session, term: term.term } : null,
      classes: classes.flatMap((cls) => {
        const permission = permissionFor(req.user, cls);
        return permission ? [{ id: String(cls._id), name: cls.name, subjects: permission.subjects, canRegister: permission.canRegister, canManage: permission.canManage }] : [];
      }),
    });
  }),
);

router.put(
  '/term',
  requireRole(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const parsed = parseTerm(req.body ?? {});
    if (parsed.error) return res.status(400).json({ message: parsed.error });
    await Term.updateMany({ current: true }, { current: false });
    await Term.updateOne({ session: parsed.session, term: parsed.term }, { $set: { current: true } }, { upsert: true });
    await audit({ action: 'term_set', actorId: req.user._id, message: `The current term was set to ${parsed.session}, ${parsed.term}.`, ip: req.ip });
    res.json({ term: { session: parsed.session, term: parsed.term } });
  }),
);

// Add subjects to a class (the administrator or that class's teacher).
router.post(
  '/classes/:id/subjects',
  asyncHandler(async (req, res) => {
    const { cls, permission } = await loadClass(req, res, req.params.id);
    if (!cls) return;
    if (!permission.canManage) return res.status(403).json({ message: 'Only the class teacher or administrator can change a class’s subjects.' });
    const wanted = req.body?.usual === true ? usualSubjectsFor(cls.name) : req.body?.subjects;
    const problem = req.body?.usual === true ? null : subjectListSchemaError(wanted);
    if (problem) return res.status(400).json({ message: problem });
    const clean = [...new Set(wanted.map((s) => s.trim()))];
    await SchoolClass.updateOne({ _id: cls._id }, { $addToSet: { subjects: { $each: clean } } });
    const updated = await SchoolClass.findById(cls._id).select('subjects').lean();
    res.json({ subjects: updated.subjects });
  }),
);

// ------------------------------------------------------------------------ results

router.get(
  '/results',
  asyncHandler(async (req, res) => {
    const { cls, permission } = await loadClass(req, res, req.query.classId);
    if (!cls) return;
    const subject = String(req.query.subject ?? '');
    if (!permission.subjects.includes(subject)) return res.status(404).json({ message: 'Subject not found for this class.' });
    const term = await currentTerm();
    if (!term) return res.status(409).json({ message: 'The current term has not been set yet. The administrator sets it first.' });

    const pupils = await pupilsOf(cls);
    const saved = await Result.find({ pupilId: { $in: pupils.map((p) => p._id) }, session: term.session, term: term.term, subject }).lean();
    const byPupil = new Map(saved.map((r) => [String(r.pupilId), r]));
    noStore(res);
    res.json({
      term: { session: term.session, term: term.term },
      pupils: pupils
        .map((p) => ({ id: String(p._id), name: pupilName(p), ca: byPupil.get(String(p._id))?.ca ?? null, exam: byPupil.get(String(p._id))?.exam ?? null }))
        .sort(byName),
    });
  }),
);

router.put(
  '/results',
  asyncHandler(async (req, res) => {
    const { cls, permission } = await loadClass(req, res, req.body?.classId);
    if (!cls) return;
    const subject = String(req.body?.subject ?? '');
    if (!permission.subjects.includes(subject)) return res.status(404).json({ message: 'Subject not found for this class.' });
    const term = await currentTerm();
    if (!term) return res.status(409).json({ message: 'The current term has not been set yet. The administrator sets it first.' });

    const parsed = parseScoreRows(req.body?.scores);
    if (parsed.error) return res.status(400).json({ message: parsed.error, pupilId: parsed.pupilId });

    // Every pupil must really be in this class: a teacher cannot write scores for anyone else.
    const inClass = new Set((await pupilsOf(cls)).map((p) => String(p._id)));
    if (parsed.rows.some((r) => !inClass.has(r.pupilId))) return res.status(400).json({ message: 'A pupil is not in this class. Reload the page and try again.' });

    await Result.bulkWrite(
      parsed.rows.map((r) => ({
        updateOne: {
          filter: { pupilId: r.pupilId, session: term.session, term: term.term, subject },
          update: { $set: { ca: r.ca, exam: r.exam, enteredBy: req.user._id } },
          upsert: true,
        },
      })),
    );
    await audit({ action: 'results_saved', actorId: req.user._id, message: `${parsed.rows.length} ${subject} score(s) saved for ${cls.name}, ${term.session} ${term.term}.`, ip: req.ip });
    res.json({ saved: parsed.rows.length });
  }),
);

// ---------------------------------------------------------------------- attendance

router.get(
  '/attendance',
  asyncHandler(async (req, res) => {
    const { cls, permission } = await loadClass(req, res, req.query.classId);
    if (!cls) return;
    if (!permission.canRegister) return res.status(403).json({ message: 'Only the class teacher or administrator takes the register.' });
    const day = parseDay(req.query.date);
    if (!day || day > schoolToday()) return res.status(400).json({ message: 'Choose a valid date that is not in the future.' });
    const parsed = { day };

    const pupils = await pupilsOf(cls);
    const marks = await Attendance.find({ classId: cls._id, date: parsed.day }).lean();
    const byPupil = new Map(marks.map((m) => [String(m.pupilId), m.status]));
    noStore(res);
    res.json({
      taken: marks.length > 0,
      pupils: pupils.map((p) => ({ id: String(p._id), name: pupilName(p), status: byPupil.get(String(p._id)) ?? null })).sort(byName),
    });
  }),
);

router.put(
  '/attendance',
  asyncHandler(async (req, res) => {
    const { cls, permission } = await loadClass(req, res, req.body?.classId);
    if (!cls) return;
    if (!permission.canRegister) return res.status(403).json({ message: 'Only the class teacher or administrator takes the register.' });
    const parsed = parseRegister(req.body ?? {}, schoolToday());
    if (parsed.error) return res.status(400).json({ message: parsed.error });

    const inClass = new Set((await pupilsOf(cls)).map((p) => String(p._id)));
    if (parsed.marks.some((m) => !inClass.has(m.pupilId))) return res.status(400).json({ message: 'A pupil is not in this class. Reload the page and try again.' });

    await Attendance.bulkWrite(
      parsed.marks.map((m) => ({
        updateOne: {
          filter: { pupilId: m.pupilId, date: parsed.day },
          update: { $set: { classId: cls._id, status: m.status, recordedBy: req.user._id } },
          upsert: true,
        },
      })),
    );
    await audit({ action: 'register_saved', actorId: req.user._id, message: `The register for ${cls.name} was saved for ${req.body.date}.`, ip: req.ip });
    res.json({ saved: parsed.marks.length });
  }),
);

// -------------------------------------------------------------- notice to a class

const noticeSchema = z.object({
  title: z.string().trim().min(1, 'Enter a title.').max(200),
  body: z.string().trim().min(1, 'Write the message.').max(2000),
  classId: z.string().min(1, 'Choose a class.'),
}).strict();

router.post(
  '/notices',
  asyncHandler(async (req, res) => {
    const parsed = noticeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Please check the message.' });
    const { cls } = await loadClass(req, res, parsed.data.classId);
    if (!cls) return;
    await Announcement.create({ title: parsed.data.title, body: parsed.data.body, audience: 'Everyone', targetClassId: cls._id, createdBy: req.user._id });
    await audit({ action: 'announcement_sent', actorId: req.user._id, message: `A notice "${parsed.data.title}" was sent to ${cls.name}.`, ip: req.ip });
    res.status(201).json({ sentTo: cls.name });
  }),
);

export default router;
