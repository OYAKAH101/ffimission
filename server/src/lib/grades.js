import { SCORE_LIMITS } from './constants.js';

// ASSUMPTION: a common Nigerian primary-school scale. The school must confirm
// its real grading scale; this is the only place to change it.
export function gradeFor(total) {
  if (total >= 70) return { letter: 'A', remark: 'Excellent', tone: 'success' };
  if (total >= 60) return { letter: 'B', remark: 'Very good', tone: 'success' };
  if (total >= 50) return { letter: 'C', remark: 'Good', tone: 'info' };
  if (total >= 45) return { letter: 'D', remark: 'Fair', tone: 'warning' };
  if (total >= 40) return { letter: 'E', remark: 'Pass', tone: 'warning' };
  return { letter: 'F', remark: 'Needs support', tone: 'danger' };
}

export function scoreRow({ subject, ca, exam }) {
  const total = ca + exam;
  return { subject, ca, exam, total, grade: gradeFor(total) };
}

export function validScores(ca, exam) {
  return (
    Number.isFinite(ca) && Number.isFinite(exam) &&
    ca >= 0 && ca <= SCORE_LIMITS.ca && exam >= 0 && exam <= SCORE_LIMITS.exam
  );
}

export function ordinal(n) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`;
}

// Competition ranking: equal totals share a position (1, 2, 2, 4).
// `totals` = [{ pupilId, total }]. Returns "4th of 33" or null if the pupil has no total.
export function positionLabel(totals, pupilId) {
  const mine = totals.find((row) => String(row.pupilId) === String(pupilId));
  if (!mine) return null;
  const position = 1 + totals.filter((row) => row.total > mine.total).length;
  return `${ordinal(position)} of ${totals.length}`;
}
