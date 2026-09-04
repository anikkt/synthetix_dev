async function connectFolder() {
  if (!window.showDirectoryPicker) {
    alert('Your browser does not support folder access (File System Access API). Use Chrome or Edge — this may also be disabled by IT policy on managed machines.');
    return;
  }
  try {
    connectedDirHandle = await window.showDirectoryPicker();
    await idbSet('lastFolder', connectedDirHandle);
    document.getElementById('folderReconnectMsg').textContent = '';
    await listFolderFiles();
  } catch (e) {
    // user cancelled the picker — no action needed
  }
}


async function listFolderFiles() {
  if (!connectedDirHandle) { alert('Connect a folder first using the Local folder tile above.'); return; }
  let perm = await connectedDirHandle.queryPermission({ mode: 'read' });
  if (perm !== 'granted') perm = await connectedDirHandle.requestPermission({ mode: 'read' });
  if (perm !== 'granted') { alert('Folder access was not granted.'); return; }

  const files = [];
  for await (const [name, entry] of connectedDirHandle.entries()) {
    if (entry.kind === 'file' && /\.(csv|tsv)$/i.test(name)) files.push(name);
  }
  renderFolderFileList(files);
}


function renderFolderFileList(files) {
  const el = document.getElementById('folderFileList');
  if (!files.length) { el.innerHTML = '<span class="subtitle">No CSV/TSV files found in this folder.</span>'; return; }
  el.innerHTML = files.map(f => `<button class="secondary" onclick="loadFileFromFolder('${f}')">${f}</button>`).join('');
}


async function loadFileFromFolder(name) {
  try {
    const fileHandle = await connectedDirHandle.getFileHandle(name);
    const file = await fileHandle.getFile();
    const ext = name.split('.').pop().toLowerCase();
    const text = await file.text();
    const { columns, rows } = parseDelimited(text, ext === 'tsv' ? '\t' : ',');
    State.tables[sanitizeTableName(name)] = { columns, rows };
    refreshTableList();
    saveStateToStorage();
  } catch (e) {
    alert(`Could not read ${name}: ${e.message}`);
  }
}


async function tryReconnectFolder() {
  try {
    const handle = await idbGet('lastFolder');
    if (!handle) return;
    connectedDirHandle = handle;
    document.getElementById('folderReconnectMsg').innerHTML =
      `Previously connected folder found. <button class="secondary" onclick="listFolderFiles()">Reconnect</button>`;
  } catch (e) { /* no cached handle */ }
}

/* ============================================================
   INIT
   ============================================================ */
