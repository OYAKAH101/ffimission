import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, toCsv } from '../src/lib/csv.js';

test('reads rows keyed by a cleaned-up header and records the file line', () => {
  const rows = parseCsv('Admission No, First Name\nIMM/1,Ada\nIMM/2,Eze\n');
  assert.deepEqual(rows.map(({ _line, ...r }) => r), [
    { admission_no: 'IMM/1', first_name: 'Ada' },
    { admission_no: 'IMM/2', first_name: 'Eze' },
  ]);
  assert.deepEqual(rows.map((r) => r._line), [2, 3]);
});

test('handles Excel output: BOM, Windows line endings, blank lines', () => {
  const rows = parseCsv('﻿a,b\r\n1,2\r\n\r\n3,4\r\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[1].b, '4');
});

test('handles quotes, commas and line breaks inside fields', () => {
  const rows = parseCsv('name,note\n"Okonkwo, Ada","said ""hi""\nthere"\n');
  assert.equal(rows[0].name, 'Okonkwo, Ada');
  assert.equal(rows[0].note, 'said "hi"\nthere');
});

test('short rows give empty text, never undefined; empty input gives no rows', () => {
  assert.equal(parseCsv('a,b,c\n1\n')[0].c, '');
  assert.deepEqual(parseCsv(''), []);
  assert.deepEqual(parseCsv('a,b\n'), []);
});

test('an unclosed quote is reported instead of swallowing the file', () => {
  assert.throws(() => parseCsv('a,b\n"oops,1\n'), /quote/i);
});

test('writes values that need quoting safely', () => {
  assert.equal(toCsv([['a', 'b,c', 'say "x"']]), 'a,"b,c","say ""x"""\n');
});
