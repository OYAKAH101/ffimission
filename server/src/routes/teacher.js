import { Router } from 'express';
import { Attendance, Homework, Pupil, Result, SchoolClass } from '../models/index.js';
import { asyncHandler, requireAuth, requirePasswordChanged, requireRole } from '../middleware/auth.js';
import { ROLES } from '../lib/constants.js';
import { currentTerm, pupilName } from '../lib/pupilOverview.js';
import { addDays, schoolToday } from '../lib/dates.js';

const router = Router();
router.use(requireAuth, requirePasswordChanged, requireRole(ROLES.TEACHER));

// The classes this teacher is assigned to, with today's register and marking progress.
// Only classes where the signed-in teacher is the class teacher or a subject teacher appear.
router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const me = String(req.user._id);
    const classes = await SchoolClass.find({ $or: [{ classTeacherId: req.user._id }, { 'subjectTeachers.teacherId': req.user._id }] })
      .sort({ order: 1 })
      .lean();
    const term = await currentTerm();
    const today = schoolToday();
    const weekStart = addDays(today, -6);

    const out = { classes: [], followUp: [], resultsTasks: [], homework: [], term: term ? { session: term.session, term: term.term } : null };

    for (const cls of classes) {
      const isClassTeacher = String(cls.classTeacherId) === me;
      const mySubjects = isClassTeacher
        ? cls.subjects
        : cls.subjectTeachers.filter((s) => String(s.teacherId) === me).map((s) => s.subject);
      const subjectLabel = isClassTeacher ? 'All subjects' : mySubjects.join(', ');

      const pupils = await Pupil.find({ classId: cls._id, status: 'active' }).select('firstName lastName otherNames').lean();
      const names = new Map(pupils.map((p) => [String(p._id), pupilName(p)]));

      const todays = await Attendance.find({ classId: cls._id, date: today }).lean();
      const registerTaken = todays.length > 0;
      out.classes.push({
        id: String(cls._id),
        name: cls.name,
        role: isClassTeacher ? 'Class teacher' : subjectLabel,
        subjects: subjectLabel,
        pupils: pupils.length,
        registerTaken,
        presentToday: registerTaken ? todays.filter((r) => r.status !== 'absent').length : null,
        absentToday: todays.filter((r) => r.status === 'absent').map((r) => names.get(String(r.pupilId))).filter(Boolean),
      });

      // Pupils absent on two or more of the last seven days.
      const absences = await Attendance.aggregate([
        { $match: { classId: cls._id, status: 'absent', date: { $gte: weekStart, $lte: today } } },
        { $group: { _id: '$pupilId', n: { $sum: 1 } } },
        { $match: { n: { $gte: 2 } } },
      ]);
      for (const row of absences) {
        out.followUp.push({ name: names.get(String(row._id)) ?? 'Pupil', className: cls.name, note: `Absent ${row.n} days this week` });
      }

      if (term && mySubjects.length) {
        const total = pupils.length * mySubjects.length;
        const entered = await Result.countDocuments({
          pupilId: { $in: pupils.map((p) => p._id) },
          session: term.session,
          term: term.term,
          subject: { $in: mySubjects },
        });
        const complete = total > 0 && entered >= total;
        out.resultsTasks.push({
          id: String(cls._id),
          className: cls.name,
          subject: subjectLabel,
          entered,
          total,
          status: complete ? 'Complete' : entered === 0 ? 'Not started' : 'In progress',
          tone: complete ? 'success' : entered === 0 ? 'warning' : 'info',
        });
      }

      const hw = await Homework.find({
        classId: cls._id,
        ...(isClassTeacher ? {} : { subject: { $in: mySubjects } }),
        due: { $gte: addDays(today, -7) },
      }).sort({ due: 1 }).limit(10).lean();
      for (const h of hw) out.homework.push({ id: String(h._id), className: cls.name, title: h.title, due: h.due });
    }

    res.set('Cache-Control', 'no-store');
    res.json(out);
  }),
);

export default router;
