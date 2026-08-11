async function initAppData() {
  await loadStateFromStorage();
  applyTheme();
  refreshTableList();
  refreshExistingDataTable();
  refreshDashboardListTable();
  refreshHomeView();
  tryReconnectFolder();
}
initAuthListener();

/* ============================================================
   WORKSPACE EXPORT / IMPORT (no backend persistence)
   ============================================================ */

function exportWorkspace() {
  const blob = new Blob([JSON.stringify(State, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'workspace.json';
  a.click();
}

document.getElementById('importInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  const imported = JSON.parse(text);
  State.tables = imported.tables || {};
  State.dashboards = imported.dashboards || [];
  State.processFlows = imported.processFlows || [];
  State.theme = imported.theme || State.theme;
  State.currentDashboardId = null;
  State.currentProcessFlowId = null;
  applyTheme();
  refreshTableList();
  refreshExistingDataTable();
  refreshDashboardListTable();
  refreshHomeView();
  saveStateToStorage();
});
