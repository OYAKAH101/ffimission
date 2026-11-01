import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gradeFor, ordinal, positionLabel, scoreRow, validScores } from '../src/lib/grades.js';

test('grade boundaries', () => {
  const at = (n) => gradeFor(n).letter;
  assert.deepEqual([100, 70, 69, 60, 59, 50, 49, 45, 44, 40, 39, 0].map(at), ['A', 'A', 'B', 'B', 'C', 'C', 'D', 'D', 'E', 'E', 'F', 'F']);
});

test('a result row adds CA and exam', () => {
  const row = scoreRow({ subject: 'Mathematics', ca: 34, exam: 52 });
  assert.equal(row.total, 86);
  assert.equal(row.grade.letter, 'A');
});

test('scores outside the limits are rejected', () => {
  assert.equal(validScores(40, 60), true);
  assert.equal(validScores(0, 0), true);
  assert.equal(validScores(41, 10), false);
  assert.equal(validScores(10, 61), false);
  assert.equal(validScores(-1, 10), false);
  assert.equal(validScores(NaN, 10), false);
});

test('ordinals', () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 111].map(ordinal), ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '101st', '111th']);
});

test('class position shares a place on equal totals', () => {
  const totals = [{ pupilId: 'a', total: 400 }, { pupilId: 'b', total: 380 }, { pupilId: 'c', total: 380 }, { pupilId: 'd', total: 300 }];
  assert.equal(positionLabel(totals, 'a'), '1st of 4');
  assert.equal(positionLabel(totals, 'b'), '2nd of 4');
  assert.equal(positionLabel(totals, 'c'), '2nd of 4');
  assert.equal(positionLabel(totals, 'd'), '4th of 4');
  assert.equal(positionLabel(totals, 'zzz'), null);
});
