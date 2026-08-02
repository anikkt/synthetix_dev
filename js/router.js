
import { refreshExistingDataTable } from './dataHub.js';
import { refreshDashboardListTable, renderWidgets } from './dashboard.js';
import { refreshProcessFlowListTable, renderProcessFlow, pfPopulateTables } from './processMap.js';

export function showView(viewId) {
  document.querySelectorAll('.view-panel').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  const target = document.getElementById('view-' + viewId);
  if (target) {
    target.classList.add('active');
  }

  const activeNav = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  if (activeNav) {
    activeNav.classList.add('active');
  }

  // Trigger view refresh callbacks
  if (viewId === 'existingdata') refreshExistingDataTable();
  if (viewId === 'dashboards') refreshDashboardListTable();
  if (viewId === 'dashboarddetail') renderWidgets();
  if (viewId === 'processflowdata') pfPopulateTables();
  if (viewId === 'processflow') refreshProcessFlowListTable();
  if (viewId === 'processflowdetail') renderProcessFlow();
}
