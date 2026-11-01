// Loads school data from CSV files (and pupil photos) into MongoDB.
//
//   npm run import -- --check              check the files only, change nothing
//   npm run import                         load everything found in server/data/import/
//   npm run import -- --dir ./my-folder    use another folder
//
// Safe to run again: records are matched (by admission number, email, class name, reference ...)
// and updated, never duplicated. Existing passwords are never changed by an import.
// New accounts get a random temporary password, written ONCE to server/output/credentials-*.csv.

import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { parseArgs } from 'node:util';
import { SERVER_ROOT, OUTPUT_DIR } from '../src/lib/paths.js';
import { parseCsv, toCsv } from '../src/lib/csv.js';
import * as P from '../src/lib/importParsers.js';
import { admissionSlug } from '../src/lib/importParsers.js';
import { generateTempPassword, hashPassword } from '../src/lib/passwords.js';
import { encryptSecret } from '../src/lib/credentialVault.js';
import { ROLES } from '../src/lib/constants.js';
import { audit } from '../src/lib/audit.js';
import { imageKind, MAX_PHOTO_BYTES, MIME_BY_KIND } from '../src/lib/images.js';
import {
  Announcement, Attendance, FeeItem, Homework, Payment, Pupil, PupilPhoto, Result, SchoolClass, Term, TimetableEntry, User,
} from '../src/models/index.js';

const { values: args } = parseArgs({
  options: { dir: { type: 'string' }, check: { type: 'boolean', default: false } },
});
const DIR = path.resolve(args.dir ?? path.join(SERVER_ROOT, 'data', 'import'));
const PHOTO_SRC = path.join(DIR, 'photos');

if (!fs.existsSync(DIR)) {
  console.error(`Folder not found: ${DIR}\nCreate it and put the CSV files inside (see server/data/import-templates/).`);
  process.exit(1);
}

const errors = [];
const report = [];
const credentials = []; // [role, name, login, temporary password, linked pupils]
const note = (line) => report.push(line);

function readRows(fileName) {
  const file = path.join(DIR, fileName);
  if (!fs.existsSync(file)) return null;
  try {
    return parseCsv(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`${fileName}: ${error.message}`);
    return null;
  }
}

// Reads + checks one file. Returns the valid rows (or null if the file is absent).
function load(fileName, parser) {
  const rows = readRows(fileName);
  if (rows === null) return null;
  const result = parser(rows);
  errors.push(...result.errors);
  note(`${fileName}: ${result.rows.length} usable row(s)${result.errors.length ? `, ${result.errors.length} with problems` : ''}`);
  return result.rows;
}

// ---------------------------------------------------------------------------
const files = {
  term: load('term.csv', P.parseTerms),
  staff: load('staff.csv', P.parseStaff),
  classes: load('classes.csv', P.parseClasses),
  assignments: load('assignments.csv', P.parseAssignments),
  pupils: load('pupils.csv', P.parsePupils),
  results: load('results.csv', P.parseResults),
  fees: load('fees.csv', P.parseFees),
  payments: load('payments.csv', P.parsePayments),
  attendance: load('attendance.csv', P.parseAttendance),
  homework: load('homework.csv', P.parseHomework),
  timetable: load('timetable.csv', P.parseTimetable),
  announcements: load('announcements.csv', P.parseAnnouncements),
};

if (args.check) {
  console.log(`Checked folder: ${DIR}\n`);
  console.log(report.join('\n') || 'No CSV files found.');
  if (fs.existsSync(PHOTO_SRC)) console.log(`photos/: ${fs.readdirSync(PHOTO_SRC).length} file(s) found`);
  finish();
  process.exit(errors.length ? 1 : 0);
}

// ---------------------------------------------------------------------------
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set. Copy server/.env.example to server/.env and fill it in.');
  process.exit(1);
}
await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
await Promise.all([User, Pupil, SchoolClass, Term].map((m) => m.createIndexes()));

const rowError = (file, line, message) => errors.push(`${file} line ${line}: ${message}`);
const lc = (s) => String(s).trim().toLowerCase();

async function newAccount({ name, email, username, role, pupilId, linked }) {
  const password = generateTempPassword();
  // Pupil logins keep their password (encrypted) so the administrator can look it up, and pupils
  // do not change it. Everyone else must choose their own at first sign-in.
  const isPupil = role === ROLES.STUDENT;
  if (isPupil && !process.env.CREDENTIAL_KEY) throw new Error('CREDENTIAL_KEY is not set in server/.env (see .env.example).');
  const user = await User.create({
    name, role, pupilId,
    ...(email ? { email } : {}),
    ...(username ? { username } : {}),
    passwordHash: await hashPassword(password),
    mustChangePassword: !isPupil,
    ...(isPupil ? { issuedPasswordEnc: encryptSecret(password, process.env.CREDENTIAL_KEY) } : {}),
  });
  credentials.push([role, name, email ?? username, password, linked ?? '']);
  return user;
}

// ---- 1. term
if (files.term?.length) {
  const flagged = files.term.filter((t) => lc(t.current ?? '') === 'yes');
  const currentRow = flagged.at(-1) ?? files.term.at(-1);
  await Term.updateMany({}, { current: false });
  for (const t of files.term) {
    await Term.updateOne(
      { session: t.session, term: t.term },
      { $set: { startDate: t.start_date, endDate: t.end_date, feeDueDate: t.fee_due_date, current: t === currentRow } },
      { upsert: true },
    );
  }
  note(`Terms saved. Current term: ${currentRow.session}, ${currentRow.term}`);
}
const term = await Term.findOne({ current: true }).lean();
const defaults = { session: term?.session, term: term?.term };

// ---- 2. staff
const teacherByEmail = new Map();
for (const u of await User.find({ role: ROLES.TEACHER }).lean()) if (u.email) teacherByEmail.set(u.email, u);
let staffCreated = 0;
for (const s of files.staff ?? []) {
  const role = lc(s.role ?? 'teacher') === 'admin' ? ROLES.ADMIN : ROLES.TEACHER;
  let user = await User.findOne({ email: s.email });
  if (user) {
    if (user.role !== role) { rowError('staff.csv', s._line, `${s.email} already exists as ${user.role}; role not changed`); continue; }
    await User.updateOne({ _id: user._id }, { name: s.name });
  } else {
    user = await newAccount({ name: s.name, email: s.email, role });
    staffCreated += 1;
  }
  if (role === ROLES.TEACHER) teacherByEmail.set(s.email, user);
}
if (files.staff) note(`Staff: ${staffCreated} new account(s)`);

// ---- 3. classes
const classByName = new Map();
for (const c of await SchoolClass.find().lean()) classByName.set(lc(c.name), c);
for (const c of files.classes ?? []) {
  const update = { name: c.name, order: c.order, subjects: c.subjects };
  if (c.class_teacher_email) {
    const teacher = teacherByEmail.get(c.class_teacher_email);
    if (teacher) update.classTeacherId = teacher._id;
    else rowError('classes.csv', c._line, `no teacher with email ${c.class_teacher_email} (add them to staff.csv first); class saved without a class teacher`);
  }
  const saved = await SchoolClass.findOneAndUpdate({ name: c.name }, { $set: update }, { upsert: true, new: true }).lean();
  classByName.set(lc(c.name), saved);
}
const findClass = (file, line, name) => {
  const cls = classByName.get(lc(name));
  if (!cls) rowError(file, line, `unknown class "${name}" (check the spelling against classes.csv)`);
  return cls;
};
if (files.classes) note(`Classes: ${files.classes.length} saved`);

// ---- 4. subject-teacher assignments
for (const a of files.assignments ?? []) {
  const cls = findClass('assignments.csv', a._line, a.class);
  const teacher = teacherByEmail.get(a.teacher_email);
  if (!teacher) rowError('assignments.csv', a._line, `no teacher with email ${a.teacher_email}`);
  if (!cls || !teacher) continue;
  await SchoolClass.updateOne({ _id: cls._id }, { $pull: { subjectTeachers: { subject: a.subject } } });
  await SchoolClass.updateOne({ _id: cls._id }, { $push: { subjectTeachers: { teacherId: teacher._id, subject: a.subject } } });
}

// ---- 5. pupils, their parent accounts and their own accounts
let pupilsSaved = 0;
for (const p of files.pupils ?? []) {
  const cls = findClass('pupils.csv', p._line, p.class);
  if (!cls) continue;

  const guardianInputs = [
    [p.guardian_name, p.guardian_email], [p.guardian2_name, p.guardian2_email],
  ].filter(([, mail]) => mail);
  const guardianIds = [];
  let guardianFailed = false;
  for (const [name, mail] of guardianInputs) {
    let parent = await User.findOne({ email: mail });
    if (parent && parent.role !== ROLES.PARENT) {
      rowError('pupils.csv', p._line, `${mail} already belongs to a ${parent.role} account and cannot be used as a parent`);
      guardianFailed = true;
      continue;
    }
    if (!parent) parent = await newAccount({ name, email: mail, role: ROLES.PARENT, linked: p.admission_no });
    else {
      // A parent created earlier in this same run: list every child on their one login slip.
      const slip = credentials.find((row) => row[0] === ROLES.PARENT && row[2] === mail);
      if (slip && !slip[4].split(' ').includes(p.admission_no)) slip[4] += ` ${p.admission_no}`;
    }
    guardianIds.push(parent._id);
  }
  if (guardianFailed) continue;

  const fields = {
    firstName: p.first_name, lastName: p.last_name, otherNames: p.other_names,
    gender: p.gender ? (lc(p.gender) === 'male' ? 'Male' : 'Female') : undefined,
    dateOfBirth: p.date_of_birth, classId: cls._id, status: 'active',
  };
  for (const k of Object.keys(fields)) if (fields[k] === undefined) delete fields[k];
  const update = { $set: fields };
  if (guardianIds.length) update.$set.guardianIds = guardianIds;

  const pupil = await Pupil.findOneAndUpdate({ admissionNo: p.admission_no.toUpperCase() }, update, { upsert: true, new: true, setDefaultsOnInsert: true });
  pupilsSaved += 1;

  // Pupil's own login (only created the first time).
  if (!(await User.exists({ pupilId: pupil._id }))) {
    const login = lc(p.login ?? admissionSlug(p.admission_no));
    const isEmail = login.includes('@');
    if (await User.exists(isEmail ? { email: login } : { username: login })) {
      rowError('pupils.csv', p._line, `login "${login}" is already used by another account; pupil saved without a login`);
    } else {
      await newAccount({
        name: `${p.first_name} ${p.last_name}`, role: ROLES.STUDENT, pupilId: pupil._id, linked: p.admission_no,
        ...(isEmail ? { email: login } : { username: login }),
      });
    }
  }
}
if (files.pupils) note(`Pupils: ${pupilsSaved} saved`);

// ---- helpers for the files that refer to a pupil by admission number
const pupilCache = new Map();
async function pupilFor(file, line, admissionNo) {
  const key = String(admissionNo).trim().toUpperCase();
  if (!pupilCache.has(key)) pupilCache.set(key, await Pupil.findOne({ admissionNo: key }).lean());
  const pupil = pupilCache.get(key);
  if (!pupil) rowError(file, line, `no pupil with admission number "${admissionNo}" (add them to pupils.csv first)`);
  return pupil;
}
function termFor(file, row) {
  const session = row.session ?? defaults.session;
  const termName = row.term ?? defaults.term;
  if (!session || !termName) { rowError(file, row._line, 'no session/term given and no current term set (add term.csv)'); return null; }
  return { session, term: termName };
}

// ---- 6. results
let results = 0;
for (const r of files.results ?? []) {
  const pupil = await pupilFor('results.csv', r._line, r.admission_no);
  const t = termFor('results.csv', r);
  if (!pupil || !t) continue;
  await Result.updateOne({ pupilId: pupil._id, ...t, subject: r.subject }, { $set: { ca: r.ca, exam: r.exam } }, { upsert: true });
  results += 1;
}
if (files.results) note(`Results: ${results} saved`);

// ---- 7. fees and payments
let fees = 0;
for (const f of files.fees ?? []) {
  const t = termFor('fees.csv', f);
  if (!t) continue;
  let scope;
  if (f.class) {
    const cls = findClass('fees.csv', f._line, f.class);
    if (!cls) continue;
    scope = { classId: cls._id };
  } else {
    const pupil = await pupilFor('fees.csv', f._line, f.admission_no);
    if (!pupil) continue;
    scope = { pupilId: pupil._id };
  }
  await FeeItem.updateOne({ ...scope, ...t, label: f.item }, { $set: { amount: f.amount } }, { upsert: true });
  fees += 1;
}
if (files.fees) note(`Fee items: ${fees} saved`);

let payments = 0;
for (const pay of files.payments ?? []) {
  const pupil = await pupilFor('payments.csv', pay._line, pay.admission_no);
  const t = termFor('payments.csv', pay);
  if (!pupil || !t) continue;
  await Payment.updateOne({ reference: pay.reference }, { $set: { pupilId: pupil._id, ...t, amount: pay.amount, paidAt: pay.date } }, { upsert: true });
  payments += 1;
}
if (files.payments) note(`Payments: ${payments} saved`);

// ---- 8. attendance
let attendance = 0;
for (const a of files.attendance ?? []) {
  const pupil = await pupilFor('attendance.csv', a._line, a.admission_no);
  if (!pupil) continue;
  await Attendance.updateOne({ pupilId: pupil._id, date: a.date }, { $set: { classId: pupil.classId, status: a.status } }, { upsert: true });
  attendance += 1;
}
if (files.attendance) note(`Attendance: ${attendance} entries saved`);

// ---- 9. homework
let homework = 0;
for (const h of files.homework ?? []) {
  const cls = findClass('homework.csv', h._line, h.class);
  if (!cls) continue;
  await Homework.updateOne({ classId: cls._id, title: h.title, due: h.due_date }, { $set: { subject: h.subject } }, { upsert: true });
  homework += 1;
}
if (files.homework) note(`Homework: ${homework} saved`);

// ---- 10. timetable (a class's whole timetable is replaced by what the file says)
if (files.timetable?.length) {
  const grouped = new Map();
  for (const row of files.timetable) {
    const cls = findClass('timetable.csv', row._line, row.class);
    if (!cls) continue;
    if (!grouped.has(String(cls._id))) grouped.set(String(cls._id), []);
    grouped.get(String(cls._id)).push({ classId: cls._id, day: row.day[0].toUpperCase() + row.day.slice(1).toLowerCase(), time: row.time, subject: row.subject, order: grouped.get(String(cls._id)).length });
  }
  for (const [classId, entries] of grouped) {
    await TimetableEntry.deleteMany({ classId });
    await TimetableEntry.insertMany(entries);
  }
  note(`Timetable: ${grouped.size} class timetable(s) replaced`);
}

// ---- 11. announcements
let announcements = 0;
for (const a of files.announcements ?? []) {
  const postedAt = a.date ?? new Date();
  await Announcement.updateOne(
    { title: a.title, ...(a.date ? { postedAt } : {}) },
    { $set: { body: a.body, audience: a.audience ?? 'Everyone', ...(a.expires ? { expiresAt: a.expires } : {}) }, $setOnInsert: { postedAt } },
    { upsert: true },
  );
  announcements += 1;
}
if (files.announcements) note(`Announcements: ${announcements} saved`);

// ---- 12. photographs
if (fs.existsSync(PHOTO_SRC)) {
  const bySlug = new Map();
  for await (const p of Pupil.find().select('admissionNo').lean().cursor()) bySlug.set(admissionSlug(p.admissionNo), p);
  let photos = 0;
  for (const name of fs.readdirSync(PHOTO_SRC)) {
    const slug = admissionSlug(path.parse(name).name);
    const pupil = bySlug.get(slug);
    if (!pupil) { errors.push(`photos/${name}: no pupil with admission number matching this file name`); continue; }
    const data = fs.readFileSync(path.join(PHOTO_SRC, name));
    if (data.length > MAX_PHOTO_BYTES) { errors.push(`photos/${name}: larger than 3 MB; please shrink it`); continue; }
    const kind = imageKind(data); // judge by the file's contents, not its extension
    if (!kind) { errors.push(`photos/${name}: not a JPEG, PNG or WebP image`); continue; }
    await PupilPhoto.updateOne({ pupilId: pupil._id }, { contentType: MIME_BY_KIND[kind], data }, { upsert: true });
    await Pupil.updateOne({ _id: pupil._id }, { photoFile: kind });
    photos += 1;
  }
  note(`Photographs: ${photos} saved`);
}

// ---- credentials slip + audit
if (credentials.length) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  const file = path.join(OUTPUT_DIR, `credentials-${stamp}.csv`);
  fs.writeFileSync(file, toCsv([['role', 'name', 'login', 'temporary_password', 'pupil_admission_no'], ...credentials]), { mode: 0o600 });
  note(`\nNEW LOGINS: ${credentials.length} account(s). Temporary passwords are in:\n  ${file}\n  Give each person only their own line, then DELETE this file. Everyone must choose a new password at first sign-in.`);
}
await audit({
  action: 'import',
  message: `Data import finished: ${pupilsSaved} pupil(s), ${results} result(s), ${credentials.length} new account(s).`,
});

finish();
await mongoose.disconnect();
process.exit(errors.length ? 1 : 0);

function finish() {
  console.log(report.join('\n'));
  if (errors.length) {
    console.error(`\n${errors.length} PROBLEM(S) found. Rows with problems were skipped; fix them in the CSV and run again:`);
    for (const e of errors.slice(0, 200)) console.error(`  - ${e}`);
    if (errors.length > 200) console.error(`  ...and ${errors.length - 200} more`);
  } else {
    console.log('\nNo problems found.');
  }
}
