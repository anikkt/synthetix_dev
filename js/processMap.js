function createProcessFlow() {
  const now = new Date();
  const who = document.getElementById('profName') ? (document.getElementById('profName').value || 'You') : 'You';
  const pf = {
    id: (State.processFlows.length ? Math.max(...State.processFlows.map(p => p.id)) : 0) + 1,
    name: 'Untitled process flow', creator: who, created: fmtDate(now), lastEditor: who, edited: fmtDate(now),
    config: null
  };
  State.processFlows.push(pf);
  saveStateToStorage();
  openProcessFlowConfig(pf.id);
}

function refreshProcessFlowListTable() {
  const tbody = document.querySelector('#processFlowListTable tbody');
  tbody.innerHTML = '';
  State.processFlows.slice().reverse().forEach(p => {
    const tr = document.createElement('tr');
    tr.className = 'clickable';
    tr.innerHTML = `<td>${p.name}</td><td>${p.id}</td><td>${p.creator}</td><td>${p.created}</td>
      <td>${p.lastEditor}</td><td>${p.edited}</td>
      <td><button class="secondary" onclick="event.stopPropagation();deleteProcessFlow(${p.id})">Delete</button></td>`;
    tr.onclick = () => openProcessFlow(p.id);
    tbody.appendChild(tr);
  });
  if (!State.processFlows.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="subtitle">No process flows yet — click "Add new".</td></tr>';
  }
}

function deleteProcessFlow(id) {
  confirmAction('Delete this process flow? This cannot be undone.', () => {
    State.processFlows = State.processFlows.filter(p => p.id !== id);
    refreshProcessFlowListTable();
    saveStateToStorage();
  });
}

function currentProcessFlow() {
  return State.processFlows.find(p => p.id === State.currentProcessFlowId);
}

function openProcessFlow(id) {
  const pf = State.processFlows.find(p => p.id === id);
  if (!pf) return;
  State.currentProcessFlowId = id;
  pfManualPositions = {};
  pfZoom = 1;
  if (!pf.config) { openProcessFlowConfig(id); return; }
  document.getElementById('pfTitleInput').value = pf.name;
  showView('processflowdetail');
}

function openProcessFlowConfig(id) {
  State.currentProcessFlowId = id;
  showView('processflowdata');
}

function pfBackFromConfig() {
  const pf = currentProcessFlow();
  showView(pf && pf.config ? 'processflowdetail' : 'processflow');
}

function renameProcessFlow(name) {
  const pf = currentProcessFlow();
  if (!pf) return;
  pf.name = name || 'Untitled process flow';
  pf.edited = fmtDate(new Date());
  pf.lastEditor = document.getElementById('profName').value || 'You';
  saveStateToStorage();
}


function pfPopulateTables() {
  const pf = currentProcessFlow();
  const sel = document.getElementById('pf-table');
  sel.innerHTML = '<option value="">Select table</option>' + tableOptionsHTML(pf && pf.config && pf.config.table);
  if (pf && pf.config && pf.config.table) {
    pfPopulateColumns();
    document.getElementById('pf-case').value = pf.config.caseCol || '';
    document.getElementById('pf-activity').value = pf.config.activityCol || '';
    document.getElementById('pf-time').value = pf.config.timeCol || '';
  }
}

function pfPopulateColumns() {
  const table = State.tables[document.getElementById('pf-table').value];
  const opts = table ? table.columns.map(c => `<option value="${c}">${c}</option>`).join('') : '';
  ['pf-case', 'pf-activity', 'pf-time'].forEach(id => document.getElementById(id).innerHTML = opts);
}

function buildProcessFlow() {
  const msg = document.getElementById('pfConfigMsg');
  msg.textContent = '';
  const pf = currentProcessFlow();
  if (!pf) { msg.textContent = 'No process flow selected — go back and click "Add new".'; return; }
  const table = document.getElementById('pf-table').value;
  const caseCol = document.getElementById('pf-case').value;
  const activityCol = document.getElementById('pf-activity').value;
  const timeCol = document.getElementById('pf-time').value;
  if (!table || !caseCol || !activityCol || !timeCol) {
    msg.textContent = 'Select a table and all three columns first.';
    return;
  }
  pf.config = { table, caseCol, activityCol, timeCol };
  pf.edited = fmtDate(new Date());
  pf.lastEditor = document.getElementById('profName').value || 'You';
  saveStateToStorage();
  document.getElementById('pfTitleInput').value = pf.name;
  msg.textContent = 'Process flow configured. Opening diagram…';
  showView('processflowdetail');
}


function buildCases(table, caseCol, actCol, timeCol) {
  const byCase = {};
  table.rows.forEach(r => {
    const cid = r[caseCol];
    if (cid === '' || cid === undefined || cid === null) return;
    (byCase[cid] = byCase[cid] || []).push({ act: String(r[actCol]), ts: parseTS(r[timeCol]) });
  });
  Object.values(byCase).forEach(events => events.sort((a, b) => (isNaN(a.ts) ? 0 : a.ts) - (isNaN(b.ts) ? 0 : b.ts)));
  return byCase;
}

/* A "variant" is a case's exact end-to-end activity sequence. Real happy-path filtering
   works on variants, not individual edges — that's what keeps whole real cases together
   instead of stitching together a path nobody actually walked. */

function computeVariants(byCase) {
  const variantMap = {};
  Object.entries(byCase).forEach(([cid, events]) => {
    const sig = events.map(e => e.act).join('\u2192');
    (variantMap[sig] = variantMap[sig] || { count: 0, caseIds: [] });
    variantMap[sig].count++;
    variantMap[sig].caseIds.push(cid);
  });
  return variantMap;
}

/* Cumulative-frequency selection over variants: at pathPct=100 every case is kept;
   lower it and only the most common variants (by case coverage) remain — at the low
   end this converges to just the single most-walked variant, i.e. the happy path. */

function selectCasesByVariantCoverage(byCase, variantMap, pathPct) {
  const variants = Object.values(variantMap).sort((a, b) => b.count - a.count);
  const totalCases = Object.keys(byCase).length || 1;
  const keptCaseIds = new Set();
  let cum = 0, keptVariantCount = 0;
  for (const v of variants) {
    v.caseIds.forEach(cid => keptCaseIds.add(cid));
    cum += v.count;
    keptVariantCount++;
    if ((cum / totalCases) * 100 >= pathPct) break;
  }
  return { keptCaseIds, keptVariantCount, totalVariantCount: variants.length };
}


function dfgFromCases(byCase, caseIdSet) {
  const nodeFreq = {}, edgeFreq = {}, startFreq = {}, endFreq = {}, selfLoopFreq = {}, edgeDurSum = {}, edgeDurCount = {};
  let caseCount = 0, eventCount = 0;
  Object.entries(byCase).forEach(([cid, events]) => {
    if (!caseIdSet.has(cid)) return;
    caseCount++;
    eventCount += events.length;
    events.forEach((e, i) => {
      nodeFreq[e.act] = (nodeFreq[e.act] || 0) + 1;
      if (i === 0) startFreq[e.act] = (startFreq[e.act] || 0) + 1;
      if (i === events.length - 1) endFreq[e.act] = (endFreq[e.act] || 0) + 1;
      if (i > 0) {
        const prev = events[i - 1];
        if (prev.act === e.act) {
          selfLoopFreq[e.act] = (selfLoopFreq[e.act] || 0) + 1;
        } else {
          const key = prev.act + '\u2192' + e.act;
          edgeFreq[key] = (edgeFreq[key] || 0) + 1;
          if (!isNaN(prev.ts) && !isNaN(e.ts)) {
            edgeDurSum[key] = (edgeDurSum[key] || 0) + (e.ts - prev.ts);
            edgeDurCount[key] = (edgeDurCount[key] || 0) + 1;
          }
        }
      }
    });
  });
  const nodes = Object.keys(nodeFreq).map(act => ({
    id: act, freq: nodeFreq[act], isStart: !!startFreq[act], isEnd: !!endFreq[act], repeats: selfLoopFreq[act] || 0
  }));
  const edges = Object.keys(edgeFreq).map(k => {
    const [from, to] = k.split('\u2192');
    const avgDurMs = edgeDurCount[k] ? edgeDurSum[k] / edgeDurCount[k] : null;
    return { from, to, freq: edgeFreq[k], avgDurMs };
  });
  return { nodes, edges, caseCount, eventCount };
}

/* Activities slider: cumulative-frequency trim of node volume within whatever cases are currently in scope. */

function filterActivities(dfg, activityPct) {
  const nodesSorted = [...dfg.nodes].sort((a, b) => b.freq - a.freq);
  const totalNodeFreq = nodesSorted.reduce((s, n) => s + n.freq, 0) || 1;
  const keepNodes = new Set();
  let cum = 0;
  for (const n of nodesSorted) {
    keepNodes.add(n.id);
    cum += n.freq;
    if ((cum / totalNodeFreq) * 100 >= activityPct) break;
  }
  return {
    nodes: dfg.nodes.filter(n => keepNodes.has(n.id)),
    edges: dfg.edges.filter(e => keepNodes.has(e.from) && keepNodes.has(e.to)),
    caseCount: dfg.caseCount, eventCount: dfg.eventCount
  };
}

/* DFS classification of back-edges (true cycles), so the longest-path layering below only
   relaxes over the DAG part of the graph — this is what actually guarantees convergence
   and a clean left-to-right layout instead of nodes collapsing under the first activity. */

function classifyBackEdges(dfg) {
  const adj = {};
  dfg.edges.forEach(e => { (adj[e.from] = adj[e.from] || []).push(e); });
  const state = {};
  const backKeys = new Set();
  function dfs(u) {
    state[u] = 1;
    (adj[u] || []).forEach(e => {
      const key = e.from + '\u2192' + e.to;
      if (state[e.to] === 1) backKeys.add(key);
      else if (state[e.to] !== 2) dfs(e.to);
    });
    state[u] = 2;
  }
  dfg.nodes.forEach(n => { if (!state[n.id]) dfs(n.id); });
  return backKeys;
}


function layoutDFG(dfg) {
  const backKeys = classifyBackEdges(dfg);
  const forwardEdges = dfg.edges.filter(e => !backKeys.has(e.from + '\u2192' + e.to));

  const incoming = {};
  forwardEdges.forEach(e => { incoming[e.to] = (incoming[e.to] || 0) + 1; });
  const level = {};
  const seeds = dfg.nodes.filter(n => n.isStart || !incoming[n.id]);
  const seedIds = seeds.length ? seeds.map(n => n.id) : (dfg.nodes.length ? [dfg.nodes[0].id] : []);
  seedIds.forEach(id => { if (level[id] === undefined) level[id] = 0; });

  let changed = true, guard = 0;
  const maxGuard = dfg.nodes.length + forwardEdges.length + 5;
  while (changed && guard < maxGuard) {
    changed = false; guard++;
    forwardEdges.forEach(e => {
      if (level[e.from] !== undefined) {
        const cand = level[e.from] + 1;
        if (level[e.to] === undefined || cand > level[e.to]) { level[e.to] = cand; changed = true; }
      }
    });
  }
  dfg.nodes.forEach(n => { if (level[n.id] === undefined) level[n.id] = 0; });

  const byLevel = {};
  dfg.nodes.forEach(n => { (byLevel[level[n.id]] = byLevel[level[n.id]] || []).push(n); });
  const boxW = 140, boxH = 50, colGap = 200, rowGap = 96, marginX = 40, marginY = 40;
  const positions = {};
  Object.keys(byLevel).sort((a, b) => a - b).forEach(lvl => {
    byLevel[lvl].forEach((n, i) => {
      positions[n.id] = { x: marginX + Number(lvl) * colGap, y: marginY + i * rowGap, level: Number(lvl) };
    });
  });
  const levels = Object.values(level);
  const maxLevel = levels.length ? Math.max(...levels) : 0;
  const maxRows = Math.max(...Object.values(byLevel).map(a => a.length), 1);
  return {
    positions, boxW, boxH, backKeys,
    width: marginX * 2 + maxLevel * colGap + boxW + 20, height: marginY * 2 + maxRows * rowGap + 40
  };
}


function applyManualPositions(layout) {
  Object.keys(pfManualPositions).forEach(id => {
    if (layout.positions[id]) Object.assign(layout.positions[id], pfManualPositions[id]);
  });
  let maxX = 0, maxY = 0;
  Object.values(layout.positions).forEach(p => {
    maxX = Math.max(maxX, p.x + layout.boxW);
    maxY = Math.max(maxY, p.y + layout.boxH);
  });
  layout.width = Math.max(layout.width, maxX + 60);
  layout.height = Math.max(layout.height, maxY + 80);
  return layout;
}

/* ---- Module state ---- */

function pfOnSliderChange() {
  document.getElementById('pfActivityPctLabel').textContent = document.getElementById('pfActivitySlider').value + '%';
  document.getElementById('pfPathPctLabel').textContent = document.getElementById('pfPathSlider').value + '%';
  drawProcessFlow();
}


function renderProcessFlow() {
  const container = document.getElementById('processFlowCanvas');
  const pf = currentProcessFlow();
  const cfg = pf && pf.config;
  if (!cfg || !cfg.table) {
    container.innerHTML = '<p class="subtitle">No data mapped yet. Click "Edit data mapping" above to set it up.</p>';
    document.getElementById('pfSummary').innerHTML = '';
    pfCases = null;
    return;
  }
  const table = State.tables[cfg.table];
  if (!table) {
    container.innerHTML = '<p class="err">Source table not found — it may have been deleted. Click "Edit data mapping" to reconfigure.</p>';
    document.getElementById('pfSummary').innerHTML = '';
    pfCases = null;
    return;
  }
  pfCases = buildCases(table, cfg.caseCol, cfg.activityCol, cfg.timeCol);
  pfVariants = computeVariants(pfCases);
  pfTotalCases = Object.keys(pfCases).length;
  pfManualPositions = {};
  drawProcessFlow();
}


function drawProcessFlow() {
  if (!pfCases) return;
  if (!pfTotalCases) {
    document.getElementById('processFlowCanvas').innerHTML = '<p class="subtitle">No events found — check that the selected columns actually contain case, activity, and timestamp data.</p>';
    return;
  }
  const activityPct = Number(document.getElementById('pfActivitySlider').value);
  const pathPct = Number(document.getElementById('pfPathSlider').value);
  const sel = selectCasesByVariantCoverage(pfCases, pfVariants, pathPct);
  const caseDFG = dfgFromCases(pfCases, sel.keptCaseIds);
  pfLastDFG = filterActivities(caseDFG, activityPct);
  renderSVG();

  document.getElementById('pfSummary').innerHTML =
    `<span class="pill">${sel.keptCaseIds.size}/${pfTotalCases} cases</span>` +
    `<span class="pill">${sel.keptVariantCount}/${sel.totalVariantCount} variants</span>` +
    `<span class="pill">${pfLastDFG.nodes.length}/${caseDFG.nodes.length} activities shown</span>` +
    `<span class="pill">${pfLastDFG.edges.length} paths</span>`;
}


function renderSVG() {
  const container = document.getElementById('processFlowCanvas');
  if (!pfLastDFG) return;
  if (!pfLastDFG.nodes.length) {
    container.innerHTML = '<p class="subtitle">No activities at this filter level — raise the sliders.</p>';
    return;
  }
  let layout = layoutDFG(pfLastDFG);
  layout = applyManualPositions(layout);
  pfLastLayout = layout;
  const maxEdgeFreq = Math.max(...pfLastDFG.edges.map(e => e.freq), 1);
  const svgW = layout.width * pfZoom, svgH = layout.height * pfZoom;

  let svg = `<svg width="${svgW}" height="${svgH}" viewBox="0 0 ${layout.width} ${layout.height}">
    <defs><marker id="pfArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M1 1L9 5L1 9" fill="none" stroke="#6b7280" stroke-width="1.6"/></marker></defs>`;

  pfLastDFG.edges.forEach(e => {
    const p1 = layout.positions[e.from], p2 = layout.positions[e.to];
    if (!p1 || !p2) return;
    const strokeW = 1 + (e.freq / maxEdgeFreq) * 5;
    const isBack = layout.backKeys.has(e.from + '\u2192' + e.to);
    const x1 = p1.x + layout.boxW, y1 = p1.y + layout.boxH / 2, x2 = p2.x, y2 = p2.y + layout.boxH / 2;
    let d, midX, midY;
    if (isBack) {
      midY = Math.max(p1.y, p2.y) + layout.boxH + 50;
      midX = (x1 + x2) / 2;
      d = `M ${x1} ${y1} C ${x1 + 30} ${midY}, ${x2 - 30} ${midY}, ${x2} ${y2}`;
    } else {
      midX = (x1 + x2) / 2;
      midY = (y1 + y2) / 2;
      d = `M ${x1} ${y1} C ${x1 + 40} ${y1}, ${x2 - 40} ${y2}, ${x2} ${y2}`;
    }
    const durText = formatDuration(e.avgDurMs);
    svg += `<path class="pf-edge" data-label="${e.from} \u2192 ${e.to}" data-value="${e.freq}" data-duration="${durText}" d="${d}" fill="none" stroke="${isBack ? '#e2554f' : '#4f8cff'}" stroke-width="${strokeW}" opacity="0.65" marker-end="url(#pfArrow)" style="cursor:pointer;"/>`;
    if (durText) {
      const tw = durText.length * 6 + 10;
      svg += `<rect x="${midX - tw / 2}" y="${midY - 9}" width="${tw}" height="16" rx="4" fill="rgba(13,15,20,0.75)"/>
        <text x="${midX}" y="${midY + 3}" text-anchor="middle" fill="#e6e8ee" font-size="10">${durText}</text>`;
    }
  });

  pfLastDFG.nodes.forEach(n => {
    const p = layout.positions[n.id];
    if (!p) return;
    const boxColor = n.isStart ? '#3fd6a0' : n.isEnd ? '#e2554f' : '#4f8cff';
    svg += `<g class="pf-node" data-label="${n.id}" data-value="${n.freq}" data-repeats="${n.repeats}" style="cursor:grab;">
      <rect x="${p.x}" y="${p.y}" width="${layout.boxW}" height="${layout.boxH}" rx="8" fill="#20242f" stroke="${boxColor}" stroke-width="2"/>
      <text x="${p.x + layout.boxW / 2}" y="${p.y + 15}" text-anchor="middle" fill="#e6e8ee" font-size="12" font-weight="600">${String(n.id).slice(0, 18)}</text>
      <text x="${p.x + layout.boxW / 2}" y="${p.y + 29}" text-anchor="middle" fill="#9aa0b0" font-size="10">${n.freq} occurrences</text>
      ${n.repeats > 0 ? `<text x="${p.x + layout.boxW / 2}" y="${p.y + 42}" text-anchor="middle" fill="#e2a13f" font-size="9">${n.repeats} back-to-back repeats</text>` : ''}
    </g>`;
  });

  svg += `</svg>`;
  container.innerHTML = svg;

  container.querySelectorAll('.pf-node').forEach(el => {
    const id = el.dataset.label;
    el.addEventListener('mousemove', (e) => {
      if (pfDragging) return;
      const rep = Number(el.dataset.repeats);
      showTooltipHTML(e.clientX, e.clientY,
        `<b>${el.dataset.label}</b>: ${el.dataset.value} occurrences${rep > 0 ? ` &middot; ${rep} back-to-back repeats` : ''}`);
    });
    el.addEventListener('mouseleave', hideChartTooltip);
    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      hideChartTooltip();
      const startX = e.clientX, startY = e.clientY;
      const base = pfLastLayout.positions[id];
      const origX = base.x, origY = base.y;
      pfDragging = true;
      function onMove(ev) {
        const dx = (ev.clientX - startX) / pfZoom;
        const dy = (ev.clientY - startY) / pfZoom;
        pfManualPositions[id] = { x: Math.max(0, origX + dx), y: Math.max(0, origY + dy) };
        renderSVG();
      }
      function onUp() {
        pfDragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
  container.querySelectorAll('.pf-edge').forEach(el => {
    el.addEventListener('mousemove', (e) => {
      if (pfDragging) return;
      const dur = el.dataset.duration;
      showTooltipHTML(e.clientX, e.clientY,
        `<b>${el.dataset.label}</b>: ${el.dataset.value} times${dur ? ` &middot; avg ${dur} between steps` : ''}`);
    });
    el.addEventListener('mouseleave', hideChartTooltip);
  });
}

function pfSetZoom(z) {
  pfZoom = Math.max(0.2, Math.min(3, z));
  document.getElementById('pfZoomLabel').textContent = Math.round(pfZoom * 100) + '%';
  const svg = document.querySelector('#processFlowCanvas svg');
  if (svg && pfLastLayout) {
    svg.setAttribute('width', pfLastLayout.width * pfZoom);
    svg.setAttribute('height', pfLastLayout.height * pfZoom);
  }
}

function pfZoomIn() { pfSetZoom(pfZoom * 1.25); }

function pfZoomOut() { pfSetZoom(pfZoom / 1.25); }

function pfZoomReset() { pfSetZoom(1); }

function pfZoomFit() {
  if (!pfLastLayout) return;
  const container = document.getElementById('processFlowCanvas');
  const availW = container.clientWidth || 800;
  pfSetZoom(Math.min(1, availW / pfLastLayout.width));
}

function pfResetLayout() {
  pfManualPositions = {};
  renderSVG();
}

/* ============================================================
   MINI SQL ENGINE — pure JS, no dependencies.
   SELECT cols FROM table [WHERE col OP value] [GROUP BY col]
   Aggregates: COUNT(*), COUNT(DISTINCT col), SUM(col), AVG(col), MIN(col), MAX(col)
   Works grouped or as a single ungrouped aggregate value.
   ============================================================ */
