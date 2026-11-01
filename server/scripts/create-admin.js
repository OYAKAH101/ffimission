// Creates (or re-issues) an administrator account.
//   npm run create-admin -- --name "Sr. Mary Joseph" --email office@yourschool.org
// Prints a temporary password ONCE. The admin must change it at first sign-in.
import mongoose from 'mongoose';
import { parseArgs } from 'node:util';
import { User } from '../src/models/index.js';
import { generateTempPassword, hashPassword } from '../src/lib/passwords.js';
import { audit } from '../src/lib/audit.js';

const { values } = parseArgs({ options: { name: { type: 'string' }, email: { type: 'string' } } });
const email = values.email?.trim().toLowerCase();
if (!values.name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Usage: npm run create-admin -- --name "Full Name" --email someone@example.com');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set. Copy server/.env.example to server/.env and fill it in.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
const existing = await User.findOne({ email });
if (existing && existing.role !== 'admin') {
  console.error(`${email} already belongs to a ${existing.role} account. Use a different email.`);
  process.exit(1);
}

const password = generateTempPassword(12);
const passwordHash = await hashPassword(password);
if (existing) {
  await User.updateOne({ _id: existing._id }, { name: values.name, passwordHash, mustChangePassword: true, active: true, failedLogins: 0, $unset: { lockedUntil: 1 } });
} else {
  await User.create({ name: values.name, email, role: 'admin', passwordHash, mustChangePassword: true });
}
await audit({ action: 'admin_created', message: `Administrator account ${existing ? 'reset' : 'created'} for ${values.name}.` });

console.log(`\nAdministrator ${existing ? 'password reset' : 'created'}.\n  Login:              ${email}\n  Temporary password: ${password}\n\nWrite it down now: it is not stored anywhere readable and will not be shown again.`);
await mongoose.disconnect();
