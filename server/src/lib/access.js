import { ROLES } from './constants.js';

// ============================================================================
// WHO MAY SEE WHICH PUPIL
//
// This one pure function decides data access for every pupil route. It has no
// database or web code in it so it can be tested on its own (test/access.test.js).
//
//   admin    any pupil
//   teacher  pupils in a class they are the class teacher or a subject teacher of
//   parent   only pupils whose guardianIds list contains the parent's account
//   student  only the pupil record linked to the student's own account
//
// Anything else is refused. Callers must answer "not found" (404), never
// "forbidden", so the API cannot be used to discover which pupil ids exist.
// ============================================================================

const same = (a, b) => a != null && b != null && String(a) === String(b);

/**
 * @param {{ id: string, role: string, pupilId?: string }} user    the signed-in account (from the session)
 * @param {{ id: string, classId: string, guardianIds: string[] }} pupil
 * @param {{ teacherClassIds?: string[] }} context  class ids this teacher is assigned to
 */
export function canViewPupil(user, pupil, context = {}) {
  if (!user || !pupil) return false;

  switch (user.role) {
    case ROLES.ADMIN:
      return true;
    case ROLES.TEACHER:
      return (context.teacherClassIds ?? []).some((classId) => same(classId, pupil.classId));
    case ROLES.PARENT:
      return (pupil.guardianIds ?? []).some((guardianId) => same(guardianId, user.id));
    case ROLES.STUDENT:
      return same(user.pupilId, pupil.id);
    default:
      return false;
  }
}
