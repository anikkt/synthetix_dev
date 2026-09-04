document.getElementById('fileInput').addEventListener('change', async (e) => {
  const msg = document.getElementById('uploadMsg');
  msg.textContent = '';
  for (const file of e.target.files) {
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'csv' || ext === 'tsv') {
        const text = await file.text();
        const delim = ext === 'tsv' ? '\t' : ',';
        const { columns, rows } = parseDelimited(text, delim);
        const name = sanitizeTableName(file.name);
        State.tables[name] = { columns, rows };
      } else if (ext === 'xlsx') {
        // HOOK: call your existing xlsx-to-rows function from universal-converter.html here.
        msg.textContent = 'XLSX upload: wire up the parser from universal-converter.html here.';
        continue;
      } else {
        msg.textContent = `Unsupported file type: ${file.name}`;
        continue;
      }
    } catch (err) {
      msg.textContent = `Failed to load ${file.name}: ${err.message}`;
    }
  }
  refreshTableList();
  saveStateToStorage();
});


function refreshTableList() {
  const el = document.getElementById('tableList');
  el.innerHTML = '';
  Object.keys(State.tables).forEach(name => {
    const t = State.tables[name];
    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.style.cursor = 'pointer';
    pill.innerHTML = `${name} (${t.rows.length} rows) <span class="pill-remove" title="Remove this table">&times;</span>`;
    pill.onclick = (e) => {
      if (e.target.classList.contains('pill-remove')) {
        e.stopPropagation();
        deleteTable(name);
        return;
      }
      showView('existingdata');
      previewTable(name);
    };
    el.appendChild(pill);
  });
}


function refreshExistingDataTable() {
  const tbody = document.querySelector('#existingDataTable tbody');
  tbody.innerHTML = '';
  Object.keys(State.tables).forEach(name => {
    const t = State.tables[name];
    const tr = document.createElement('tr');
    tr.className = 'clickable';
    tr.innerHTML = `<td>${name}</td><td>${t.rows.length}</td><td>${t.columns.length}</td>
      <td><button class="secondary" onclick="event.stopPropagation();deleteTable('${name}')">Delete</button></td>`;
    tr.onclick = () => previewTable(name);
    tbody.appendChild(tr);
  });
}


function deleteTable(name) {
  delete State.tables[name];
  refreshExistingDataTable();
  refreshTableList();
  saveStateToStorage();
}


function previewTable(name) {
  const t = State.tables[name];
  const html = renderTableHTML(t.columns, t.rows.slice(0, 50));
  const p1 = document.getElementById('previewArea');
  const p2 = document.getElementById('previewArea2');
  if (p1) p1.innerHTML = html;
  if (p2) p2.innerHTML = html;
}


function populateMergeSelects() {
  const opts = Object.keys(State.tables).map(t => `<option value="${t}">${t}</option>`).join('');
  document.getElementById('mergeA').innerHTML = opts;
  document.getElementById('mergeB').innerHTML = opts;
}

function populateWriteBackSelect() {
  const el = document.getElementById('wbf-table');
  if (el) el.innerHTML = '<option value="">Select table</option>' + tableOptionsHTML();
}

/* ============================================================
   WRITE BACK — save a warehouse table to a real CSV file in the
   connected local folder (create new, or overwrite an existing one).
   ============================================================ */

function tableToCSV(table) {
  const escCsv = (v) => {
    const s = (v === undefined || v === null) ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [table.columns.map(escCsv).join(',')];
  table.rows.forEach(r => lines.push(table.columns.map(c => escCsv(r[c])).join(',')));
  return lines.join('\r\n');
}


async function writeBackToFolder() {
  const msg = document.getElementById('writeBackMsg');
  msg.textContent = '';
  const tableName = document.getElementById('wbf-table').value;
  if (!tableName) { msg.textContent = 'Select a table first.'; return; }
  let filename = document.getElementById('wbf-filename').value.trim() || tableName;
  if (!/\.csv$/i.test(filename)) filename += '.csv';

  if (!connectedDirHandle) {
    msg.textContent = 'Connect a local folder first (Data > New source > Local folder tile).';
    return;
  }
  try {
    let perm = await connectedDirHandle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') perm = await connectedDirHandle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') { msg.textContent = 'Write permission was not granted.'; return; }

    const fileHandle = await connectedDirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(tableToCSV(State.tables[tableName]));
    await writable.close();
    msg.textContent = `Saved ${filename} to the connected folder.`;
    listFolderFiles();
  } catch (e) {
    msg.textContent = `Write failed: ${e.message}`;
  }
}

/* ============================================================
   PROCESS FLOW — build a directly-follows graph (process map)
   from Case ID / Activity / Timestamp columns, like Apromore/Celonis.
   ============================================================ */
/* ---- Process Flow list (like Dashboards) ---- */
