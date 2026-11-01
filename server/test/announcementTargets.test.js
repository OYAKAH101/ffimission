import test from 'node:test';
import assert from 'node:assert/strict';
import { targetClause } from '../src/lib/announcementTargets.js';

test('a viewer with no pupils only gets untargeted notices', () => {
  assert.equal(targetClause().$or.length, 1);
});
test('class and pupil targets are added only when the viewer has them', () => {
  const clause = targetClause({ classIds: ['c1'], pupilIds: ['p1'] });
  assert.equal(clause.$or.length, 3);
  assert.deepEqual(clause.$or[1], { targetClassId: { $in: ['c1'] } });
  assert.deepEqual(clause.$or[2], { targetPupilId: { $in: ['p1'] } });
});
