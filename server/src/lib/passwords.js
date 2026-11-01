import bcrypt from 'bcryptjs';

// bcrypt cost 12: slow enough to resist guessing, fast enough for a login.
const COST = 12;

export const hashPassword = (plain) => bcrypt.hash(plain, COST);
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

// Compared against when the account does not exist, so "unknown user" takes about
// as long as "wrong password" and cannot be told apart by timing.
export const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-for-timing', COST);

export { generateTempPassword } from './tempPassword.js';
