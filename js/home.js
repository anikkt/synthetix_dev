function refreshHomeView() {
  const nameEl = document.getElementById('profName');
  const name = (nameEl && nameEl.value) || (currentUser && currentUser.email) || 'there';
  document.getElementById('homeGreeting').textContent = `Welcome back, ${name}`;

  const dashWrap = document.getElementById('homeDashboards');
  const recentDash = State.dashboards.slice().reverse().slice(0, 6);
  dashWrap.innerHTML = recentDash.length ? recentDash.map(d => {
    const widgetCount = d.sheets.reduce((s, sh) => s + sh.widgets.length, 0);
    return `
    <div class="home-card" onclick="openDashboard('${d.firestoreId}')">
      <div class="home-card-kind">${d.ownerUid !== currentUser.uid ? 'Shared with you' : 'Dashboard'}</div>
      <b>${d.name}</b>
      <div class="home-card-meta">${widgetCount} widget${widgetCount === 1 ? '' : 's'} &middot; edited ${d.edited}</div>
    </div>`;
  }).join('') : '<div class="home-empty">No dashboards yet.</div>';

  const pfWrap = document.getElementById('homeProcessFlows');
  const recentPf = State.processFlows.slice().reverse().slice(0, 6);
  pfWrap.innerHTML = recentPf.length ? recentPf.map(p => `
    <div class="home-card" onclick="openProcessFlow(${p.id})">
      <div class="home-card-kind">Process flow</div>
      <b>${p.name}</b>
      <div class="home-card-meta">${p.config ? 'Configured' : 'Needs data mapping'} &middot; edited ${p.edited}</div>
    </div>`).join('') : '<div class="home-empty">No process flows yet.</div>';
}
