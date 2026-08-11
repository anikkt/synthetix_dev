function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

function toggleSection() {
  document.getElementById('nav-data').classList.toggle('open');
  document.getElementById('sub-data').classList.toggle('open');
}


function showView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.nav-subitem').forEach(n => n.classList.remove('active'));

  document.getElementById('view-' + view).classList.add('active');

  if (view === 'newsource' || view === 'existingdata') {
    document.getElementById('nav-data').classList.add('active');
    document.querySelector(`.nav-subitem[data-view="${view}"]`).classList.add('active');
  } else if (view === 'dashboards' || view === 'dashboarddetail') {
    document.querySelector('.nav-item[data-view="dashboards"]').classList.add('active');
  } else if (view === 'profile') {
    document.querySelector('.nav-item[data-view="profile"]').classList.add('active');
  } else if (view === 'processflow' || view === 'processflowdetail' || view === 'processflowdata') {
    document.querySelector('.nav-item[data-view="processflow"]').classList.add('active');
  }

  if (view === 'existingdata') refreshExistingDataTable();
  if (view === 'dashboards') refreshDashboardListTable();
  if (view === 'dashboarddetail') renderWidgets();
  if (view === 'processflowdata') pfPopulateTables();
  if (view === 'processflow') refreshProcessFlowListTable();
  if (view === 'processflowdetail') renderProcessFlow();
}

/* ---- Reusable confirm modal (used for dashboard/process-flow deletes) ---- */

function showSubtab(name) {
  document.querySelectorAll('.subtab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.subpanel').forEach(p => p.classList.remove('active'));
  document.querySelector(`.subtab[data-sub="${name}"]`).classList.add('active');
  document.getElementById('subpanel-' + name).classList.add('active');
  if (name === 'edmerge') populateMergeSelects();
  if (name === 'edwriteback') populateWriteBackSelect();
}

/* ============================================================
   FILE INGEST — CSV/TSV parsed from scratch.
   XLSX: plug in your existing parser from universal-converter.html
   at the marked hook below (it already handles zip+sheet XML).
   ============================================================ */
