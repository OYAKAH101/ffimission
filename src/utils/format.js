const dateFormatter = new Intl.DateTimeFormat('en-NG', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const shortDateFormatter = new Intl.DateTimeFormat('en-NG', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

const nairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

const longDateFormatter = new Intl.DateTimeFormat('en-NG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export const formatLongDate = (date) => longDateFormatter.format(date);
export const formatDate = (date) => dateFormatter.format(date);
export const formatShortDate = (date) => shortDateFormatter.format(date);
export const formatNaira = (amount) => nairaFormatter.format(amount);

export function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function initials(name) {
  return name
    .replace(/^(mr|mrs|miss|ms|dr|rev|sr|fr)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function timeAgo(date, now = Date.now()) {
  const diff = now - date.getTime();
  if (diff < HOUR) return `${Math.max(1, Math.round(diff / MINUTE))} min ago`;
  if (diff < DAY) return `${Math.round(diff / HOUR)} hr ago`;
  const days = Math.round(diff / DAY);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

// Whole calendar days from today until `date` (negative if in the past).
export function daysUntil(date, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((target - start) / DAY);
}

export function dueLabel(date) {
  const days = daysUntil(date);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days > 1) return `Due in ${days} days`;
  return days === -1 ? 'Overdue by 1 day' : `Overdue by ${Math.abs(days)} days`;
}
