export const ROLES = Object.freeze({
  ADMIN: 'admin',
  TEACHER: 'teacher',
  PARENT: 'parent',
  STUDENT: 'student',
});
export const ROLE_VALUES = Object.values(ROLES);

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
export const ATTENDANCE_STATUSES = ['present', 'absent', 'late'];
export const AUDIENCES = ['Everyone', 'Parents', 'Teachers', 'Pupils'];

// Score limits for one subject: continuous assessment plus exam = 100.
// ASSUMPTION: confirm with the school and change here if their scheme differs.
export const SCORE_LIMITS = Object.freeze({ ca: 40, exam: 60 });

export const LOCKOUT = Object.freeze({ maxFailures: 5, minutes: 15 });
