
import { executeSQL } from './sqlEditor.js';
import { formatNum } from './helpers.js';
import { State } from './state.js';
import { saveStateToStorage } from './storage.js';

let dashEditMode = true;

export function refreshDashboardListTable() {
  const tbody = document.querySelector('#dashboardListTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  State.dashboards.slice().reverse().forEach(d => {
    const tr = document.createElement('tr');
    tr.className = 'clickable';
    tr.innerHTML = `<td>${d.name}</td><td>${d.id}</td><td>${d.creator}</td><td>${d.created}</td>
      <td>${d.lastEditor}</td><td>${d.edited}</td>
      <td><button class="secondary" onclick="event.stopPropagation(); window.deleteDashboard(${d.id})">Delete</button></td>`;
    tr.onclick = () => openDashboard(d.id);
    tbody.appendChild(tr);
  });
}

export function openDashboard(id) {
  State.currentDashboardId = id;
  const d = State.dashboards.find(x => x.id === id);
  if (!d) return;
  document.getElementById('dashTitleInput').value = d.name;
  window.showView('dashboarddetail');
}

export function renderWidgets() {
  const d = State.dashboards.find(x => x.id === State.currentDashboardId);
  const grid = document.getElementById('widgetGrid');
  if (!grid || !d) return;
  grid.innerHTML = '';

  d.widgets.forEach(w => {
    const div = document.createElement('div');
    div.className = 'widget';
    div.style.left = (w.layout?.x || 0) + 'px';
    div.style.top = (w.layout?.y || 0) + 'px';
    div.style.width = (w.layout?.w || 320) + 'px';
    div.style.height = (w.layout?.h || 220) + 'px';

    div.innerHTML = `
      <div class="widget-head">
        <b>${w.title}</b>
        <div class="whead-actions">
          <button onclick="window.removeWidget(${w.id})">&times;</button>
        </div>
      </div>
      <div id="body-${w.id}" style="flex:1; overflow:hidden;"></div>
      <div class="resize-handle"></div>
    `;
    grid.appendChild(div);
    renderWidgetContent(w);
  });
}

function renderWidgetContent(w) {
  const el = document.getElementById('body-' + w.id);
  if (!el) return;
  if (w.kind === 'kpi') {
    const val = computeKPIValue(w);
    el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:36px;font-weight:700;color:var(--accent-secondary);">${formatNum(val)}</div>`;
  } else {
    el.innerHTML = `<div class="subtitle" style="padding:12px;">Visual Widget (${w.chartType || 'Chart'})</div>`;
  }
}

function computeKPIValue(w) {
  if (w.mode === 'sql') {
    try {
      const res = executeSQL(w.sql);
      return Object.values(res.rows[0] || {})[0];
    } catch (e) { return NaN; }
  }
  const table = State.tables[w.table];
  return table ? table.rows.length : 0;
}

window.deleteDashboard = function(id) {
  State.dashboards = State.dashboards.filter(d => d.id !== id);
  refreshDashboardListTable();
  saveStateToStorage();
};

window.removeWidget = function(widgetId) {
  const d = State.dashboards.find(x => x.id === State.currentDashboardId);
  if (!d) return;
  d.widgets = d.widgets.filter(w => w.id !== widgetId);
  renderWidgets();
  saveStateToStorage();
};
