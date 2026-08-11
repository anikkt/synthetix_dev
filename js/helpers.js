function sanitizeTableName(filename) {
  return filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
}


function parseDelimited(text, delim) {
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


function coerce(v) {
  if (v === undefined || v === '') return '';
  if (!isNaN(v) && v.trim() !== '') return Number(v);
  return v;
}


function renderTableHTML(columns, rows) {
  let html = '<table class="datatable"><thead><tr>' + columns.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
  rows.forEach(r => {
    html += '<tr>' + columns.map(c => `<td>${r[c] ?? ''}</td>`).join('') + '</tr>';
  });
  html += '</tbody></table>';
  return html;
}


function parseTS(v) {
  if (v === '' || v === undefined || v === null) return NaN;
  if (typeof v === 'number') return v;
  const t = new Date(v).getTime();
  return isNaN(t) ? NaN : t;
}


function formatDuration(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return '';
  const sec = Math.abs(ms) / 1000;
  if (sec < 60) return sec.toFixed(0) + 's';
  const min = sec / 60;
  if (min < 60) return min.toFixed(1) + 'm';
  const hr = min / 60;
  if (hr < 24) return hr.toFixed(1) + 'h';
  return (hr / 24).toFixed(1) + 'd';
}

/* ---- Build per-case sorted event sequences once, then filter/aggregate cheaply on every slider tick ---- */

function fmtDate(d) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}


function tableOptionsHTML(selected) {
  return Object.keys(State.tables).map(t => `<option value="${t}"${t===selected?' selected':''}>${t}</option>`).join('');
}

/* ---- Undo / Redo (per dashboard, in-memory) ---- */

function esc(v) { return (v || '').toString().replace(/"/g, '&quot;'); }


function aggSelectHTML(id) {
  return `<select id="${id}">
    <option value="COUNT">Count</option>
    <option value="COUNTD">Count (distinct)</option>
    <option value="SUM">Sum</option>
    <option value="AVG">Average</option>
    <option value="MIN">Min</option>
    <option value="MAX">Max</option>
  </select>`;
}


function newWidgetLayout(widget, d) {
  const n = d.widgets.length;
  const cols = 3, cellW = 340, cellH = 260, gap = 16;
  widget.layout = { x: (n % cols) * (cellW + gap), y: Math.floor(n / cols) * (cellH + gap), w: cellW, h: cellH };
  return widget;
}

/* ---- Chart config (X axis / Y axis, OLAP columns, axis + data label options) ---- */

function formatNum(v) {
  if (!isFinite(v)) return '—';
  return Math.abs(v % 1) < 0.001 ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
