// Issues a new temporary password for anyone who has forgotten theirs (and unlocks the account).
//   npm run reset-password -- --login parent@example.com
// Until email sending is set up, this is how the school office handles "Forgot password" requests.
import mongoose from 'mongoose';
import { parseArgs } from 'node:util';
import { User } from '../src/models/index.js';
import { generateTempPassword, hashPassword } from '../src/lib/passwords.js';
import { encryptSecret } from '../src/lib/credentialVault.js';
import { audit } from '../src/lib/audit.js';

const { values } = parseArgs({ options: { login: { type: 'string' } } });
const login = values.login?.trim().toLowerCase();
if (!login) {
  console.error('Usage: npm run reset-password -- --login <email or username>');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set. Copy server/.env.example to server/.env and fill it in.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
const user = await User.findOne({ $or: [{ email: login }, { username: login }] });
if (!user) {
  console.error(`No account found for "${login}".`);
  await mongoose.disconnect();
  process.exit(1);
}

const password = generateTempPassword();
const isPupil = user.role === 'student';
if (isPupil && !process.env.CREDENTIAL_KEY) {
  console.error('CREDENTIAL_KEY is not set in server/.env (see .env.example).');
  process.exit(1);
}
await User.updateOne(
  { _id: user._id },
  {
    passwordHash: await hashPassword(password),
    mustChangePassword: !isPupil,
    ...(isPupil ? { issuedPasswordEnc: encryptSecret(password, process.env.CREDENTIAL_KEY) } : {}),
    failedLogins: 0,
    $unset: { lockedUntil: 1 },
  },
);
await audit({ action: 'password_reset', actorId: user._id, message: `A new temporary password was issued for ${user.name}.` });

console.log(`\nNew temporary password for ${user.name} (${user.role}):\n  Login:    ${login}\n  Password: ${password}\n\nStaff and parents must choose their own password when they sign in; pupils keep this one. Tell them privately; do not send it in a group chat.`);
await mongoose.disconnect();
