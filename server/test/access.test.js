import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canViewPupil } from '../src/lib/access.js';

// Two families, one class each, plus a teacher for class c1.
const adaeze = { id: 'p1', classId: 'c1', guardianIds: ['parentA'] };
const chidera = { id: 'p2', classId: 'c1', guardianIds: ['parentA'] }; // same parent, second child
const emeka = { id: 'p3', classId: 'c2', guardianIds: ['parentB'] };
const joint = { id: 'p4', classId: 'c2', guardianIds: ['parentB', 'parentC'] };

const admin = { id: 'u1', role: 'admin' };
const parentA = { id: 'parentA', role: 'parent' };
const parentB = { id: 'parentB', role: 'parent' };
const studentAdaeze = { id: 's1', role: 'student', pupilId: 'p1' };
const teacher = { id: 't1', role: 'teacher' };

test('a parent sees every one of their own children and nobody else', () => {
  assert.equal(canViewPupil(parentA, adaeze), true);
  assert.equal(canViewPupil(parentA, chidera), true);
  assert.equal(canViewPupil(parentA, emeka), false);
  assert.equal(canViewPupil(parentB, adaeze), false);
  assert.equal(canViewPupil(parentB, emeka), true);
});

test('either guardian of a pupil can see them', () => {
  assert.equal(canViewPupil({ id: 'parentC', role: 'parent' }, joint), true);
  assert.equal(canViewPupil(parentB, joint), true);
  assert.equal(canViewPupil(parentA, joint), false);
});

test('a pupil sees only their own record, even a classmate or sibling is refused', () => {
  assert.equal(canViewPupil(studentAdaeze, adaeze), true);
  assert.equal(canViewPupil(studentAdaeze, chidera), false); // sibling, same class
  assert.equal(canViewPupil(studentAdaeze, emeka), false);
});

test('a student account with no linked pupil sees nothing', () => {
  assert.equal(canViewPupil({ id: 's9', role: 'student' }, adaeze), false);
  assert.equal(canViewPupil({ id: 's9', role: 'student', pupilId: undefined }, { id: undefined, classId: 'c1', guardianIds: [] }), false);
});

test('a teacher sees only pupils in classes they are assigned to', () => {
  const ctx = { teacherClassIds: ['c1'] };
  assert.equal(canViewPupil(teacher, adaeze, ctx), true);
  assert.equal(canViewPupil(teacher, emeka, ctx), false);
  assert.equal(canViewPupil(teacher, adaeze, {}), false);
  assert.equal(canViewPupil(teacher, adaeze), false);
});

test('an administrator sees everyone', () => {
  for (const pupil of [adaeze, chidera, emeka, joint]) assert.equal(canViewPupil(admin, pupil), true);
});

test('unknown roles, missing users and missing pupils are refused', () => {
  assert.equal(canViewPupil({ id: 'x', role: 'visitor' }, adaeze), false);
  assert.equal(canViewPupil({ id: 'parentA', role: 'PARENT' }, adaeze), false); // role must match exactly
  assert.equal(canViewPupil(null, adaeze), false);
  assert.equal(canViewPupil(parentA, null), false);
});

test('ids compare as text, so ObjectId-like values work', () => {
  const objectIdLike = { toString: () => 'parentA' };
  assert.equal(canViewPupil(parentA, { id: 'p1', classId: 'c1', guardianIds: [objectIdLike] }), true);
});

test('a missing id never matches a missing id', () => {
  assert.equal(canViewPupil({ id: undefined, role: 'parent' }, { id: 'p1', classId: 'c1', guardianIds: [undefined] }), false);
});
