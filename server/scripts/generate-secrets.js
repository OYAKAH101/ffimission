// Prints two long random values for server/.env or your host's environment settings.
//   npm run secrets
import crypto from 'node:crypto';

const make = () => crypto.randomBytes(48).toString('hex');
console.log(`SESSION_SECRET=${make()}`);
console.log(`CREDENTIAL_KEY=${make()}`);
console.log('\nThese must be two DIFFERENT values. Keep CREDENTIAL_KEY somewhere safe: without it the stored pupil passwords cannot be read.');
