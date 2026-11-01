// The school runs on Nigerian time. A "school day" is stored as UTC midnight of the
// Lagos calendar date, so a register taken at 8am Lagos time is never filed under yesterday.
const SCHOOL_TZ = 'Africa/Lagos';

export function schoolToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: SCHOOL_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return parseDay(parts);
}

// "2026-10-30" -> Date at UTC midnight. Returns null when the text is not a real date.
export function parseDay(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text ?? '').trim());
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null;
}

export const addDays = (date, n) => new Date(date.getTime() + n * 86400000);
