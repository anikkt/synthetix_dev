function confirmAction(message, callback) {
  document.getElementById('confirmModalMsg').textContent = message;
  _confirmCallback = callback;
  document.getElementById('confirmModal').style.display = 'flex';
}

function closeConfirmModal(result) {
  document.getElementById('confirmModal').style.display = 'none';
  if (result && _confirmCallback) _confirmCallback();
  _confirmCallback = null;
}

/* ---- SharePoint / OneDrive (best-effort — real extraction, subject to CORS) ---- */
