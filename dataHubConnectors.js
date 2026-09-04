function openSharePointModal() { document.getElementById('sharepointModal').style.display = 'flex'; }

function closeSharePointModal() {
  document.getElementById('sharepointModal').style.display = 'none';
  document.getElementById('spMsg').textContent = '';
}

async function extractFromSharePoint() {
  const msg = document.getElementById('spMsg');
  msg.textContent = '';
  const link = document.getElementById('spLink').value.trim();
  if (!link) { msg.textContent = 'Paste a shareable link first.'; return; }
  msg.textContent = 'Attempting to fetch…';
  try {
    const res = await fetch(link);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const delim = (text.includes('\t') && !text.includes(',')) ? '\t' : ',';
    const { columns, rows } = parseDelimited(text, delim);
    const fallbackName = link.split('/').pop().split('?')[0] || 'sharepoint_file';
    const name = sanitizeTableName(document.getElementById('spTableName').value || fallbackName);
    State.tables[name] = { columns, rows };
    refreshTableList();
    saveStateToStorage();
    closeSharePointModal();
  } catch (e) {
    msg.textContent = `Could not fetch this link directly (${e.message}). This is almost always a CORS or authentication restriction on SharePoint/OneDrive — a reliable version of this needs a server-side proxy or the Microsoft Graph API rather than a raw browser fetch.`;
  }
}

/* ---- Amazon S3 (placeholder — no real backend call from browser JS) ---- */

function openS3Modal() { document.getElementById('s3Modal').style.display = 'flex'; }

function closeS3Modal() {
  document.getElementById('s3Modal').style.display = 'none';
  document.getElementById('s3Msg').textContent = '';
}

function testS3Connection() {
  document.getElementById('s3Msg').textContent =
    'Placeholder — wire up a real S3 call here via a backend/proxy. S3 credentials should never be used directly from browser JS.';
}

