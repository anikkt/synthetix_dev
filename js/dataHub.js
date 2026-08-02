import { State } from './state.js';
import { saveStateToStorage } from './storage.js';

export function refreshExistingDataTable() {
  const tbody = document.querySelector('#existingDataTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  Object.keys(State.tables).forEach(name => {
    const t = State.tables[name];
    const tr = document.createElement('tr');
    tr.className = 'clickable';
    tr.innerHTML = `<td>${name}</td><td>${t.rows.length}</td><td>${t.columns.length}</td>
      <td><button class="secondary" onclick="event.stopPropagation(); window.deleteWarehouseTable('${name}')">Delete</button></td>`;
    tr.onclick = () => previewTable(name);
    tbody.appendChild(tr);
  });
}

export function previewTable(name) {
  const t = State.tables[name];
  if (!t) return;
  const html = renderTableHTML(t.columns, t.rows.slice(0, 50));
  const p1 = document.getElementById('previewArea');
  const p2 = document.getElementById('previewArea2');
  if (p1) p1.innerHTML = html;
  if (p2) p2.innerHTML = html;
}

export function renderTableHTML(columns, rows) {
  let html = '<table class="datatable"><thead><tr>' + columns.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
  rows.forEach(r => {
    html += '<tr>' + columns.map(c => `<td>${r[c] ?? ''}</td>`).join('') + '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

window.deleteWarehouseTable = function(name) {
  delete State.tables[name];
  refreshExistingDataTable();
  saveStateToStorage();
};

