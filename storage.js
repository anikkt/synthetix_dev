function showStorageBanner(message) {
  const el = document.getElementById('storageBanner');
  el.innerHTML = message;
  el.style.display = 'block';
}

function clearStorageBanner() {
  document.getElementById('storageBanner').style.display = 'none';
}


function setSaveStatus(text) {
  const el = document.getElementById('saveStatus');
  if (el) el.textContent = text;
}

/* ============================================================
   CLOUD STORAGE — Firestore, scoped to the signed-in user.
   Replaces the old IndexedDB-based appState (that's still used
   below, but only for the local folder handle, which is
   inherently per-device and can't live in Firestore anyway).
   ============================================================ */
async function saveStateToStorage() {
  if (!currentUser) return;
  try {
    await db.collection('users').doc(currentUser.uid).collection('appState').doc('main').set({
      tables: State.tables,
      dashboards: State.dashboards,
      processFlows: State.processFlows,
      theme: State.theme,
      updatedAt: new Date().toISOString()
    });
    const t = new Date();
    setSaveStatus('Saved ' + t.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' }));
    clearStorageBanner();
  } catch (e) {
    setSaveStatus('Cloud save failed — see banner');
    showStorageBanner(
      '<b>Cloud save just failed.</b> Your data in memory is still fine. ' +
      'Use <b>User Profile &gt; Export workspace (.json)</b> now as a backup. ' +
      '(Error: ' + (e && e.message ? e.message : 'unknown') + ')'
    );
    console.warn('Cloud save failed:', e);
  }
}

async function loadStateFromStorage() {
  if (!currentUser) return;
  try {
    const snap = await db.collection('users').doc(currentUser.uid).collection('appState').doc('main').get();
    if (!snap.exists) return;
    const saved = snap.data();
    State.tables = saved.tables || {};
    State.dashboards = saved.dashboards || [];
    State.processFlows = saved.processFlows || [];
    State.theme = saved.theme || 'dark';
  } catch (e) {
    setSaveStatus('Cloud load failed — see banner');
    showStorageBanner(
      '<b>Could not load your saved data from the cloud.</b> ' +
      '(Error: ' + (e && e.message ? e.message : 'unknown') + ') ' +
      'Check your internet connection and refresh.'
    );
    console.warn('Could not load saved state', e);
  }
}

/* ============================================================
   LOCAL FOLDER — File System Access API (Chrome/Edge only).
   Connect once; the directory handle is cached in IndexedDB so
   later visits only need a one-click "Reconnect", not a re-browse.
   This stays in IndexedDB on purpose: a folder handle is tied to
   this specific browser/device and can't be serialized to Firestore.
   ============================================================ */

const IDB_NAME = 'dvp-store', IDB_STORE = 'handles';

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const idb = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key) {
  const idb = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

