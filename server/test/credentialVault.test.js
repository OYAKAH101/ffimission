import test from 'node:test';
import assert from 'node:assert/strict';
import { decryptSecret, encryptSecret } from '../src/lib/credentialVault.js';

const KEY = 'k'.repeat(40);

test('a stored password can be read back with the same key', () => {
  assert.equal(decryptSecret(encryptSecret('Pa55word', KEY), KEY), 'Pa55word');
});
test('the stored value does not contain the password', () => {
  assert.ok(!encryptSecret('Pa55word', KEY).includes('Pa55word'));
});
test('two encryptions of the same password differ', () => {
  assert.notEqual(encryptSecret('Pa55word', KEY), encryptSecret('Pa55word', KEY));
});
test('a different key, damaged or missing value gives null', () => {
  const stored = encryptSecret('Pa55word', KEY);
  assert.equal(decryptSecret(stored, 'x'.repeat(40)), null);
  assert.equal(decryptSecret(stored.slice(0, -4) + 'AAAA', KEY), null);
  assert.equal(decryptSecret(undefined, KEY), null);
  assert.equal(decryptSecret('garbage', KEY), null);
});
