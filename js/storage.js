
import { State } from './state.js';

const DB_NAME = 'ProcessIntelligenceDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveStateToStorage() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const dataToSave = {
      tables: State.tables,
      dashboards: State.dashboards,
      processFlows: State.processFlows,
      theme: State.theme
    };
    store.put(dataToSave, 'rootState');
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
    });
  } catch (e) {
    console.error('Storage write failed:', e);
    return false;
  }
}

export async function loadStateFromStorage() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get('rootState');
    return new Promise((resolve) => {
      req.onsuccess = () => {
        if (req.result) {
          State.tables = req.result.tables || {};
          State.dashboards = req.result.dashboards || [];
          State.processFlows = req.result.processFlows || [];
          State.theme = req.result.theme || 'dark';
        }
        resolve(true);
      };
      req.onerror = () => resolve(false);
    });
  } catch (e) {
    console.warn('Storage read failed:', e);
    return false;
  }
}
