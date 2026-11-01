import express, { Router } from 'express';
import { Pupil, PupilPhoto, SchoolClass, User } from '../models/index.js';
import { asyncHandler, parseId, requireAuth, requirePasswordChanged, requireRole } from '../middleware/auth.js';
import { ROLES } from '../lib/constants.js';
import { admissionSlug } from '../lib/importParsers.js';
import { generateTempPassword, hashPassword } from '../lib/passwords.js';
import { decryptSecret, encryptSecret } from '../lib/credentialVault.js';
import { config } from '../config.js';
import { classNameSchema, createPupilSchema, nextAdmissionNo, STANDARD_CLASSES, updatePupilSchema } from '../lib/pupilAccounts.js';
import { imageKind, MAX_PHOTO_BYTES, MIME_BY_KIND } from '../lib/images.js';
import { endSessionsFor } from '../lib/sessions.js';
import { pupilName } from '../lib/pupilOverview.js';
import { audit } from '../lib/audit.js';

const router = Router();
router.use(requireAuth, requirePasswordChanged, requireRole(ROLES.ADMIN));

const firstIssue = (parsed) => parsed.error.issues[0]?.message ?? 'Please check the details and try again.';
const noStore = (res) => res.set('Cache-Control', 'no-store');

// ------------------------------------------------------------------ classes

router.get(
  '/classes',
  asyncHandler(async (req, res) => {
    const [classes, counts] = await Promise.all([
      SchoolClass.find().sort({ order: 1, name: 1 }).lean(),
      Pupil.aggregate([{ $match: { status: 'active' } }, { $group: { _id: '$classId', n: { $sum: 1 } } }]),
    ]);
    const perClass = new Map(counts.map((c) => [String(c._id), c.n]));
    noStore(res);
    res.json({ classes: classes.map((c) => ({ id: String(c._id), name: c.name, pupils: perClass.get(String(c._id)) ?? 0 })) });
  }),
);

router.post(
  '/classes',
  asyncHandler(async (req, res) => {
    const parsed = classNameSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed) });
    if (await SchoolClass.exists({ name: parsed.data.name })) return res.status(409).json({ message: 'A class with that name already exists.' });
    const last = await SchoolClass.findOne().sort({ order: -1 }).select('order').lean();
    const created = await SchoolClass.create({ name: parsed.data.name, order: (last?.order ?? 0) + 1 });
    await audit({ action: 'class_created', actorId: req.user._id, message: `Class "${created.name}" was added.`, ip: req.ip });
    res.status(201).json({ class: { id: String(created._id), name: created.name, pupils: 0 } });
  }),
);

// One click to create Creche to Primary 6. Classes that already exist are left alone.
router.post(
  '/classes/standard',
  asyncHandler(async (req, res) => {
    let added = 0;
    for (const [index, className] of STANDARD_CLASSES.entries()) {
      if (!(await SchoolClass.exists({ name: className }))) {
        await SchoolClass.create({ name: className, order: index + 1 });
        added += 1;
      }
    }
    await audit({ action: 'class_created', actorId: req.user._id, message: `${added} standard class(es) were added.`, ip: req.ip });
    res.json({ added });
  }),
);

// ------------------------------------------------------------------- pupils

async function listRow(pupil, className, account) {
  return {
    id: String(pupil._id),
    name: pupilName(pupil),
    firstName: pupil.firstName,
    lastName: pupil.lastName,
    gender: pupil.gender ?? null,
    admissionNo: pupil.admissionNo,
    classId: String(pupil.classId),
    className: className ?? 'Not assigned',
    hasPhoto: Boolean(pupil.photoFile),
    username: account?.username ?? null,
    signInState: !account ? 'no-account' : account.lockedUntil && account.lockedUntil > new Date() ? 'locked' : account.lastLoginAt ? 'active' : 'never',
    lastLoginAt: account?.lastLoginAt ?? null,
  };
}

router.get(
  '/pupils',
  asyncHandler(async (req, res) => {
    const [pupils, classes] = await Promise.all([Pupil.find({ status: 'active' }).lean(), SchoolClass.find().lean()]);
    const accounts = await User.find({ role: ROLES.STUDENT, pupilId: { $in: pupils.map((p) => p._id) } })
      .select('username pupilId lastLoginAt lockedUntil')
      .lean();
    const byPupil = new Map(accounts.map((a) => [String(a.pupilId), a]));
    const classInfo = new Map(classes.map((c) => [String(c._id), c]));
    const rows = await Promise.all(pupils.map((p) => listRow(p, classInfo.get(String(p.classId))?.name, byPupil.get(String(p._id)))));
    rows.sort((a, b) => (classInfo.get(a.classId)?.order ?? 999) - (classInfo.get(b.classId)?.order ?? 999) || a.name.localeCompare(b.name));
    noStore(res);
    res.json({ pupils: rows });
  }),
);

// Adds a pupil AND their own login in one step. The password is kept for good: pupils cannot
// change it, and the administrator can look it up again (stored encrypted, see credentialVault.js).
router.post(
  '/pupils',
  asyncHandler(async (req, res) => {
    const parsed = createPupilSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed) });
    const { classId, admissionNo: requested, ...details } = parsed.data;

    const classDoc = parseId(classId) && (await SchoolClass.findById(classId).lean());
    if (!classDoc) return res.status(400).json({ message: 'Choose a class from the list.' });

    let pupil = null;
    for (let attempt = 0; attempt < 4 && !pupil; attempt += 1) {
      const admissionNo = requested
        ? requested.toUpperCase()
        : nextAdmissionNo(await Pupil.distinct('admissionNo'), new Date().getFullYear());
      try {
        pupil = await Pupil.create({ ...details, admissionNo, classId: classDoc._id });
      } catch (error) {
        if (error.code !== 11000) throw error;
        if (requested) return res.status(409).json({ message: `Admission number ${requested.toUpperCase()} is already used by another pupil.` });
        // generated number was taken by a simultaneous request: loop and take the next one
      }
    }
    if (!pupil) return res.status(409).json({ message: 'Could not choose an admission number. Please try again.' });

    const username = admissionSlug(pupil.admissionNo);
    const temporaryPassword = generateTempPassword(10);
    try {
      await User.create({
        name: pupilName(pupil), role: ROLES.STUDENT, username, pupilId: pupil._id,
        passwordHash: await hashPassword(temporaryPassword), mustChangePassword: false,
        issuedPasswordEnc: encryptSecret(temporaryPassword, config.credentialKey),
      });
    } catch (error) {
      await Pupil.deleteOne({ _id: pupil._id }); // never leave a pupil without a login behind
      if (error.code === 11000) return res.status(409).json({ message: `The username ${username} is already taken.` });
      throw error;
    }

    await audit({ action: 'pupil_created', actorId: req.user._id, message: `${pupilName(pupil)} was added to ${classDoc.name}.`, ip: req.ip });
    noStore(res);
    return res.status(201).json({
      pupil: await listRow(pupil.toObject(), classDoc.name, { username }),
      credentials: { username, password: temporaryPassword },
    });
  }),
);

router.patch(
  '/pupils/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const parsed = updatePupilSchema.safeParse(req.body);
    if (!id) return res.status(404).json({ message: 'Pupil not found.' });
    if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed) });

    const changes = { ...parsed.data };
    if (changes.classId) {
      const classDoc = parseId(changes.classId) && (await SchoolClass.findById(changes.classId).lean());
      if (!classDoc) return res.status(400).json({ message: 'Choose a class from the list.' });
    }
    const pupil = await Pupil.findOneAndUpdate({ _id: id, status: 'active' }, { $set: changes }, { new: true, runValidators: true }).lean();
    if (!pupil) return res.status(404).json({ message: 'Pupil not found.' });

    // The login shows the pupil's name, so keep it in step.
    await User.updateOne({ role: ROLES.STUDENT, pupilId: pupil._id }, { name: pupilName(pupil) });
    const [cls, account] = await Promise.all([
      SchoolClass.findById(pupil.classId).lean(),
      User.findOne({ role: ROLES.STUDENT, pupilId: pupil._id }).select('username lastLoginAt lockedUntil').lean(),
    ]);
    await audit({ action: 'pupil_updated', actorId: req.user._id, message: `${pupilName(pupil)}'s details were updated.`, ip: req.ip });
    noStore(res);
    return res.json({ pupil: await listRow(pupil, cls?.name, account) });
  }),
);

// A new password for a pupil (for example if it was shared by mistake). The old one stops
// working and any signed-in session is ended.
router.post(
  '/pupils/:id/reset-password',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const pupil = id && (await Pupil.findOne({ _id: id, status: 'active' }).lean());
    const account = pupil && (await User.findOne({ role: ROLES.STUDENT, pupilId: pupil._id }));
    if (!account) return res.status(404).json({ message: 'Pupil not found.' });

    const temporaryPassword = generateTempPassword(10);
    account.passwordHash = await hashPassword(temporaryPassword);
    account.mustChangePassword = false;
    account.issuedPasswordEnc = encryptSecret(temporaryPassword, config.credentialKey);
    account.passwordChangedAt = new Date();
    account.failedLogins = 0;
    account.lockedUntil = undefined;
    await account.save();
    await endSessionsFor(account._id);

    await audit({ action: 'password_reset', actorId: req.user._id, message: `A new password was issued to ${pupilName(pupil)}.`, ip: req.ip });
    noStore(res);
    return res.json({ credentials: { username: account.username, password: temporaryPassword } });
  }),
);

// The administrator's list of every pupil's login, for handing out or printing. Reading it is
// written to the audit log (who, when), never the passwords themselves. A pupil whose stored
// copy cannot be read (for example the key was changed) shows null: issue a new password.
router.get(
  '/credentials',
  asyncHandler(async (req, res) => {
    const [pupils, classes] = await Promise.all([Pupil.find({ status: 'active' }).lean(), SchoolClass.find().lean()]);
    const accounts = await User.find({ role: ROLES.STUDENT, pupilId: { $in: pupils.map((p) => p._id) } })
      .select('username pupilId +issuedPasswordEnc')
      .lean();
    const byPupil = new Map(accounts.map((a) => [String(a.pupilId), a]));
    const classInfo = new Map(classes.map((c) => [String(c._id), c]));
    const rows = pupils
      .map((p) => {
        const account = byPupil.get(String(p._id));
        return {
          id: String(p._id), name: pupilName(p), className: classInfo.get(String(p.classId))?.name ?? 'Not assigned',
          order: classInfo.get(String(p.classId))?.order ?? 999,
          username: account?.username ?? null,
          password: account?.issuedPasswordEnc ? decryptSecret(account.issuedPasswordEnc, config.credentialKey) : null,
        };
      })
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      .map(({ order, ...row }) => row);
    await audit({ action: 'credentials_viewed', actorId: req.user._id, message: 'The list of pupil logins was opened.', ip: req.ip });
    noStore(res);
    res.json({ credentials: rows });
  }),
);

// Photograph upload: the browser sends the image file itself as the request body.
router.post(
  '/pupils/:id/photo',
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: MAX_PHOTO_BYTES }),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const pupil = id && (await Pupil.findOne({ _id: id, status: 'active' }).lean());
    if (!pupil) return res.status(404).json({ message: 'Pupil not found.' });

    const kind = imageKind(req.body); // trust the bytes, not the label
    if (!kind) return res.status(415).json({ message: 'Choose a JPEG, PNG or WebP photograph.' });

    await PupilPhoto.updateOne({ pupilId: pupil._id }, { contentType: MIME_BY_KIND[kind], data: req.body }, { upsert: true });
    await Pupil.updateOne({ _id: pupil._id }, { photoFile: kind });

    await audit({ action: 'photo_uploaded', actorId: req.user._id, message: `A photograph was saved for ${pupilName(pupil)}.`, ip: req.ip });
    return res.json({ hasPhoto: true });
  }),
);

export default router;
