import { z } from 'zod';
import { AUDIENCES, DAYS, ATTENDANCE_STATUSES } from './constants.js';
import { parseDay } from './dates.js';
import { validScores } from './grades.js';

// ============================================================================
// Row checking for the import files. Pure functions: no database, easy to test.
// Each returns { rows: [...valid, normalised rows], errors: ["file line N: problem"] }.
// ============================================================================

const text = (max = 200) => z.string().trim().max(max);
const required = (max = 200) => text(max).min(1, 'is required');
const optional = (max = 200) => text(max).optional().transform((v) => v || undefined);

const day = z.string().trim().transform((v, ctx) => {
  const d = parseDay(v);
  if (!d) ctx.addIssue({ code: 'custom', message: 'must be a date written YYYY-MM-DD, for example 2026-09-14' });
  return d;
});
const optionalDay = z.string().trim().optional().transform((v, ctx) => {
  if (!v) return undefined;
  const d = parseDay(v);
  if (!d) ctx.addIssue({ code: 'custom', message: 'must be a date written YYYY-MM-DD' });
  return d ?? undefined;
});
const email = text(200).toLowerCase().pipe(z.string().email('is not a valid email address'));
const optionalEmail = z.string().trim().toLowerCase().optional().transform((v) => v || undefined).pipe(z.string().email('is not a valid email address').optional());
// Blank cells are errors, never a silent 0. (The field name is added to the message by run().)
const wholeNumber = () =>
  z.string().trim().min(1, 'is required').pipe(z.coerce.number({ invalid_type_error: 'must be a number' }).int('must be a whole number').min(0, 'cannot be negative'));
const score = () => z.string().trim().min(1, 'is required').pipe(z.coerce.number({ invalid_type_error: 'must be a number' }));
const list = (sep = ';') => z.string().optional().transform((v) => (v ?? '').split(sep).map((s) => s.trim()).filter(Boolean));

function run(rows, fileName, schema, extra) {
  const out = [];
  const errors = [];
  for (const raw of rows) {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(`${fileName} line ${raw._line}: ${issue.path.join('.') || 'row'} ${issue.message}`);
      }
      continue;
    }
    const problem = extra?.(parsed.data);
    if (problem) { errors.push(`${fileName} line ${raw._line}: ${problem}`); continue; }
    out.push({ ...parsed.data, _line: raw._line });
  }
  return { rows: out, errors };
}

export const LOGIN_PATTERN = /^[a-z0-9._-]{3,40}$/;

// "IMM/2024/0142" -> "imm-2024-0142": used for default pupil usernames and photo file names.
export const admissionSlug = (admissionNo) => String(admissionNo).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---------------------------------------------------------------- the files

export const parseTerms = (rows) =>
  run(rows, 'term.csv', z.object({
    session: required(20), term: required(40),
    start_date: optionalDay, end_date: optionalDay, fee_due_date: optionalDay,
    current: optional(10),
  }));

export const parseStaff = (rows) =>
  run(rows, 'staff.csv', z.object({
    name: required(120), email, role: optional(10),
  }), (r) => (r.role && !['teacher', 'admin'].includes(r.role.toLowerCase()) ? 'role must be teacher or admin' : null));

export const parseClasses = (rows) =>
  run(rows, 'classes.csv', z.object({
    name: required(60), order: z.string().optional().transform((v) => (v ? Number(v) : 0)).pipe(z.number({ invalid_type_error: 'must be a number' }).int('must be a whole number').min(0)),
    subjects: list(), class_teacher_email: optionalEmail,
  }));

export const parseAssignments = (rows) =>
  run(rows, 'assignments.csv', z.object({ class: required(60), subject: required(80), teacher_email: email }));

export const parsePupils = (rows) =>
  run(rows, 'pupils.csv', z.object({
    admission_no: required(40), first_name: required(80), last_name: required(80),
    other_names: optional(120), gender: optional(10), date_of_birth: optionalDay,
    class: required(60), login: optional(200),
    guardian_name: optional(120), guardian_email: optionalEmail,
    guardian2_name: optional(120), guardian2_email: optionalEmail,
  }), (r) => {
    if (r.gender && !['male', 'female'].includes(r.gender.toLowerCase())) return 'gender must be Male or Female';
    if (r.login && !r.login.includes('@') && !LOGIN_PATTERN.test(r.login.toLowerCase())) return 'login must be an email address, or 3 to 40 letters, numbers, dots, dashes or underscores';
    if (r.guardian_email && !r.guardian_name) return 'guardian_name is needed with guardian_email';
    if (r.guardian2_email && !r.guardian2_name) return 'guardian2_name is needed with guardian2_email';
    if (r.guardian2_email && r.guardian2_email === r.guardian_email) return 'guardian2_email repeats guardian_email';
    return null;
  });

export const parseResults = (rows) =>
  run(rows, 'results.csv', z.object({
    admission_no: required(40), session: optional(20), term: optional(40), subject: required(80),
    ca: score(), exam: score(),
  }), (r) => (validScores(r.ca, r.exam) ? null : 'ca must be 0 to 40 and exam 0 to 60 (see SCORE_LIMITS in server/src/lib/constants.js)'));

export const parseFees = (rows) =>
  run(rows, 'fees.csv', z.object({
    class: optional(60), admission_no: optional(40), session: optional(20), term: optional(40),
    item: required(80), amount: wholeNumber(),
  }), (r) => (Boolean(r.class) === Boolean(r.admission_no) ? 'give either class (charge for the whole class) or admission_no (one pupil), not both or neither' : null));

export const parsePayments = (rows) =>
  run(rows, 'payments.csv', z.object({
    admission_no: required(40), amount: wholeNumber(), date: day,
    reference: required(80), session: optional(20), term: optional(40),
  }));

export const parseAttendance = (rows) =>
  run(rows, 'attendance.csv', z.object({
    admission_no: required(40), date: day, status: text(10).toLowerCase(),
  }), (r) => (ATTENDANCE_STATUSES.includes(r.status) ? null : 'status must be present, absent or late'));

export const parseHomework = (rows) =>
  run(rows, 'homework.csv', z.object({ class: required(60), subject: required(80), title: required(300), due_date: day }));

export const parseTimetable = (rows) =>
  run(rows, 'timetable.csv', z.object({
    class: required(60), day: text(12), time: required(20), subject: required(80),
  }), (r) => (DAYS.map((d) => d.toLowerCase()).includes(r.day.toLowerCase()) ? null : 'day must be Monday to Friday'));

export const parseAnnouncements = (rows) =>
  run(rows, 'announcements.csv', z.object({
    title: required(200), body: required(2000), audience: optional(20), date: optionalDay, expires: optionalDay,
  }), (r) => (r.audience && !AUDIENCES.includes(r.audience) ? `audience must be one of ${AUDIENCES.join(', ')}` : null));
