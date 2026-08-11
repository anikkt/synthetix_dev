function createDashboard() {
  const now = new Date();
  const dash = {
    id: (State.dashboards.length ? Math.max(...State.dashboards.map(d => d.id)) : 0) + 1,
    name: 'Untitled dashboard',
    creator: document.getElementById('profName').value || 'You',
    created: fmtDate(now),
    lastEditor: document.getElementById('profName').value || 'You',
    edited: fmtDate(now),
    widgets: []
  };
  State.dashboards.push(dash);
  saveStateToStorage();
  openDashboard(dash.id);
}


function refreshDashboardListTable() {
  const tbody = document.querySelector('#dashboardListTable tbody');
  tbody.innerHTML = '';
  State.dashboards.slice().reverse().forEach(d => {
    const tr = document.createElement('tr');
    tr.className = 'clickable';
    tr.innerHTML = `<td>${d.name}</td><td>${d.id}</td><td>${d.creator}</td><td>${d.created}</td>
      <td>${d.lastEditor}</td><td>${d.edited}</td>
      <td><button class="secondary" onclick="event.stopPropagation();deleteDashboard(${d.id})">Delete</button></td>`;
    tr.onclick = () => openDashboard(d.id);
    tbody.appendChild(tr);
  });
  if (!State.dashboards.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="subtitle">No dashboards yet — click "Add new".</td></tr>';
  }
}


function deleteDashboard(id) {
  confirmAction('Delete this dashboard? This cannot be undone.', () => {
    State.dashboards = State.dashboards.filter(d => d.id !== id);
    refreshDashboardListTable();
    saveStateToStorage();
  });
}


function openDashboard(id) {
  State.currentDashboardId = id;
  const d = State.dashboards.find(x => x.id === id);
  document.getElementById('dashTitleInput').value = d.name;
  resetHistory();
  dashEditMode = true;
  document.getElementById('dashEditToggle').checked = true;
  showView('dashboarddetail');
}


function renameDashboard(name) {
  const d = State.dashboards.find(x => x.id === State.currentDashboardId);
  if (!d) return;
  d.name = name || 'Untitled dashboard';
  d.edited = fmtDate(new Date());
  d.lastEditor = document.getElementById('profName').value || 'You';
  saveStateToStorage();
}


function currentDashboard() {
  return State.dashboards.find(d => d.id === State.currentDashboardId);
}

/* ============================================================
   COMPONENT PICKER (Add widget → catalog like image 1)
   ============================================================ */

function resetHistory() { undoStack = []; redoStack = []; }

function snapshotWidgets() {
  const d = currentDashboard();
  if (!d) return;
  undoStack.push(JSON.stringify(d.widgets));
  if (undoStack.length > 40) undoStack.shift();
  redoStack = [];
}

function undoWidgets() {
  const d = currentDashboard();
  if (!d || !undoStack.length) return;
  redoStack.push(JSON.stringify(d.widgets));
  d.widgets = JSON.parse(undoStack.pop());
  renderWidgets();
  saveStateToStorage();
}

function redoWidgets() {
  const d = currentDashboard();
  if (!d || !redoStack.length) return;
  undoStack.push(JSON.stringify(d.widgets));
  d.widgets = JSON.parse(redoStack.pop());
  renderWidgets();
  saveStateToStorage();
}


function refreshCharts() { renderWidgets(); }


function snapVal(v) { return Math.round(v / PF_SNAP) * PF_SNAP; }


function toggleDashEditMode() {
  dashEditMode = document.getElementById('dashEditToggle').checked;
  document.getElementById('btnAddWidget').style.display = dashEditMode ? '' : 'none';
  document.getElementById('btnUndo').style.display = dashEditMode ? '' : 'none';
  document.getElementById('btnRedo').style.display = dashEditMode ? '' : 'none';
  renderWidgets();
}


function renderWidgets() {
  const d = currentDashboard();
  const grid = document.getElementById('widgetGrid');
  grid.classList.toggle('edit-grid', dashEditMode);
  grid.innerHTML = '';
  if (!d) return;
  d.widgets.forEach(w => {
    if (!w.layout) newWidgetLayout(w, { widgets: d.widgets.filter(x => x !== w) });
    const div = document.createElement('div');
    div.className = 'widget';
    div.style.left = w.layout.x + 'px';
    div.style.top = w.layout.y + 'px';
    div.style.width = w.layout.w + 'px';
    div.style.height = w.layout.h + 'px';

    let bodyHTML;
    if (w.kind === 'chart' && (w.chartType === 'olaptable' || w.chartType === 'pivottable')) {
      bodyHTML = `<div id="body-${w.id}" class="table-scroll" style="height:calc(100% - 30px);"></div>`;
    } else if (w.kind === 'chart') {
      bodyHTML = `<div class="chart-scroll" style="height:calc(100% - 30px);"><canvas id="body-${w.id}"></canvas></div>`;
    } else if (w.kind === 'kpi' && w.kpiType === 'number') {
      bodyHTML = `<div id="body-${w.id}" style="height:calc(100% - 30px);display:flex;flex-direction:column;align-items:center;justify-content:center;"></div>`;
    } else if (w.kind === 'kpi') {
      bodyHTML = `<canvas id="body-${w.id}" style="width:100%;height:calc(100% - 30px);"></canvas>`;
    } else {
      bodyHTML = `<div id="body-${w.id}" style="padding:6px 0;"></div>`;
    }
    div.innerHTML = `<div class="widget-head" ${dashEditMode ? 'data-drag-handle style="cursor:move;"' : 'style="cursor:default;"'}><b>${w.title}</b>
      ${dashEditMode ? `<div class="whead-actions">
        <button onclick="editWidget(${w.id})" title="Edit widget">&#9998;</button>
        <button onclick="removeWidget(${w.id})" title="Remove widget">&times;</button>
      </div>` : ''}</div>${bodyHTML}${dashEditMode ? '<div class="resize-handle" title="Drag to resize"></div>' : ''}`;
    grid.appendChild(div);
    renderWidgetBody(w);
    if (dashEditMode) attachDragResize(div, w);
  });
}


function attachDragResize(div, w) {
  const head = div.querySelector('[data-drag-handle]');
  head.addEventListener('mousedown', (e) => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    let moved = false;
    const startX = e.clientX, startY = e.clientY;
    const origX = w.layout.x, origY = w.layout.y;
    function onMove(ev) {
      if (!moved) { snapshotWidgets(); moved = true; }
      w.layout.x = snapVal(Math.max(0, origX + (ev.clientX - startX)));
      w.layout.y = snapVal(Math.max(0, origY + (ev.clientY - startY)));
      div.style.left = w.layout.x + 'px';
      div.style.top = w.layout.y + 'px';
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (moved) saveStateToStorage();
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  const handle = div.querySelector('.resize-handle');
  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    let moved = false;
    const startX = e.clientX, startY = e.clientY;
    const origW = w.layout.w, origH = w.layout.h;
    function onMove(ev) {
      if (!moved) { snapshotWidgets(); moved = true; }
      w.layout.w = snapVal(Math.max(240, origW + (ev.clientX - startX)));
      w.layout.h = snapVal(Math.max(160, origH + (ev.clientY - startY)));
      div.style.width = w.layout.w + 'px';
      div.style.height = w.layout.h + 'px';
      renderWidgetBody(w);
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (moved) { renderWidgetBody(w); saveStateToStorage(); }
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

