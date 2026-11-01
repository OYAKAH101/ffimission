import { z } from 'zod';

// ---- admission numbers: IMM/2026/0001, IMM/2026/0002 ...
// The prefix is an assumption: change it here if the school uses another format.
export const ADMISSION_PREFIX = 'IMM';

export function nextAdmissionNo(existing, year, prefix = ADMISSION_PREFIX) {
  const pattern = new RegExp(`^${prefix}/${year}/(\\d+)$`, 'i');
  let highest = 0;
  for (const value of existing) {
    const match = pattern.exec(String(value));
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `${prefix}/${year}/${String(highest + 1).padStart(4, '0')}`;
}

// Classes created by "Add the usual classes". ASSUMPTION: confirm the names and order with the school.
export const STANDARD_CLASSES = ['Creche', 'Nursery 1', 'Nursery 2', 'Nursery 3', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'];

// ---- request validation (strings only, so odd JSON such as { "$gt": "" } is refused)
const blankToUndefined = (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value);
const name = z.string().trim().min(1, 'Enter a name.').max(80);
const optional = (schema) => z.preprocess(blankToUndefined, schema.optional());

const fields = {
  firstName: name,
  lastName: name,
  otherNames: optional(z.string().trim().max(120)),
  gender: optional(z.enum(['Male', 'Female'])),
  classId: z.string().min(1, 'Choose a class.'),
};

export const createPupilSchema = z.object({
  ...fields,
  admissionNo: optional(z.string().trim().max(40).regex(/^[A-Za-z0-9/._-]+$/, 'Use letters, numbers and / . _ - only.')),
});

export const updatePupilSchema = z
  .object({ firstName: fields.firstName.optional(), lastName: fields.lastName.optional(), otherNames: fields.otherNames, gender: fields.gender, classId: fields.classId.optional() })
  .strict()
  .refine((value) => Object.values(value).some((item) => item !== undefined), { message: 'Nothing to change.' });

export const classNameSchema = z.object({ name: z.string().trim().min(1, 'Enter a class name.').max(40) });
