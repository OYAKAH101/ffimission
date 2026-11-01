import mongoose from 'mongoose';
import { ATTENDANCE_STATUSES, AUDIENCES, DAYS, ROLE_VALUES } from '../lib/constants.js';

const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

// ---------------------------------------------------------------- accounts

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    // Login identifiers. Both are optional but at least one must exist (checked in the import
    // and create scripts). Unset fields must stay `undefined`, never null, so the unique
    // sparse indexes only apply to people who have one.
    email: { type: String, lowercase: true, trim: true, unique: true, sparse: true, maxlength: 200 },
    username: { type: String, lowercase: true, trim: true, unique: true, sparse: true, maxlength: 80 },
    // `select: false` keeps the hash out of every query unless asked for by name.
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLE_VALUES, required: true, index: true },
    active: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: true },
    // Pupil logins only: the issued password, encrypted (see lib/credentialVault.js).
    issuedPasswordEnc: { type: String, select: false },
    failedLogins: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    lastLoginAt: { type: Date },
    passwordChangedAt: { type: Date },
    // Student accounts only: the one pupil record this account may see.
    pupilId: { type: ObjectId, ref: 'Pupil' },
  },
  { timestamps: true },
);

// What the browser is allowed to know about a signed-in user. Nothing else leaves the server.
userSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    name: this.name,
    email: this.email ?? null,
    username: this.username ?? null,
    role: this.role,
    mustChangePassword: this.mustChangePassword,
  };
};

// ------------------------------------------------------------ school structure

const classSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    order: { type: Number, default: 0 }, // sorts Creche ... Primary 6
    subjects: [{ type: String, trim: true }],
    classTeacherId: { type: ObjectId, ref: 'User' },
    subjectTeachers: [
      { _id: false, teacherId: { type: ObjectId, ref: 'User', required: true }, subject: { type: String, required: true } },
    ],
  },
  { timestamps: true },
);

const termSchema = new Schema(
  {
    session: { type: String, required: true, trim: true }, // "2026/2027"
    term: { type: String, required: true, trim: true }, // "First Term"
    startDate: Date,
    endDate: Date,
    feeDueDate: Date,
    current: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);
termSchema.index({ session: 1, term: 1 }, { unique: true });

const pupilSchema = new Schema(
  {
    admissionNo: { type: String, required: true, unique: true, trim: true, uppercase: true },
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    otherNames: { type: String, trim: true, maxlength: 120 },
    gender: { type: String, enum: ['Male', 'Female'] },
    dateOfBirth: { type: Date },
    classId: { type: ObjectId, ref: 'SchoolClass', required: true, index: true },
    // The parents/guardians who may see this pupil. This list is the ONLY thing that
    // lets a parent account open a pupil's records.
    guardianIds: [{ type: ObjectId, ref: 'User' }],
    photoFile: { type: String }, // set (to the image type) when a photograph exists; the image itself is in PupilPhoto
    status: { type: String, enum: ['active', 'left'], default: 'active', index: true },
  },
  { timestamps: true },
);
pupilSchema.index({ guardianIds: 1 });
pupilSchema.virtual('name').get(function fullName() {
  return [this.firstName, this.otherNames, this.lastName].filter(Boolean).join(' ');
});

// ------------------------------------------------------------ academic records

const resultSchema = new Schema(
  {
    pupilId: { type: ObjectId, ref: 'Pupil', required: true },
    session: { type: String, required: true },
    term: { type: String, required: true },
    subject: { type: String, required: true, trim: true },
    ca: { type: Number, required: true, min: 0 },
    exam: { type: Number, required: true, min: 0 },
    enteredBy: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true },
);
resultSchema.index({ pupilId: 1, session: 1, term: 1, subject: 1 }, { unique: true });

const attendanceSchema = new Schema(
  {
    pupilId: { type: ObjectId, ref: 'Pupil', required: true },
    classId: { type: ObjectId, ref: 'SchoolClass', required: true },
    date: { type: Date, required: true }, // UTC midnight of the school day
    status: { type: String, enum: ATTENDANCE_STATUSES, required: true },
    recordedBy: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true },
);
attendanceSchema.index({ pupilId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ classId: 1, date: 1 });

// ------------------------------------------------------------------- money

// A charge for a term. Set `classId` to charge every pupil in a class, or `pupilId` for one pupil.
const feeItemSchema = new Schema(
  {
    classId: { type: ObjectId, ref: 'SchoolClass' },
    pupilId: { type: ObjectId, ref: 'Pupil' },
    session: { type: String, required: true },
    term: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 }, // whole naira
  },
  { timestamps: true },
);
feeItemSchema.index({ session: 1, term: 1, classId: 1 });
feeItemSchema.index({ session: 1, term: 1, pupilId: 1 });

const paymentSchema = new Schema(
  {
    pupilId: { type: ObjectId, ref: 'Pupil', required: true, index: true },
    session: { type: String, required: true },
    term: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    paidAt: { type: Date, required: true },
    // Receipt or bank reference. Unique so re-importing the same file cannot double-count.
    reference: { type: String, trim: true, unique: true, sparse: true },
    recordedBy: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// ------------------------------------------------------------- everyday school

const homeworkSchema = new Schema(
  {
    classId: { type: ObjectId, ref: 'SchoolClass', required: true, index: true },
    subject: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    due: { type: Date, required: true },
    createdBy: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

const timetableSchema = new Schema({
  classId: { type: ObjectId, ref: 'SchoolClass', required: true, index: true },
  day: { type: String, enum: DAYS, required: true },
  time: { type: String, required: true },
  subject: { type: String, required: true, trim: true },
  order: { type: Number, default: 0 },
});

const announcementSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    audience: { type: String, enum: AUDIENCES, default: 'Everyone' },
    postedAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date },
    createdBy: { type: ObjectId, ref: 'User' },
    // Optional targeting: a message for one class or one pupil (their parents see it too).
    targetClassId: { type: ObjectId, ref: 'SchoolClass', index: true },
    targetPupilId: { type: ObjectId, ref: 'Pupil', index: true },
  },
  { timestamps: true },
);

// ------------------------------------------------------------------- security

const auditSchema = new Schema({
  at: { type: Date, default: Date.now, index: true },
  action: { type: String, required: true, index: true }, // e.g. "login", "login_failed"
  actorId: { type: ObjectId, ref: 'User' },
  message: { type: String, required: true }, // human-readable; never contains passwords
  ip: { type: String },
});

// Photographs live in the database (not on the server's disk) so they survive redeploys on
// hosts whose disk is wiped, and are backed up with everything else. Never served publicly:
// only through the permission-checked route.
const photoSchema = new Schema({
  pupilId: { type: ObjectId, ref: 'Pupil', required: true, unique: true },
  contentType: { type: String, enum: ['image/jpeg', 'image/png', 'image/webp'], required: true },
  data: { type: Buffer, required: true },
});

const model = (name, schema) => mongoose.models[name] ?? mongoose.model(name, schema);

export const User = model('User', userSchema);
export const SchoolClass = model('SchoolClass', classSchema);
export const Term = model('Term', termSchema);
export const Pupil = model('Pupil', pupilSchema);
export const PupilPhoto = model('PupilPhoto', photoSchema);
export const Result = model('Result', resultSchema);
export const Attendance = model('Attendance', attendanceSchema);
export const FeeItem = model('FeeItem', feeItemSchema);
export const Payment = model('Payment', paymentSchema);
export const Homework = model('Homework', homeworkSchema);
export const TimetableEntry = model('TimetableEntry', timetableSchema);
export const Announcement = model('Announcement', announcementSchema);
export const AuditLog = model('AuditLog', auditSchema);
