import { SCORE_LIMITS, ATTENDANCE_STATUSES } from './constants.js';
import { parseDay } from './dates.js';

// Validation for what teachers and the administrator type in. Pure functions (no database),
// tested in test/recordInput.test.js. Anything wrong is refused with a plain message.

const blank = (v) => v === '' || v === null || v === undefined;
const idLike = (v) => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);

// rows: [{ pupilId, ca, exam }]. A row with both boxes empty is skipped (not entered yet).
// One box filled and the other empty is an error, so a half-entered result is never saved.
export function parseScoreRows(rows, limits = SCORE_LIMITS) {
  if (!Array.isArray(rows) || rows.length === 0) return { error: 'There are no scores to save.' };
  if (rows.length > 200) return { error: 'Too many rows at once.' };
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    if (!row || !idLike(row.pupilId)) return { error: 'One of the pupils is not valid. Reload the page and try again.' };
    if (seen.has(row.pupilId)) return { error: 'A pupil appears twice.' };
    seen.add(row.pupilId);
    if (blank(row.ca) && blank(row.exam)) continue;
    if (blank(row.ca) || blank(row.exam)) return { error: 'Enter both the CA and the exam score for each pupil you fill in.', pupilId: row.pupilId };
    const ca = Number(row.ca);
    const exam = Number(row.exam);
    if (!Number.isFinite(ca) || !Number.isFinite(exam)) return { error: 'Scores must be numbers.', pupilId: row.pupilId };
    if (ca < 0 || ca > limits.ca) return { error: `CA must be from 0 to ${limits.ca}.`, pupilId: row.pupilId };
    if (exam < 0 || exam > limits.exam) return { error: `Exam must be from 0 to ${limits.exam}.`, pupilId: row.pupilId };
    out.push({ pupilId: row.pupilId, ca, exam });
  }
  if (out.length === 0) return { error: 'Enter at least one pupil’s scores.' };
  return { rows: out };
}

// marks: [{ pupilId, status }]; date: "YYYY-MM-DD", not in the future.
export function parseRegister({ date, marks }, today) {
  const day = parseDay(date);
  if (!day) return { error: 'Choose a valid date.' };
  if (day > today) return { error: 'You cannot take the register for a future date.' };
  if (!Array.isArray(marks) || marks.length === 0) return { error: 'There is nobody in the register.' };
  if (marks.length > 200) return { error: 'Too many rows at once.' };
  const seen = new Set();
  for (const m of marks) {
    if (!m || !idLike(m.pupilId) || !ATTENDANCE_STATUSES.includes(m.status)) return { error: 'Mark every pupil present, late or absent.' };
    if (seen.has(m.pupilId)) return { error: 'A pupil appears twice.' };
    seen.add(m.pupilId);
  }
  return { day, marks: marks.map((m) => ({ pupilId: m.pupilId, status: m.status })) };
}

export const TERM_NAMES = ['First Term', 'Second Term', 'Third Term'];
export function parseTerm({ session, term }) {
  const m = /^(\d{4})\/(\d{4})$/.exec(String(session ?? '').trim());
  if (!m || Number(m[2]) !== Number(m[1]) + 1) return { error: 'Session should look like 2026/2027.' };
  if (!TERM_NAMES.includes(term)) return { error: 'Choose First, Second or Third Term.' };
  return { session: `${m[1]}/${m[2]}`, term };
}

// ASSUMPTION: typical subject lists. The school should confirm them; they can be edited per class.
const EARLY = ['Number Work', 'Letter Work', 'Rhymes and Songs', 'Health Habits', 'Colouring and Drawing', 'Social Habits'];
const PRIMARY = [
  'Mathematics', 'English Language', 'Basic Science and Technology', 'Social Studies', 'Civic Education',
  'Christian Religious Studies', 'Computer Studies', 'Verbal Reasoning', 'Quantitative Reasoning',
  'Cultural and Creative Arts', 'Agricultural Science', 'Physical and Health Education',
];
export const usualSubjectsFor = (className) => [...(/^(creche|nursery)/i.test(String(className).trim()) ? EARLY : PRIMARY)];

export const subjectListSchemaError = (subjects) => {
  if (!Array.isArray(subjects) || subjects.length === 0 || subjects.length > 30) return 'Enter at least one subject.';
  if (subjects.some((s) => typeof s !== 'string' || !s.trim() || s.trim().length > 60)) return 'Each subject needs a name of up to 60 characters.';
  return null;
};
