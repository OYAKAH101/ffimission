import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRegister, parseScoreRows, parseTerm, usualSubjectsFor } from '../src/lib/recordInput.js';

const A = 'a'.repeat(24);
const B = 'b'.repeat(24);

test('scores: valid rows pass, empty rows are skipped', () => {
  const r = parseScoreRows([{ pupilId: A, ca: '30', exam: 55 }, { pupilId: B, ca: '', exam: '' }]);
  assert.deepEqual(r.rows, [{ pupilId: A, ca: 30, exam: 55 }]);
});
test('scores: limits, half-filled rows, duplicates and junk are refused', () => {
  assert.match(parseScoreRows([{ pupilId: A, ca: 41, exam: 10 }]).error, /CA must be/);
  assert.match(parseScoreRows([{ pupilId: A, ca: 10, exam: 61 }]).error, /Exam must be/);
  assert.match(parseScoreRows([{ pupilId: A, ca: -1, exam: 10 }]).error, /CA must be/);
  assert.match(parseScoreRows([{ pupilId: A, ca: 10, exam: '' }]).error, /both/);
  assert.match(parseScoreRows([{ pupilId: A, ca: 'x', exam: 3 }]).error, /numbers/);
  assert.match(parseScoreRows([{ pupilId: A, ca: 1, exam: 1 }, { pupilId: A, ca: 1, exam: 1 }]).error, /twice/);
  assert.ok(parseScoreRows([{ pupilId: { $gt: '' }, ca: 1, exam: 1 }]).error);
  assert.ok(parseScoreRows([{ pupilId: A, ca: '', exam: '' }]).error);
  assert.ok(parseScoreRows([]).error);
});
const today = new Date(Date.UTC(2026, 9, 31));
test('register: valid, future date, bad status', () => {
  assert.ok(parseRegister({ date: '2026-10-30', marks: [{ pupilId: A, status: 'late' }] }, today).day);
  assert.match(parseRegister({ date: '2026-11-02', marks: [{ pupilId: A, status: 'present' }] }, today).error, /future/);
  assert.ok(parseRegister({ date: '2026-02-30', marks: [{ pupilId: A, status: 'present' }] }, today).error);
  assert.ok(parseRegister({ date: '2026-10-30', marks: [{ pupilId: A, status: 'sleeping' }] }, today).error);
});
test('term: session must be consecutive years and term must be one of three', () => {
  assert.deepEqual(parseTerm({ session: '2026/2027', term: 'First Term' }), { session: '2026/2027', term: 'First Term' });
  assert.ok(parseTerm({ session: '2026/2028', term: 'First Term' }).error);
  assert.ok(parseTerm({ session: '2026/2027', term: 'Fourth' }).error);
});
test('usual subjects differ for nursery and primary', () => {
  assert.ok(usualSubjectsFor('Nursery 2').includes('Number Work'));
  assert.ok(usualSubjectsFor('Primary 4').includes('Mathematics'));
});
