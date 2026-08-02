
import { formatDuration, fmtDate } from './helpers.js';
import { State } from './state.js';
import { saveStateToStorage } from './storage.js';

let pfCases = null, pfVariants = null, pfTotalCases = 0;
let pfLastDFG = null, pfLastLayout = null;
let pfManualPositions = {};
let pfZoom = 1;
let pfDragging = false;

export function refreshProcessFlowListTable() {
  const tbody = document.querySelector('#processFlowListTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  State.processFlows.slice().reverse().forEach(p => {
    const tr = document.createElement('tr');
    tr.className = 'clickable';
    tr.innerHTML = `<td>${p.name}</td><td>${p.id}</td><td>${p.creator}</td><td>${p.created}</td>
      <td>${p.lastEditor}</td><td>${p.edited}</td>
      <td><button class="secondary" onclick="event.stopPropagation(); window.deleteProcessFlow(${p.id})">Delete</button></td>`;
    tr.onclick = () => openProcessFlow(p.id);
    tbody.appendChild(tr);
  });
}

export function openProcessFlow(id) {
  State.currentProcessFlowId = id;
  const pf = State.processFlows.find(p => p.id === id);
  if (!pf) return;
  pfManualPositions = {};
  pfZoom = 1;
  document.getElementById('pfTitleInput').value = pf.name;
  window.showView('processflowdetail');
}

export function pfPopulateTables() {
  const pf = State.processFlows.find(p => p.id === State.currentProcessFlowId);
  const sel = document.getElementById('pf-table');
  if (!sel) return;
  sel.innerHTML = '<option value="">Select table</option>' + Object.keys(State.tables).map(t => `<option value="${t}">${t}</option>`).join('');
}

export function renderProcessFlow() {
  const container = document.getElementById('processFlowCanvas');
  const pf = State.processFlows.find(p => p.id === State.currentProcessFlowId);
  const cfg = pf && pf.config;
  if (!cfg || !cfg.table || !State.tables[cfg.table]) {
    container.innerHTML = '<p class="subtitle" style="padding:20px;">No process mapping configured. Select a dataset and map event log attributes.</p>';
    return;
  }
  const table = State.tables[cfg.table];
  pfCases = buildCases(table, cfg.caseCol, cfg.activityCol, cfg.timeCol);
  pfVariants = computeVariants(pfCases);
  pfTotalCases = Object.keys(pfCases).length;
  drawProcessFlow();
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

function parseTS(v) {
  if (v === '' || v === undefined || v === null) return NaN;
  if (typeof v === 'number') return v;
  const t = new Date(v).getTime();
  return isNaN(t) ? NaN : t;
}

function computeVariants(byCase) {
  const variantMap = {};
  Object.entries(byCase).forEach(([cid, events]) => {
    const sig = events.map(e => e.act).join(' → ');
    (variantMap[sig] = variantMap[sig] || { count: 0, caseIds: [] });
    variantMap[sig].count++;
    variantMap[sig].caseIds.push(cid);
  });
  return variantMap;
}

function drawProcessFlow() {
  if (!pfCases) return;
  const activityPct = Number(document.getElementById('pfActivitySlider')?.value || 100);
  const pathPct = Number(document.getElementById('pfPathSlider')?.value || 100);
  
  const selectedCases = selectCasesByVariantCoverage(pfCases, pfVariants, pathPct);
  const caseDFG = dfgFromCases(pfCases, selectedCases.keptCaseIds);
  pfLastDFG = filterActivities(caseDFG, activityPct);
  renderSVG();
}

function selectCasesByVariantCoverage(byCase, variantMap, pathPct) {
  const variants = Object.values(variantMap).sort((a, b) => b.count - a.count);
  const totalCases = Object.keys(byCase).length || 1;
  const keptCaseIds = new Set();
  let cum = 0;
  for (const v of variants) {
    v.caseIds.forEach(cid => keptCaseIds.add(cid));
    cum += v.count;
    if ((cum / totalCases) * 100 >= pathPct) break;
  }
  return { keptCaseIds };
}

function dfgFromCases(byCase, caseIdSet) {
  const nodeFreq = {}, edgeFreq = {}, startFreq = {}, edgeDurSum = {}, edgeDurCount = {};
  Object.entries(byCase).forEach(([cid, events]) => {
    if (!caseIdSet.has(cid)) return;
    events.forEach((e, i) => {
      nodeFreq[e.act] = (nodeFreq[e.act] || 0) + 1;
      if (i === 0) startFreq[e.act] = (startFreq[e.act] || 0) + 1;
      if (i > 0) {
        const prev = events[i - 1];
        const key = prev.act + '→' + e.act;
        edgeFreq[key] = (edgeFreq[key] || 0) + 1;
        if (!isNaN(prev.ts) && !isNaN(e.ts)) {
          edgeDurSum[key] = (edgeDurSum[key] || 0) + (e.ts - prev.ts);
          edgeDurCount[key] = (edgeDurCount[key] || 0) + 1;
        }
      }
    });
  });
  const nodes = Object.keys(nodeFreq).map(act => ({ id: act, freq: nodeFreq[act], isStart: !!startFreq[act] }));
  const edges = Object.keys(edgeFreq).map(k => {
    const [from, to] = k.split('→');
    return { from, to, freq: edgeFreq[k], avgDurMs: edgeDurCount[k] ? edgeDurSum[k] / edgeDurCount[k] : null };
  });
  return { nodes, edges };
}

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
    edges: dfg.edges.filter(e => keepNodes.has(e.from) && keepNodes.has(e.to))
  };
}

function renderSVG() {
  const container = document.getElementById('processFlowCanvas');
  if (!container || !pfLastDFG) return;
  let layout = layoutDFG(pfLastDFG);
  const svgW = layout.width * pfZoom, svgH = layout.height * pfZoom;

  let svg = `<svg width="${svgW}" height="${svgH}" viewBox="0 0 ${layout.width} ${layout.height}">
    <defs><marker id="pfArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M1 1L9 5L1 9" fill="none" stroke="#8c93a4" stroke-width="1.6"/></marker></defs>`;

  pfLastDFG.edges.forEach(e => {
    const p1 = layout.positions[e.from], p2 = layout.positions[e.to];
    if (!p1 || !p2) return;
    const x1 = p1.x + layout.boxW, y1 = p1.y + layout.boxH / 2, x2 = p2.x, y2 = p2.y + layout.boxH / 2;
    const d = `M ${x1} ${y1} C ${x1 + 40} ${y1}, ${x2 - 40} ${y2}, ${x2} ${y2}`;
    svg += `<path class="pf-edge" d="${d}" fill="none" stroke="#4f8cff" stroke-width="2" opacity="0.75" marker-end="url(#pfArrow)"/>`;
  });

  pfLastDFG.nodes.forEach(n => {
    const p = layout.positions[n.id];
    if (!p) return;
    svg += `<g class="pf-node" style="cursor:grab;">
      <rect x="${p.x}" y="${p.y}" width="${layout.boxW}" height="${layout.boxH}" rx="8" fill="#181b24" stroke="${n.isStart ? '#3fd6a0' : '#4f8cff'}" stroke-width="2"/>
      <text x="${p.x + layout.boxW / 2}" y="${p.y + 20}" text-anchor="middle" fill="#f0f2f6" font-size="12" font-weight="600">${String(n.id).slice(0, 16)}</text>
      <text x="${p.x + layout.boxW / 2}" y="${p.y + 36}" text-anchor="middle" fill="#8c93a4" font-size="10">${n.freq} cases</text>
    </g>`;
  });

  svg += `</svg>`;
  container.innerHTML = svg;
}

function layoutDFG(dfg) {
  const boxW = 140, boxH = 50, colGap = 180, rowGap = 80;
  const positions = {};
  dfg.nodes.forEach((n, i) => {
    positions[n.id] = { x: 40 + (i % 4) * colGap, y: 40 + Math.floor(i / 4) * rowGap };
  });
  return { positions, boxW, boxH, width: 800, height: 600 };
}

window.deleteProcessFlow = function(id) {
  State.processFlows = State.processFlows.filter(p => p.id !== id);
  refreshProcessFlowListTable();
  saveStateToStorage();
};
