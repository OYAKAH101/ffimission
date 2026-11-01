// A notice is either for everyone in its audience, or aimed at one class or one pupil.
// This builds the database condition for "notices this person may see".
// classIds / pupilIds: the classes and pupils belonging to the viewer (a pupil's own, or a
// parent's children). A viewer with none of them (a teacher) only sees untargeted notices.
const untargeted = { targetClassId: { $exists: false }, targetPupilId: { $exists: false } };

export function targetClause({ classIds = [], pupilIds = [] } = {}) {
  const options = [untargeted];
  if (classIds.length) options.push({ targetClassId: { $in: classIds } });
  if (pupilIds.length) options.push({ targetPupilId: { $in: pupilIds } });
  return { $or: options };
}
