export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  PARENT: 'parent',
  STUDENT: 'student',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.TEACHER]: 'Teacher',
  [ROLES.PARENT]: 'Parent',
  [ROLES.STUDENT]: 'Pupil',
};

export const ROLE_HOME = {
  [ROLES.ADMIN]: '/admin',
  [ROLES.TEACHER]: '/teacher',
  [ROLES.PARENT]: '/parent',
  [ROLES.STUDENT]: '/student',
};

// The role always comes from the authenticated account (the server's answer),
// never from anything the person picks on the login page.
export function homePathForRole(role) {
  return ROLE_HOME[role] ?? '/login';
}
