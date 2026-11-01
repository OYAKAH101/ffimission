import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passwordProblem } from '../src/lib/passwordPolicy.js';

test('accepts a reasonable password', () => assert.equal(passwordProblem('Sunrise-Mango-42'), null));
test('rejects short, common and repeated passwords', () => {
  assert.ok(passwordProblem('abc123'));
  assert.ok(passwordProblem('Password123'));
  assert.ok(passwordProblem('aaaaaaaaaa'));
  assert.ok(passwordProblem('x'.repeat(129)));
  assert.ok(passwordProblem(undefined));
});
test('rejects a password equal to the login', () => {
  assert.ok(passwordProblem('parent@example.com', { login: 'Parent@Example.com' }));
});
