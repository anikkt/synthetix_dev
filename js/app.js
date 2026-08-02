
import { State } from './state.js';
import { loadStateFromStorage, saveStateToStorage } from './storage.js';
import { applyTheme, setTheme } from './themeManager.js';
import { showView } from './router.js';
import { initCommandPalette } from './commandPalette.js';
import { importCSVFile } from './csvImporter.js';
import { importXLSXFile } from './xlsxImporter.js';
import { importXESFile } from './xesImporter.js';
import { executeSQL } from './sqlEditor.js';
import { refreshExistingDataTable, previewTable } from './dataHub.js';
import { refreshDashboardListTable, openDashboard } from './dashboard.js';
import { refreshProcessFlowListTable, openProcessFlow, renderProcessFlow } from './processMap.js';
import { initAIAssistant } from './aiAssistant.js';

window.showView = showView;

document.addEventListener('DOMContentLoaded', async () => {
  await loadStateFromStorage();
  applyTheme();
  initCommandPalette();
  initAIAssistant();

  // Navigation handlers
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      showView(btn.dataset.view);
    });
  });

  // File upload input handler
  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      for (const file of e.target.files) {
        const ext = file.name.split('.').pop().toLowerCase();
        try {
          if (ext === 'csv' || ext === 'tsv') await importCSVFile(file);
          else if (ext === 'xlsx') await importXLSXFile(file);
          else if (ext === 'xes') await importXESFile(file);
        } catch (err) {
          alert(`Failed to parse ${file.name}: ${err.message}`);
        }
      }
      refreshExistingDataTable();
    });
  }

  // Theme toggle listener
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.checked = State.theme === 'light';
    themeToggle.addEventListener('change', (e) => {
      setTheme(e.target.checked ? 'light' : 'dark');
    });
  }

  // SQL Execution handler
  const runSqlBtn = document.getElementById('runSqlBtn');
  if (runSqlBtn) {
    runSqlBtn.addEventListener('click', () => {
      const sql = document.getElementById('sqlInput').value;
      const saveAs = document.getElementById('saveAsName').value.trim();
      try {
        const res = executeSQL(sql);
        if (saveAs) {
          State.tables[saveAs] = res;
          saveStateToStorage();
          refreshExistingDataTable();
        }
        document.getElementById('previewArea').innerHTML = renderTableHTML(res.columns, res.rows.slice(0, 50));
      } catch (err) {
        document.getElementById('sqlErr').textContent = err.message;
      }
    });
  }

  // Initial routing
  showView('newsource');
});
