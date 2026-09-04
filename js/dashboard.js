/* ============================================================
   DASHBOARDS — stored as individual Firestore documents (not the
   per-user blob) so they can actually be shared: Firestore security
   rules can grant access to a specific dashboard doc to a specific
   other user, which isn't possible when everything lives in one
   giant per-user blob. Tables (Data Warehouse) still live in that
   blob — see the note in storage.js about what that means for
   sharing a dashboard whose widgets point at your own tables.
   ============================================================ */

function currentSheet(d) {
  if (!d) return null;
  return d.sheets.find(s => s.id === d.currentSheetId) || d.sheets[0];
}

async function createDashboard() {
  const now = new Date();
  const who = document.getElementById('profName').value || 'You';
  const dash = {
    name: 'Untitled dashboard',
    creator: who,
    created: fmtDate(now),
    lastEditor: who,
    edited: fmtDate(now),
    ownerUid: currentUser.uid,
    sharedWith: {},
    sheets: [{ id: 1, name: 'Sheet 1', widgets: [] }],
    currentSheetId: 1
  };
  await upsertDashboardDoc(dash);
  State.dashboards.push(dash);
  openDashboard(dash.firestoreId);
}

function refreshDashboardListTable() {
  const grid = document.getElementById('dashboardCardGrid');
  const dashboards = State.dashboards.slice().reverse();
  if (!dashboards.length) {
    grid.innerHTML = '<p class="subtitle">No dashboards yet — click "Add new".</p>';
    return;
  }
  grid.innerHTML = dashboards.map(d => {
    const isShared = d.ownerUid !== currentUser.uid;
    const widgetCount = d.sheets.reduce((s, sh) => s + sh.widgets.length, 0);
    return `
    <div class="home-card" onclick="openDashboard('${d.firestoreId}')">
      <div class="between">
        <div class="home-card-kind">${isShared ? 'Shared with you' : 'Dashboard'}</div>
        <button class="secondary" style="padding:2px 8px;" onclick="event.stopPropagation();openDashboardCardMenu(event, '${d.firestoreId}')">&#8942;</button>
      </div>
      <b>${d.name}</b>
      <div class="home-card-meta">${d.sheets.length} sheet${d.sheets.length === 1 ? '' : 's'} &middot; ${widgetCount} widget${widgetCount === 1 ? '' : 's'} &middot; edited ${d.edited}</div>
    </div>`;
  }).join('');
}

function openDashboardCardMenu(event, firestoreId) {
  const d = State.dashboards.find(x => x.firestoreId === firestoreId);
  const isOwner = d && d.ownerUid === currentUser.uid;
  const items = [
    { label: 'Open', fn: `openDashboard('${firestoreId}')` },
  ];
  if (isOwner || currentUserRole === 'admin') {
    items.push({ label: 'Duplicate', fn: `duplicateDashboard('${firestoreId}')` });
    items.push({ label: 'Share…', fn: `openShareModal('${firestoreId}')` });
    items.push({ divider: true });
    items.push({ label: 'Delete', fn: `deleteDashboard('${firestoreId}')` });
  }
  showMiniMenu(event.currentTarget, items);
}

async function duplicateDashboard(firestoreId) {
  const src = State.dashboards.find(d => d.firestoreId === firestoreId);
  if (!src) return;
  const now = new Date();
  const who = document.getElementById('profName').value || 'You';
  const copy = {
    name: src.name + ' (copy)',
    creator: who, created: fmtDate(now), lastEditor: who, edited: fmtDate(now),
    ownerUid: currentUser.uid, sharedWith: {},
    sheets: JSON.parse(JSON.stringify(src.sheets)),
    currentSheetId: src.sheets[0].id
  };
  await upsertDashboardDoc(copy);
  State.dashboards.push(copy);
  refreshDashboardListTable();
}

function deleteDashboard(firestoreId) {
  confirmAction('Delete this dashboard? This cannot be undone.', async () => {
    await db.collection('dashboards').doc(firestoreId).delete();
    State.dashboards = State.dashboards.filter(d => d.firestoreId !== firestoreId);
    refreshDashboardListTable();
  });
}

function openDashboard(firestoreId) {
  State.currentDashboardId = firestoreId;
  const d = State.dashboards.find(x => x.firestoreId === firestoreId);
  if (!d) return;
  document.getElementById('dashTitleInput').value = d.name;
  const isOwner = d.ownerUid === currentUser.uid;
  document.getElementById('dashTitleInput').disabled = !isOwner;
  document.getElementById('dashReadonlyNote').style.display = isOwner ? 'none' : 'inline';
  resetHistory();
  dashEditMode = isOwner; // shared viewers/analysts open read-only by default; analysts can flip Edit on
  document.getElementById('dashEditToggle').checked = dashEditMode;
  document.getElementById('dashEditToggle').disabled = !isOwner && sharedRoleFor(d) !== 'analyst';
  renderSheetTabs();
  showView('dashboarddetail');
}

function sharedRoleFor(d) {
  return (d.sharedWith && d.sharedWith[currentUser.uid]) || null;
}

function renameDashboard(name) {
  const d = currentDashboard();
  if (!d) return;
  d.name = name || 'Untitled dashboard';
  d.edited = fmtDate(new Date());
  d.lastEditor = document.getElementById('profName').value || 'You';
  saveStateToStorage();
}

function currentDashboard() {
  return State.dashboards.find(d => d.firestoreId === State.currentDashboardId);
}

/* ---- Sheets ---- */
function renderSheetTabs() {
  const d = currentDashboard();
  if (!d) return;
  const wrap = document.getElementById('sheetTabs');
  wrap.innerHTML = d.sheets.map(s => `
    <div class="subtab ${s.id === d.currentSheetId ? 'active' : ''}" onclick="switchSheet(${s.id})">
      ${s.name}
    </div>`).join('') + `<div class="subtab" onclick="addSheet()" title="Add sheet">+</div>`;
}

function switchSheet(sheetId) {
  const d = currentDashboard();
  if (!d) return;
  d.currentSheetId = sheetId;
  renderSheetTabs();
  renderWidgets();
}

function addSheet() {
  const d = currentDashboard();
  if (!d) return;
  const id = (Math.max(...d.sheets.map(s => s.id)) || 0) + 1;
  d.sheets.push({ id, name: 'Sheet ' + id, widgets: [] });
  d.currentSheetId = id;
  renderSheetTabs();
  renderWidgets();
  saveStateToStorage();
}

function renameSheet(sheetId) {
  const d = currentDashboard();
  const sheet = d.sheets.find(s => s.id === sheetId);
  if (!sheet) return;
  const name = prompt('Sheet name', sheet.name);
  if (!name) return;
  sheet.name = name;
  renderSheetTabs();
  saveStateToStorage();
}

function deleteSheet(sheetId) {
  const d = currentDashboard();
  if (!d || d.sheets.length <= 1) { alert('A dashboard needs at least one sheet.'); return; }
  confirmAction('Delete this sheet and its widgets?', () => {
    d.sheets = d.sheets.filter(s => s.id !== sheetId);
    if (d.currentSheetId === sheetId) d.currentSheetId = d.sheets[0].id;
    renderSheetTabs();
    renderWidgets();
    saveStateToStorage();
  });
}

/* ---- Sharing ---- */
async function openShareModal(firestoreId) {
  State.shareTargetDashboardId = firestoreId;
  const d = State.dashboards.find(x => x.firestoreId === firestoreId);
  const listEl = document.getElementById('shareCurrentList');
  const entries = Object.entries(d.sharedWith || {});
  listEl.innerHTML = entries.length
    ? entries.map(([uid, role]) => `<div class="row" style="justify-content:space-between;">
        <span>${(State.userDirectory && State.userDirectory[uid] && State.userDirectory[uid].email) || uid}</span>
        <span class="row" style="gap:6px;">
          <span class="pill">${role}</span>
          <button class="secondary" style="padding:2px 8px;" onclick="unshareDashboard('${uid}')">Remove</button>
        </span>
      </div>`).join('')
    : '<p class="subtitle">Not shared with anyone yet.</p>';

  const sel = document.getElementById('shareUserSelect');
  if (!State.userDirectory) await loadUserDirectory();
  sel.innerHTML = '<option value="">Select a user</option>' +
    Object.values(State.userDirectory).filter(u => u.uid !== currentUser.uid)
      .map(u => `<option value="${u.uid}">${u.email}</option>`).join('');

  document.getElementById('shareModal').style.display = 'flex';
}
function closeShareModal() {
  document.getElementById('shareModal').style.display = 'none';
}
async function shareDashboard() {
  const uid = document.getElementById('shareUserSelect').value;
  const role = document.getElementById('shareRoleSelect').value;
  if (!uid) { alert('Pick a user first.'); return; }
  const d = State.dashboards.find(x => x.firestoreId === State.shareTargetDashboardId);
  d.sharedWith = d.sharedWith || {};
  d.sharedWith[uid] = role;
  await upsertDashboardDoc(d);
  openShareModal(d.firestoreId);
}
async function unshareDashboard(uid) {
  const d = State.dashboards.find(x => x.firestoreId === State.shareTargetDashboardId);
  delete d.sharedWith[uid];
  await upsertDashboardDoc(d);
  openShareModal(d.firestoreId);
}

/* ---- Undo / redo, edit mode, widget grid — all operate on the current sheet ---- */
function resetHistory() { undoStack = []; redoStack = []; }

function snapshotWidgets() {
  const sheet = currentSheet(currentDashboard());
  if (!sheet) return;
  undoStack.push(JSON.stringify(sheet.widgets));
  if (undoStack.length > 40) undoStack.shift();
  redoStack = [];
}

function undoWidgets() {
  const sheet = currentSheet(currentDashboard());
  if (!sheet || !undoStack.length) return;
  redoStack.push(JSON.stringify(sheet.widgets));
  sheet.widgets = JSON.parse(undoStack.pop());
  renderWidgets();
  saveStateToStorage();
}

function redoWidgets() {
  const sheet = currentSheet(currentDashboard());
  if (!sheet || !redoStack.length) return;
  undoStack.push(JSON.stringify(sheet.widgets));
  sheet.widgets = JSON.parse(redoStack.pop());
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
  const sheet = currentSheet(d);
  const grid = document.getElementById('widgetGrid');
  grid.classList.toggle('edit-grid', dashEditMode);
  grid.innerHTML = '';
  if (!sheet) return;
  sheet.widgets.forEach(w => {
    if (!w.layout) newWidgetLayout(w, { widgets: sheet.widgets.filter(x => x !== w) });
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
    } else if (w.kind === 'textbox') {
      bodyHTML = `<div id="body-${w.id}" class="widget-textbox" style="height:calc(100% - 30px);"></div>`;
    } else if (w.kind === 'image') {
      bodyHTML = `<div id="body-${w.id}" class="widget-image" style="height:calc(100% - 30px);"></div>`;
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
