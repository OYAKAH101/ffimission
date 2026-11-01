import { randomInt } from 'node:crypto';

// Temporary passwords: no look-alike characters (0/O, 1/l/I) so they can be read out
// or copied from a printed slip without mistakes.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
export function generateTempPassword(length = 10) {
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}
