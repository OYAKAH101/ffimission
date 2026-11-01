// Small CSV reader: handles quoted fields, commas and line breaks inside quotes, "" escapes,
// Windows line endings and the byte-order mark Excel adds. No dependencies.
export function parseCsv(text) {
  const clean = String(text).replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { field += '"'; i += 1; } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  if (quoted) throw new Error('A quoted field was never closed (missing closing quote).');

  const nonBlank = rows.filter((r) => r.some((cell) => cell.trim() !== ''));
  if (!nonBlank.length) return [];
  const headers = nonBlank[0].map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, '_'));
  return nonBlank.slice(1).map((cells, index) => {
    const record = { _line: index + 2 }; // line number in the file, for error messages
    headers.forEach((h, i) => { record[h] = (cells[i] ?? '').trim(); });
    return record;
  });
}

// Quote a value for writing CSV.
export const csvCell = (value) => {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};
export const toCsv = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
