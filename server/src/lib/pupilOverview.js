import { Attendance, FeeItem, Homework, Payment, Pupil, Result, SchoolClass, Term, TimetableEntry, User } from '../models/index.js';
import { DAYS } from './constants.js';
import { gradeFor, positionLabel, scoreRow } from './grades.js';
import { addDays, schoolToday } from './dates.js';

export const currentTerm = () => Term.findOne({ current: true }).lean();

export const pupilName = (p) => [p.firstName, p.otherNames, p.lastName].filter(Boolean).join(' ');

// Short record used in lists and the parent's child switcher.
export function pupilSummary(pupil, className) {
  return {
    id: String(pupil._id),
    name: pupilName(pupil),
    firstName: pupil.firstName,
    admissionNo: pupil.admissionNo,
    className,
    hasPhoto: Boolean(pupil.photoFile),
  };
}

// Everything one pupil's dashboard shows, shaped like the screens expect it.
// Callers MUST already have checked canViewPupil() for the signed-in user.
export async function buildOverview(pupil) {
  const term = await currentTerm();
  const cls = await SchoolClass.findById(pupil.classId).lean();
  const teacher = cls?.classTeacherId ? await User.findById(cls.classTeacherId).select('name').lean() : null;

  const base = {
    ...pupilSummary(pupil, cls?.name ?? 'Not assigned'),
    classTeacher: teacher?.name ?? 'Not assigned',
    session: term?.session ?? 'Not set',
    term: term?.term ?? '',
  };

  const timetableRows = await TimetableEntry.find({ classId: pupil.classId }).sort({ order: 1 }).lean();
  const timetable = Object.fromEntries(DAYS.map((day) => [day, []]));
  for (const row of timetableRows) timetable[row.day].push({ time: row.time, subject: row.subject });

  const today = schoolToday();
  const homeworkRows = await Homework.find({ classId: pupil.classId, due: { $gte: addDays(today, -7) } }).sort({ due: 1 }).limit(30).lean();
  const homework = homeworkRows.map((h) => ({ id: String(h._id), subject: h.subject, title: h.title, due: h.due }));

  if (!term) {
    return { ...base, position: null, average: null, results: [], attendance: { present: 0, absent: 0, late: 0, schoolDays: 0 }, fees: { dueDate: null, items: [], paid: 0 }, homework, timetable };
  }

  // ---- results and class position
  const subjectOrder = new Map((cls?.subjects ?? []).map((s, i) => [s, i]));
  const rows = (await Result.find({ pupilId: pupil._id, session: term.session, term: term.term }).lean())
    .map(scoreRow)
    .sort((a, b) => (subjectOrder.get(a.subject) ?? 999) - (subjectOrder.get(b.subject) ?? 999) || a.subject.localeCompare(b.subject));

  let position = null;
  if (rows.length) {
    const classmateIds = await Pupil.find({ classId: pupil.classId, status: 'active' }).distinct('_id');
    const totals = await Result.aggregate([
      { $match: { pupilId: { $in: classmateIds }, session: term.session, term: term.term } },
      { $group: { _id: '$pupilId', total: { $sum: { $add: ['$ca', '$exam'] } } } },
      { $project: { _id: 0, pupilId: '$_id', total: 1 } },
    ]);
    position = positionLabel(totals, pupil._id);
  }

  const average = rows.length
    ? (() => {
        const score = Math.round(rows.reduce((sum, row) => sum + row.total, 0) / rows.length);
        return { score, grade: gradeFor(score) };
      })()
    : null;

  // ---- attendance (only days on which the class register was actually taken)
  const range = {};
  if (term.startDate) range.$gte = term.startDate;
  if (term.endDate) range.$lte = term.endDate;
  const dateFilter = Object.keys(range).length ? { date: range } : {};
  const [records, schoolDayList] = await Promise.all([
    Attendance.find({ pupilId: pupil._id, ...dateFilter }).select('status').lean(),
    Attendance.distinct('date', { classId: pupil.classId, ...dateFilter }),
  ]);
  const count = (status) => records.filter((r) => r.status === status).length;
  const attendance = { present: count('present'), absent: count('absent'), late: count('late'), schoolDays: schoolDayList.length };

  // ---- fees: charges for the pupil's class plus any charged to this pupil alone
  const [items, payments] = await Promise.all([
    FeeItem.find({ session: term.session, term: term.term, $or: [{ pupilId: pupil._id }, { classId: pupil.classId }] }).lean(),
    Payment.find({ pupilId: pupil._id, session: term.session, term: term.term }).lean(),
  ]);
  const fees = {
    dueDate: term.feeDueDate ?? null,
    items: items.map((i) => ({ label: i.label, amount: i.amount })),
    paid: payments.reduce((sum, p) => sum + p.amount, 0),
  };

  return { ...base, position, average, results: rows, attendance, fees, homework, timetable };
}
