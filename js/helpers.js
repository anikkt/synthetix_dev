
export function sanitizeTableName(filename) {
  return filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
}

export function coerce(v) {
  if (v === undefined || v === '') return '';
  if (!isNaN(v) && v.trim() !== '') return Number(v);
  return v;
}

export function esc(v) {
  return (v || '').toString().replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function formatNum(v) {
  if (!isFinite(v)) return '—';
  return Math.abs(v % 1) < 0.001 ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatDuration(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return '';
  const sec = Math.abs(ms) / 1000;
  if (sec < 60) return sec.toFixed(0) + 's';
  const min = sec / 60;
  if (min < 60) return min.toFixed(1) + 'm';
  const hr = min / 60;
  if (hr < 24) return hr.toFixed(1) + 'h';
  return (hr / 24).toFixed(1) + 'd';
}

export function fmtDate(d) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
