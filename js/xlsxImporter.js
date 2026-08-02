
import { sanitizeTableName } from './helpers.js';
import { State } from './state.js';
import { saveStateToStorage } from './storage.js';

export async function importXLSXFile(file) {
  if (typeof XLSX === 'undefined') {
    throw new Error('SheetJS library not loaded');
  }
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (!jsonRows || jsonRows.length === 0) throw new Error('Spreadsheet is empty');
  
  const columns = jsonRows[0].map(c => String(c).trim());
  const rows = jsonRows.slice(1).map(r => {
    const obj = {};
    columns.forEach((col, idx) => obj[col] = r[idx] ?? '');
    return obj;
  });

  const tableName = sanitizeTableName(file.name);
  State.tables[tableName] = { columns, rows };
  await saveStateToStorage();
  return tableName;
}
