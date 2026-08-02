
import { coerce, sanitizeTableName } from './helpers.js';
import { State } from './state.js';
import { saveStateToStorage } from './storage.js';

export function parseDelimited(text, delim) {
  const rowsRaw = [];
  let field = '', row = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === delim) { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rowsRaw.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rowsRaw.push(row); }
  const columns = rowsRaw.shift().map(c => c.trim());
  const rows = rowsRaw.filter(r => r.length > 1 || r[0] !== '').map(r => {
    const obj = {};
    columns.forEach((col, idx) => obj[col] = coerce(r[idx]));
    return obj;
  });
  return { columns, rows };
}

export async function importCSVFile(file) {
  const text = await file.text();
  const ext = file.name.split('.').pop().toLowerCase();
  const delim = ext === 'tsv' ? '\t' : ',';
  const { columns, rows } = parseDelimited(text, delim);
  const name = sanitizeTableName(file.name);
  State.tables[name] = { columns, rows };
  await saveStateToStorage();
  return name;
}
