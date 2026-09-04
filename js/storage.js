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
   Tables, process flows, and theme still live in one per-user blob
   (simple, fine since they're never shared). Dashboards are now
   individual documents in a top-level collection — required for
   sharing to actually be enforceable by security rules; see
   dashboard.js for the CRUD around them.

   IMPORTANT CAVEAT: sharing a dashboard shares its widget *config*
   (chart type, table name, axis settings, etc.) — it does NOT share
   the underlying table data, which still lives in the owner's own
   per-user blob. A recipient will see "table not found" unless they
   separately have a table of that exact name. Sharing the underlying
   data warehouse itself is a bigger feature this doesn't attempt.
   ============================================================ */
async function saveStateToStorage() {
  if (!currentUser) return;
  try {
    await db.collection('users').doc(currentUser.uid).collection('appState').doc('main').set({
      tables: State.tables,
      processFlows: State.processFlows,
      theme: State.theme,
      updatedAt: new Date().toISOString()
    });
    await Promise.all(State.dashboards.filter(d => d.ownerUid === currentUser.uid || sharedRoleFor(d) === 'analyst').map(d => upsertDashboardDoc(d)));
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
    const saved = snap.exists ? snap.data() : {};
    State.tables = saved.tables || {};
    State.processFlows = saved.processFlows || [];
    State.theme = saved.theme || 'dark';

    const [ownedSnap, sharedSnap] = await Promise.all([
      db.collection('dashboards').where('ownerUid', '==', currentUser.uid).get(),
      db.collection('dashboards').where('sharedUids', 'array-contains', currentUser.uid).get()
    ]);
    const fromDoc = (docSnap) => {
      const data = docSnap.data();
      const sheets = (data.sheets && data.sheets.length) ? data.sheets : [{ id: 1, name: 'Sheet 1', widgets: [] }];
      return {
        firestoreId: docSnap.id,
        name: data.name, creator: data.ownerName, created: data.created,
        lastEditor: data.lastEditor, edited: data.edited,
        ownerUid: data.ownerUid, sharedWith: data.sharedWith || {},
        sheets, currentSheetId: sheets[0].id
      };
    };
    const owned = ownedSnap.docs.map(fromDoc);
    const shared = sharedSnap.docs.map(fromDoc).filter(d => d.ownerUid !== currentUser.uid);
    State.dashboards = [...owned, ...shared];
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

/* ---- Dashboard document CRUD (top-level `dashboards` collection) ---- */
async function upsertDashboardDoc(d) {
  const payload = {
    name: d.name, ownerUid: d.ownerUid, ownerName: d.creator,
    sharedWith: d.sharedWith || {}, sharedUids: Object.keys(d.sharedWith || {}),
    sheets: d.sheets, created: d.created, edited: d.edited, lastEditor: d.lastEditor
  };
  if (d.firestoreId) {
    await db.collection('dashboards').doc(d.firestoreId).set(payload, { merge: true });
  } else {
    const ref = await db.collection('dashboards').add(payload);
    d.firestoreId = ref.id;
  }
}

/* ---- User directory (for the Share picker and Admin Users page) ---- */
async function loadUserDirectory() {
  const snap = await db.collection('users').get();
  State.userDirectory = {};
  snap.docs.forEach(doc => {
    State.userDirectory[doc.id] = { uid: doc.id, ...doc.data() };
  });
  return State.userDirectory;
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

