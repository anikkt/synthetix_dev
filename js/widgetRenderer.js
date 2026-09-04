function renderWidgetBody(w) {
  const el = document.getElementById('body-' + w.id);
  if (!el) return;
  if (w.kind === 'chart') return renderChartWidget(el, w);
  if (w.kind === 'kpi') return renderKPIWidget(el, w);
  if (w.kind === 'selection') return renderSelectionWidget(el, w);
  if (w.kind === 'textbox') return renderTextboxWidget(el, w);
  if (w.kind === 'image') return renderImageWidget(el, w);
}


function renderChartWidget(el, w) {
  const table = State.tables[w.table];
  if (!table) { el.innerHTML = '<p class="subtitle">Table not found.</p>'; return; }
  if (!SUPPORTED_CHART_TYPES.includes(w.chartType)) {
    el.innerHTML = `<p class="subtitle">Preview not implemented for "${w.chartType}" in this scaffold.</p>`;
    return;
  }
  if (w.chartType === 'olaptable') {
    const cols = (w.columns && w.columns.length) ? w.columns : table.columns;
    el.innerHTML = renderTableHTML(cols, table.rows.slice(0, 200));
    return;
  }
  const { labels, values } = aggregateByX(table, w.x, w.yAgg, w.yCol);
  const yLabel = `${w.yAgg}(${w.yCol || '*'})`;
  if (w.chartType === 'pivottable') {
    el.innerHTML = renderTableHTML([w.x, yLabel], labels.map((l, i) => ({ [w.x]: l, [yLabel]: values[i] })));
    return;
  }
  drawChartCanvas(el, w, labels, values);
}


function drawChartCanvas(canvas, w, labels, values) {
  const type = w.chartType;
  const isPie = type === 'pie' || type === 'donut';
  const showAxis = w.showAxis !== false && !isPie;
  const showDataLabels = !!w.showDataLabels;
  const wrapper = canvas.parentElement; // .chart-scroll
  const rect = wrapper.getBoundingClientRect();
  const containerWidth = rect.width || 300;
  const H = rect.height || 200;

  const needsScroll = (type === 'column' || type === 'line' || type === 'area');
  const perItem = type === 'column' ? 56 : 46;
  const W = needsScroll ? Math.max(containerWidth, values.length * perItem) : containerWidth;

  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);
  const max = Math.max(...values, 1);
  const colors = ['#4f8cff','#3fd6a0','#e2554f','#e2a13f','#a06fe2','#4fd0e2'];

  const leftPad = showAxis ? 42 : 10;
  const rightPad = 10;
  const bottomPad = showAxis ? 38 : 20;
  const topPad = showDataLabels ? 20 : 10;
  const plotW = W - leftPad - rightPad;
  const plotH = H - topPad - bottomPad;

  ctx.strokeStyle = '#2c3040';
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  if (showAxis) {
    ctx.strokeStyle = '#3a3f52';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftPad, topPad); ctx.lineTo(leftPad, H - bottomPad); ctx.lineTo(W - rightPad, H - bottomPad);
    ctx.stroke();
    ctx.fillStyle = '#9aa0b0';
    ctx.font = '9px Segoe UI';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const v = max * (1 - i / 4);
      const y = topPad + (plotH * i / 4);
      ctx.fillText(formatNum(v), leftPad - 6, y + 3);
    }
    ctx.textAlign = 'center';
    if (w.yAxisLabel) {
      ctx.save();
      ctx.translate(11, topPad + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(w.yAxisLabel, 0, 0);
      ctx.restore();
    }
    if (w.xAxisLabel) ctx.fillText(w.xAxisLabel, leftPad + plotW / 2, H - 5);
  }

  const hitRegions = [];

  if (type === 'column') {
    const gap = plotW / values.length;
    const barW = gap * 0.6;
    values.forEach((v, i) => {
      const h = (v / max) * plotH;
      const x = leftPad + i * gap + (gap - barW) / 2;
      const yTop = H - bottomPad - h;
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(x, yTop, barW, h);
      ctx.fillStyle = '#9aa0b0';
      ctx.font = '10px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText(String(labels[i]).slice(0, 10), x + barW / 2, H - bottomPad + 14);
      if (showDataLabels) {
        ctx.fillStyle = '#e6e8ee';
        ctx.font = '600 10px Segoe UI';
        ctx.fillText(formatNum(v), x + barW / 2, yTop - 5);
      }
      hitRegions.push({ x, y: yTop, w: barW, h: h || 2, label: labels[i], value: v });
    });
  } else if (type === 'line' || type === 'area') {
    const stepX = plotW / (values.length - 1 || 1);
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = leftPad + i * stepX, y = H - bottomPad - (v / max) * plotH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    if (type === 'area') {
      ctx.lineTo(leftPad + (values.length - 1) * stepX, H - bottomPad);
      ctx.lineTo(leftPad, H - bottomPad);
      ctx.closePath();
      ctx.fillStyle = colors[0] + '55';
      ctx.fill();
      ctx.beginPath();
      values.forEach((v, i) => {
        const x = leftPad + i * stepX, y = H - bottomPad - (v / max) * plotH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
    }
    ctx.strokeStyle = colors[0];
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '9px Segoe UI';
    ctx.textAlign = 'center';
    values.forEach((v, i) => {
      const x = leftPad + i * stepX;
      const y = H - bottomPad - (v / max) * plotH;
      ctx.fillStyle = '#9aa0b0';
      ctx.fillText(String(labels[i]).slice(0, 8), x, H - bottomPad + 14);
      if (showDataLabels) {
        ctx.fillStyle = '#e6e8ee';
        ctx.font = '600 10px Segoe UI';
        ctx.fillText(formatNum(v), x, y - 8);
        ctx.font = '9px Segoe UI';
      }
      hitRegions.push({ x, y, label: labels[i], value: v });
    });
  } else if (type === 'pie' || type === 'donut') {
    const total = values.reduce((a, b) => a + b, 0) || 1;
    let start = -Math.PI / 2;
    const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 14;
    values.forEach((v, i) => {
      const slice = (v / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + slice);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      if (showDataLabels && v > 0) {
        const mid = start + slice / 2;
        const lx = cx + Math.cos(mid) * r * 0.65, ly = cy + Math.sin(mid) * r * 0.65;
        ctx.fillStyle = '#0d0f14';
        ctx.textAlign = 'center';
        ctx.font = '600 9px Segoe UI';
        ctx.fillText(String(labels[i]).slice(0, 12), lx, ly - 6);
        ctx.font = '700 10px Segoe UI';
        ctx.fillText(formatNum(v), lx, ly + 6);
      }
      hitRegions.push({ startAngle: start, endAngle: start + slice, cx, cy, rOuter: r, rInner: type === 'donut' ? r * 0.55 : 0, label: labels[i], value: v });
      start += slice;
    });
    if (type === 'donut') {
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = '#1b1e27';
      ctx.fill();
    }
  }

  canvas._hitType = type;
  canvas._hitRegions = hitRegions;
  attachChartHover(canvas);
}

/* ---- Hover tooltip (name + value, semi-transparent) for all chart types ---- */

function attachChartHover(canvas) {
  if (canvas._hoverBound) return;
  canvas._hoverBound = true;
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hit = findChartHit(canvas, mx, my);
    if (hit) showChartTooltip(e.clientX, e.clientY, hit.label, hit.value);
    else hideChartTooltip();
  });
  canvas.addEventListener('mouseleave', hideChartTooltip);
}

function findChartHit(canvas, mx, my) {
  const type = canvas._hitType;
  const regions = canvas._hitRegions || [];
  if (type === 'column') {
    return regions.find(r => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h);
  }
  if (type === 'line' || type === 'area') {
    let closest = null, minDist = 12;
    regions.forEach(p => {
      const d = Math.hypot(mx - p.x, my - p.y);
      if (d < minDist) { minDist = d; closest = p; }
    });
    return closest;
  }
  if (type === 'pie' || type === 'donut') {
    if (!regions.length) return null;
    const { cx, cy, rOuter, rInner } = regions[0];
    const dx = mx - cx, dy = my - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > rOuter || dist < rInner) return null;
    let a = Math.atan2(dy, dx);
    if (a < -Math.PI / 2) a += Math.PI * 2;
    return regions.find(s => a >= s.startAngle && a < s.endAngle);
  }
  return null;
}

function showTooltipHTML(clientX, clientY, html) {
  const tip = document.getElementById('chartTooltip');
  tip.innerHTML = html;
  tip.style.left = (clientX + 14) + 'px';
  tip.style.top = (clientY + 14) + 'px';
  tip.style.display = 'block';
}

function showChartTooltip(clientX, clientY, label, value) {
  showTooltipHTML(clientX, clientY, `<b>${label}</b>: ${formatNum(value)}`);
}

function hideChartTooltip() {
  document.getElementById('chartTooltip').style.display = 'none';
}

/* ---- KPI rendering ---- */

function computeKPIValue(w) {
  if (w.mode === 'sql') {
    try {
      const result = executeSQL(w.sql);
      const val = Object.values(result.rows[0] || {})[0];
      return Number(val);
    } catch (e) { return NaN; }
  }
  const table = State.tables[w.table];
  if (!table) return NaN;
  return aggregate(w.agg, w.col, table.rows);
}

function renderKPIWidget(el, w) {
  const value = computeKPIValue(w);
  if (w.kpiType === 'number') {
    el.innerHTML = `<div style="font-size:42px;font-weight:700;color:var(--accent2);">${formatNum(value)}</div>`;
    return;
  }
  drawKPICanvas(el, w.kpiType, value, w.max ? Number(w.max) : null);
}

function drawKPICanvas(canvas, type, value, maxOverride) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const W = rect.width || 260, H = rect.height || 200;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);
  const safeVal = isFinite(value) ? value : 0;
  const max = maxOverride && maxOverride > 0 ? maxOverride : Math.max(safeVal * 1.5, 1);
  const ratio = Math.min(Math.max(safeVal / max, 0), 1);

  if (type === 'gauge') {
    const cx = W / 2, cy = H - 20, r = Math.min(W, H) / 2 - 10;
    ctx.beginPath(); ctx.lineWidth = 14; ctx.strokeStyle = '#2c3040';
    ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle = '#4f8cff';
    ctx.arc(cx, cy, r, Math.PI, Math.PI + ratio * Math.PI); ctx.stroke();
    ctx.fillStyle = '#e6e8ee'; ctx.font = '600 22px Segoe UI'; ctx.textAlign = 'center';
    ctx.fillText(formatNum(safeVal), cx, cy - 14);
  } else if (type === 'radial') {
    const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 12;
    ctx.beginPath(); ctx.lineWidth = 14; ctx.strokeStyle = '#2c3040';
    ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle = '#3fd6a0'; ctx.lineCap = 'round';
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + ratio * 2 * Math.PI); ctx.stroke();
    ctx.fillStyle = '#e6e8ee'; ctx.font = '600 20px Segoe UI'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(formatNum(safeVal), cx, cy);
  } else if (type === 'fill') {
    const bx = W / 2 - 40, by = 20, bw = 80, bh = H - 40;
    ctx.strokeStyle = '#2c3040'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
    const fillH = bh * ratio;
    ctx.fillStyle = '#e2a13f'; ctx.fillRect(bx, by + bh - fillH, bw, fillH);
    ctx.fillStyle = '#e6e8ee'; ctx.font = '600 16px Segoe UI'; ctx.textAlign = 'center';
    ctx.fillText(formatNum(safeVal), W / 2, by + bh + 20);
  }
}

/* ---- Selection widget rendering (placeholder) ---- */

function renderSelectionWidget(el, w) {
  const table = State.tables[w.table];
  if (!table) { el.innerHTML = '<p class="subtitle">Table not found.</p>'; return; }
  if (w.selType === 'dropdown') {
    const values = [...new Set(table.rows.map(r => r[w.col]))];
    el.innerHTML = `<select style="width:100%;">${values.map(v => `<option>${v}</option>`).join('')}</select>
      <p class="subtitle" style="margin-top:6px;">Not wired to filter other widgets yet.</p>`;
  } else {
    el.innerHTML = `<input type="date" style="width:100%;">
      <p class="subtitle" style="margin-top:6px;">Not wired to filter other widgets yet.</p>`;
  }
}

/* ---- Text box / Image widgets ---- */

function renderTextboxWidget(el, w) {
  el.innerHTML = `<div style="white-space:pre-wrap;font-size:13px;line-height:1.5;overflow-y:auto;height:100%;">${escHtml(w.content)}</div>`;
}

function renderImageWidget(el, w) {
  if (!w.url) { el.innerHTML = '<p class="subtitle">No image set.</p>'; return; }
  el.innerHTML = `<img src="${esc(w.url)}" style="width:100%;height:100%;object-fit:contain;border-radius:8px;" alt="${esc(w.title)}">`;
}
