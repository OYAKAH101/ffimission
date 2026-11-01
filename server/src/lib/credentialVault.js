import crypto from 'node:crypto';

// The school office wants to be able to look up each pupil's password (pupils are small
// children and cannot change it themselves). So, for PUPIL logins only, the issued password is
// kept encrypted (AES-256-GCM) with a key that lives in the server's environment, never in the
// database. Signing in still checks the bcrypt hash; this copy exists only so the administrator
// can read it back. Anyone with the database alone sees unreadable bytes.

const keyFrom = (secret) => crypto.createHash('sha256').update(String(secret)).digest();

export function encryptSecret(plain, secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyFrom(secret), iv);
  const body = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((part) => part.toString('base64')).join('.');
}

// Returns null (never throws) when the value is missing, damaged, or the key is different.
export function decryptSecret(stored, secret) {
  try {
    const [iv, tag, body] = String(stored).split('.').map((part) => Buffer.from(part, 'base64'));
    if (!iv || !tag || !body || iv.length !== 12 || tag.length !== 16) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyFrom(secret), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
