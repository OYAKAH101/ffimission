import test from 'node:test';
import assert from 'node:assert/strict';
import { createPupilSchema, nextAdmissionNo, STANDARD_CLASSES, updatePupilSchema } from '../src/lib/pupilAccounts.js';
import { imageKind } from '../src/lib/images.js';
import { generateTempPassword } from '../src/lib/tempPassword.js';

test('admission numbers continue from the highest one for the year', () => {
  assert.equal(nextAdmissionNo([], 2026), 'IMM/2026/0001');
  assert.equal(nextAdmissionNo(['IMM/2026/0001', 'IMM/2026/0009', 'IMM/2025/0050', 'OTHER/1'], 2026), 'IMM/2026/0010');
  assert.equal(nextAdmissionNo(['imm/2026/0003'], 2026), 'IMM/2026/0004');
});

test('twenty generated passwords are all different and use no look-alike characters', () => {
  const passwords = Array.from({ length: 20 }, () => generateTempPassword(10));
  assert.equal(new Set(passwords).size, 20);
  for (const p of passwords) assert.match(p, /^[A-HJ-NP-Za-km-z2-9]{10}$/);
});

test('create-pupil validation accepts good input and trims it', () => {
  const ok = createPupilSchema.parse({ firstName: '  Tobi ', lastName: 'Adeyinka', classId: 'abc', gender: 'Male', otherNames: '', admissionNo: '' });
  assert.equal(ok.firstName, 'Tobi');
  assert.equal(ok.otherNames, undefined);
  assert.equal(ok.admissionNo, undefined);
});

test('create-pupil validation refuses bad input, including injection-style objects', () => {
  assert.equal(createPupilSchema.safeParse({ firstName: '', lastName: 'A', classId: 'x' }).success, false);
  assert.equal(createPupilSchema.safeParse({ firstName: 'A', lastName: 'B', classId: { $ne: '' } }).success, false);
  assert.equal(createPupilSchema.safeParse({ firstName: 'A', lastName: 'B', classId: 'x', gender: 'Other' }).success, false);
  assert.equal(createPupilSchema.safeParse({ firstName: 'A', lastName: 'B', classId: 'x', admissionNo: 'bad number!' }).success, false);
});

test('update validation needs a change and rejects unknown fields', () => {
  assert.equal(updatePupilSchema.safeParse({}).success, false);
  assert.equal(updatePupilSchema.safeParse({ classId: 'abc' }).success, true);
  assert.equal(updatePupilSchema.safeParse({ guardianIds: ['x'] }).success, false); // cannot be set through this route
  assert.equal(updatePupilSchema.safeParse({ status: 'left' }).success, false);
});

test('photo type is judged from the file bytes, not the label', () => {
  const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20)]);
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(20)]);
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(10)]);
  assert.equal(imageKind(jpg), 'jpg');
  assert.equal(imageKind(png), 'png');
  assert.equal(imageKind(webp), 'webp');
  assert.equal(imageKind(Buffer.from('<?php echo 1; ?> not an image at all')), null);
  assert.equal(imageKind('not a buffer'), null);
});

test('standard classes run from Creche to Primary 6 without repeats', () => {
  assert.equal(STANDARD_CLASSES.length, 10);
  assert.equal(new Set(STANDARD_CLASSES).size, 10);
});
