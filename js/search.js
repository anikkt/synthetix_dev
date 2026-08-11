function onGlobalSearch() {
  const q = document.getElementById('globalSearchInput').value.trim().toLowerCase();
  const resultsEl = document.getElementById('globalSearchResults');
  if (!q) { resultsEl.classList.remove('open'); resultsEl.innerHTML = ''; return; }

  const dashHits = State.dashboards.filter(d => d.name.toLowerCase().includes(q))
    .map(d => ({ label: d.name, kind: 'Dashboard', fn: `closeGlobalSearch();openDashboard(${d.id})` }));
  const pfHits = State.processFlows.filter(p => p.name.toLowerCase().includes(q))
    .map(p => ({ label: p.name, kind: 'Process flow', fn: `closeGlobalSearch();openProcessFlow(${p.id})` }));
  const hits = [...dashHits, ...pfHits].slice(0, 10);

  if (!hits.length) {
    resultsEl.innerHTML = '<div class="search-result-item" style="cursor:default;">No matches</div>';
  } else {
    resultsEl.innerHTML = hits.map(h =>
      `<div class="search-result-item" onclick="${h.fn}">${h.label}<span class="kind">${h.kind}</span></div>`
    ).join('');
  }
  resultsEl.classList.add('open');
}

function closeGlobalSearch() {
  document.getElementById('globalSearchResults').classList.remove('open');
  document.getElementById('globalSearchInput').value = '';
}

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === '/') {
    e.preventDefault();
    document.getElementById('globalSearchInput').focus();
  }
  if (e.key === 'Escape') closeGlobalSearch();
});

document.addEventListener('click', (e) => {
  const wrap = document.getElementById('globalSearchWrap');
  if (wrap && !wrap.contains(e.target)) closeGlobalSearch();
});
