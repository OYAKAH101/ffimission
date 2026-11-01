import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../src/lib/csv.js';
import * as P from '../src/lib/importParsers.js';

const csv = (text) => parseCsv(text.trim() + '\n');

test('a good pupils file is accepted and normalised', () => {
  const { rows, errors } = P.parsePupils(csv(`
admission_no,first_name,last_name,other_names,gender,date_of_birth,class,login,guardian_name,guardian_email,guardian2_name,guardian2_email
IMM/2024/0142,Ada,Okoye,,Female,2018-03-09,Primary 4,,Mrs Okoye,Ngozi@Example.com,,
`));
  assert.deepEqual(errors, []);
  assert.equal(rows[0].guardian_email, 'ngozi@example.com');
  assert.equal(rows[0].date_of_birth.toISOString(), '2018-03-09T00:00:00.000Z');
  assert.equal(rows[0].login, undefined);
});

test('pupil rows report what is wrong and on which line', () => {
  const { rows, errors } = P.parsePupils(csv(`
admission_no,first_name,last_name,class,gender,date_of_birth,guardian_email,guardian_name,login
IMM/1,Ada,Okoye,Primary 4,Girl,2018-03-09,,,
IMM/2,Eze,,Primary 4,Male,2018-03-09,,,
IMM/3,Uche,Obi,Primary 4,Male,09/03/2018,,,
IMM/4,Tobi,Ade,Primary 4,Male,2018-03-09,a@b.com,,
IMM/5,Kemi,Ola,Primary 4,Female,2018-03-09,,,bad login!
IMM/6,Zara,Bello,Primary 4,Female,2018-02-30,,,
`));
  assert.equal(rows.length, 0);
  const text = errors.join('\n');
  assert.match(text, /line 2: gender must be Male or Female/);
  assert.match(text, /line 3: last_name is required/);
  assert.match(text, /line 4: date_of_birth must be a date written YYYY-MM-DD/);
  assert.match(text, /line 5: guardian_name is needed/);
  assert.match(text, /line 6: login must be/);
  assert.match(text, /line 7: date_of_birth must be a date/); // 30 February is not a date
});

test('the same parent on two children is allowed; a repeated second guardian is not', () => {
  const ok = P.parsePupils(csv(`
admission_no,first_name,last_name,class,guardian_name,guardian_email
A/1,Ada,Okoye,Primary 4,Mrs Okoye,mum@example.com
A/2,Bola,Okoye,Nursery 3,Mrs Okoye,mum@example.com
`));
  assert.equal(ok.rows.length, 2);
  const bad = P.parsePupils(csv(`
admission_no,first_name,last_name,class,guardian_name,guardian_email,guardian2_name,guardian2_email
A/1,Ada,Okoye,Primary 4,Mrs Okoye,mum@example.com,Mr Okoye,mum@example.com
`));
  assert.match(bad.errors[0], /repeats guardian_email/);
});

test('blank or out-of-range scores are errors, never a silent zero', () => {
  const { rows, errors } = P.parseResults(csv(`
admission_no,subject,ca,exam
A/1,Maths,34,52
A/1,English,,40
A/1,Science,45,40
A/1,Civic,30,70
A/1,Art,abc,10
`));
  assert.equal(rows.length, 1);
  assert.equal(errors.length, 4);
  assert.match(errors[0], /line 3: ca is required/);
  assert.match(errors[1], /line 4:.*ca must be 0 to 40/);
  assert.match(errors[3], /line 6: ca must be a number/);
});

test('fees: charge a class or one pupil, never both or neither; amounts are whole naira', () => {
  const { rows, errors } = P.parseFees(csv(`
class,admission_no,item,amount
Primary 4,,Tuition,70000
,A/1,Uniform,12500
Primary 4,A/1,Both,1000
,,Neither,1000
Primary 4,,Tuition,70000.5
Primary 4,,Tuition,
`));
  assert.equal(rows.length, 2);
  assert.equal(errors.length, 4);
});

test('payments need a unique-able reference and a real date', () => {
  const { rows, errors } = P.parsePayments(csv(`
admission_no,amount,date,reference
A/1,60000,2026-09-20,RCPT-001
A/1,60000,2026-09-20,
A/1,60000,20-09-2026,RCPT-003
`));
  assert.equal(rows.length, 1);
  assert.equal(errors.length, 2);
});

test('attendance, timetable and announcements validate their fixed choices', () => {
  assert.equal(P.parseAttendance(csv('admission_no,date,status\nA/1,2026-09-14,Present\n')).rows[0].status, 'present');
  assert.equal(P.parseAttendance(csv('admission_no,date,status\nA/1,2026-09-14,sick\n')).errors.length, 1);
  assert.equal(P.parseTimetable(csv('class,day,time,subject\nP4,monday,8:30,Maths\n')).errors.length, 0);
  assert.equal(P.parseTimetable(csv('class,day,time,subject\nP4,Saturday,8:30,Maths\n')).errors.length, 1);
  assert.equal(P.parseAnnouncements(csv('title,body,audience\nHi,Body,Staff\n')).errors.length, 1);
  assert.equal(P.parseAnnouncements(csv('title,body,audience\nHi,Body,Parents\n')).errors.length, 0);
});

test('classes: subjects split on semicolons, order defaults to 0', () => {
  const { rows, errors } = P.parseClasses(csv('name,order,subjects,class_teacher_email\nPrimary 4,,Maths; English ;Science,\n'));
  assert.deepEqual(errors, []);
  assert.deepEqual(rows[0].subjects, ['Maths', 'English', 'Science']);
  assert.equal(rows[0].order, 0);
});

test('admission numbers become safe usernames and photo file names', () => {
  assert.equal(P.admissionSlug('IMM/2024/0142'), 'imm-2024-0142');
  assert.equal(P.admissionSlug(' imm 2024 / 0142 '), 'imm-2024-0142');
  assert.match(P.admissionSlug('IMM/2024/0142'), P.LOGIN_PATTERN);
});
