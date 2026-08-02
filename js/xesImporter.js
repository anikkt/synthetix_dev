
import { sanitizeTableName } from './helpers.js';
import { State } from './state.js';
import { saveStateToStorage } from './storage.js';

export async function importXESFile(file) {
  const text = await file.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, "text/xml");
  const traces = xmlDoc.querySelectorAll("trace");

  const rows = [];
  traces.forEach(trace => {
    let caseId = "";
    trace.querySelectorAll(":scope > string, :scope > int").forEach(attr => {
      if (attr.getAttribute("key") === "concept:name") {
        caseId = attr.getAttribute("value");
      }
    });

    trace.querySelectorAll("event").forEach(event => {
      const row = { case_id: caseId };
      event.childNodes.forEach(attr => {
        if (attr.nodeType === 1) {
          const key = attr.getAttribute("key");
          const val = attr.getAttribute("value");
          if (key === "concept:name") row.activity = val;
          else if (key === "time:timestamp") row.timestamp = val;
          else if (key) row[key] = val;
        }
      });
      rows.push(row);
    });
  });

  const columns = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const tableName = sanitizeTableName(file.name);
  State.tables[tableName] = { columns, rows };
  await saveStateToStorage();
  return tableName;
}
