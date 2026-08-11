function openWidgetBuilder() {
  document.getElementById('widgetBuilder').classList.add('open');
  renderPicker();
}

function closeWidgetBuilder() {
  document.getElementById('widgetBuilder').classList.remove('open');
}

function renderPicker() {
  let html = '<div class="between" style="margin-bottom:4px;"><b>New component</b><button class="secondary" onclick="closeWidgetBuilder()">Cancel</button></div>';
  COMPONENT_CATALOG.forEach(group => {
    html += `<div class="picker-cat">${group.cat}</div>`;
    group.items.forEach(item => {
      html += `<div class="picker-item" onclick="selectComponentType('${group.cat}','${item.type}',${item.supported})">
        <span class="dot" style="background:${group.color};"></span>${item.label}
        ${item.supported ? '' : '<span class="note">preview only</span>'}
      </div>`;
    });
  });
  document.getElementById('widgetBuilder').innerHTML = html;
}


function selectComponentType(cat, type, supported) {
  const kind = cat === 'Single KPI components' ? 'kpi' : cat === 'Selection components' ? 'selection' : 'chart';
  builderState = { kind, type, supported, mode: 'nocode', editingId: null };
  if (kind === 'chart') renderChartConfig();
  else if (kind === 'kpi') renderKPIConfig();
  else renderSelectionConfig();
}


function editWidget(id) {
  const d = currentDashboard();
  if (!d) return;
  const w = d.widgets.find(x => x.id === id);
  if (!w) return;
  document.getElementById('widgetBuilder').classList.add('open');
  if (w.kind === 'chart') {
    builderState = { kind: 'chart', type: w.chartType, supported: w.supported !== false, mode: 'nocode', editingId: id };
    renderChartConfig(w);
  } else if (w.kind === 'kpi') {
    builderState = { kind: 'kpi', type: w.kpiType, supported: true, mode: w.mode || 'nocode', editingId: id };
    renderKPIConfig(w);
  } else {
    builderState = { kind: 'selection', type: w.selType, supported: true, mode: 'nocode', editingId: id };
    renderSelectionConfig(w);
  }
}


function renderChartConfig(existing) {
  const isEdit = !!(existing && builderState.editingId);
  const type = builderState.type;
  const isOlap = type === 'olaptable';
  const isPivot = type === 'pivottable';
  const isPie = type === 'pie' || type === 'donut';
  const needsXY = !isOlap;
  const showVisualControls = needsXY && !isPivot;
  const label = COMPONENT_CATALOG[0].items.find(i=>i.type===type)?.label || type;
  const html = `
    <button class="link" onclick="${isEdit ? 'closeWidgetBuilder()' : 'openWidgetBuilder()'}">&larr; ${isEdit ? 'Close' : 'Back'}</button>
    <div style="margin-top:6px;"><b>${isEdit ? 'Edit: ' : ''}${label}</b></div>
    ${!builderState.supported ? '<p class="err">Preview is not implemented for this type in the scaffold yet — the widget will still be saved with a placeholder.</p>' : ''}
    ${isEdit ? `
    <div class="row" style="margin-top:10px;">
      <label style="font-size:11px;color:var(--text-dim);flex:1;">Chart type
        <select onchange="cfChangeType(this.value)" style="width:100%;margin-top:2px;">
          ${COMPONENT_CATALOG[0].items.filter(i => i.supported).map(i => `<option value="${i.type}" ${i.type === type ? 'selected' : ''}>${i.label}</option>`).join('')}
        </select>
      </label>
    </div>` : ''}
    <div class="row" style="margin-top:12px;"><input type="text" id="cf-title" placeholder="Widget title" style="flex:1;" value="${esc(existing && existing.title)}"></div>
    <div class="row" style="margin-top:10px;">
      <select id="cf-table" onchange="cfPopulateColumns()" style="flex:1;"><option value="">Select table</option>${tableOptionsHTML(existing && existing.table)}</select>
    </div>
    ${isOlap ? `
    <div class="axis-block">
      <div class="axis-label">Columns to include</div>
      <div class="olap-col-list" id="cf-olap-cols"><span class="subtitle">Select a table first.</span></div>
    </div>` : ''}
    ${needsXY ? `
    <div class="axis-block">
      <div class="axis-label">X axis</div>
      <select id="cf-x" style="width:100%;"></select>
    </div>
    <div class="axis-block">
      <div class="axis-label">Y axis</div>
      <div class="row">${aggSelectHTML('cf-yagg')}<select id="cf-y" style="flex:1;"></select></div>
    </div>` : ''}
    ${showVisualControls && !isPie ? `
    <div class="axis-block">
      <label style="display:block;font-size:12px;"><input type="checkbox" id="cf-showaxis" ${existing && existing.showAxis === false ? '' : 'checked'}> Show axis lines &amp; names</label>
      <input type="text" id="cf-xlabel" placeholder="X axis name (optional)" style="width:100%;margin-top:8px;" value="${esc(existing && existing.xAxisLabel)}">
      <input type="text" id="cf-ylabel" placeholder="Y axis name (optional)" style="width:100%;margin-top:8px;" value="${esc(existing && existing.yAxisLabel)}">
    </div>` : ''}
    ${showVisualControls ? `
    <div class="axis-block">
      <label style="font-size:12px;"><input type="checkbox" id="cf-datalabels" ${existing && existing.showDataLabels ? 'checked' : ''}> Show data labels (value at each ${isPie ? 'slice' : 'bar/point'})</label>
    </div>` : ''}
    <div class="row" style="margin-top:14px;">
      <button onclick="createChartWidget()">${isEdit ? 'Save changes' : 'Create'}</button>
      <button class="secondary" onclick="closeWidgetBuilder()">Cancel</button>
    </div>`;
  document.getElementById('widgetBuilder').innerHTML = html;

  if (existing && existing.table) {
    document.getElementById('cf-table').value = existing.table;
    cfPopulateColumns();
    if (needsXY) {
      if (document.getElementById('cf-x')) document.getElementById('cf-x').value = existing.x || '';
      if (document.getElementById('cf-yagg')) document.getElementById('cf-yagg').value = existing.yAgg || 'COUNT';
      if (document.getElementById('cf-y')) document.getElementById('cf-y').value = existing.yCol || '*';
    }
    if (isOlap) populateOlapCols(existing.columns);
  }
}

function cfChangeType(newType) {
  builderState.type = newType;
  builderState.supported = COMPONENT_CATALOG[0].items.find(i => i.type === newType)?.supported !== false;
  const snapshot = {
    title: document.getElementById('cf-title').value,
    table: document.getElementById('cf-table').value,
    x: document.getElementById('cf-x') ? document.getElementById('cf-x').value : '',
    yAgg: document.getElementById('cf-yagg') ? document.getElementById('cf-yagg').value : 'COUNT',
    yCol: document.getElementById('cf-y') ? document.getElementById('cf-y').value : '*',
    showAxis: document.getElementById('cf-showaxis') ? document.getElementById('cf-showaxis').checked : true,
    xAxisLabel: document.getElementById('cf-xlabel') ? document.getElementById('cf-xlabel').value : '',
    yAxisLabel: document.getElementById('cf-ylabel') ? document.getElementById('cf-ylabel').value : '',
    showDataLabels: document.getElementById('cf-datalabels') ? document.getElementById('cf-datalabels').checked : false
  };
  renderChartConfig(snapshot);
}

function cfPopulateColumns() {
  const table = State.tables[document.getElementById('cf-table').value];
  const opts = table ? table.columns.map(c => `<option value="${c}">${c}</option>`).join('') : '';
  const x = document.getElementById('cf-x'); if (x) x.innerHTML = opts;
  const y = document.getElementById('cf-y'); if (y) y.innerHTML = opts;
  if (document.getElementById('cf-olap-cols')) populateOlapCols();
}

function populateOlapCols(selected) {
  const el = document.getElementById('cf-olap-cols');
  if (!el) return;
  const table = State.tables[document.getElementById('cf-table').value];
  if (!table) { el.innerHTML = '<span class="subtitle">Select a table first.</span>'; return; }
  const sel = (selected && selected.length) ? selected : table.columns;
  el.innerHTML = table.columns.map(c => `<label><input type="checkbox" value="${c}" ${sel.includes(c) ? 'checked' : ''}> ${c}</label>`).join('');
}

function createChartWidget() {
  const d = currentDashboard();
  if (!d) return;
  const table = document.getElementById('cf-table').value;
  if (!table) { alert('Select a table first.'); return; }
  const type = builderState.type;
  const isOlap = type === 'olaptable';
  const x = document.getElementById('cf-x') ? document.getElementById('cf-x').value : '';
  const yAgg = document.getElementById('cf-yagg') ? document.getElementById('cf-yagg').value : 'COUNT';
  const yCol = document.getElementById('cf-y') ? document.getElementById('cf-y').value : '*';
  const title = document.getElementById('cf-title').value || `${type} on ${table}`;
  const showAxis = document.getElementById('cf-showaxis') ? document.getElementById('cf-showaxis').checked : true;
  const xAxisLabel = document.getElementById('cf-xlabel') ? document.getElementById('cf-xlabel').value : '';
  const yAxisLabel = document.getElementById('cf-ylabel') ? document.getElementById('cf-ylabel').value : '';
  const showDataLabels = document.getElementById('cf-datalabels') ? document.getElementById('cf-datalabels').checked : false;
  const columns = isOlap ? Array.from(document.querySelectorAll('#cf-olap-cols input:checked')).map(i => i.value) : undefined;

  snapshotWidgets();
  const props = { chartType: type, supported: builderState.supported, title, table, x, yAgg, yCol,
    showAxis, xAxisLabel, yAxisLabel, showDataLabels, columns };
  if (builderState.editingId) {
    const w = d.widgets.find(w => w.id === builderState.editingId);
    if (w) Object.assign(w, props);
  } else {
    d.widgets.push(newWidgetLayout({ id: Date.now(), kind: 'chart', ...props }, d));
  }
  d.edited = fmtDate(new Date());
  closeWidgetBuilder();
  renderWidgets();
  saveStateToStorage();
}

/* ---- KPI config (no-code aggregation or SQL, like image 2) ---- */

function renderKPIConfig(existing) {
  const isEdit = !!(existing && builderState.editingId);
  const label = COMPONENT_CATALOG[1].items.find(i=>i.type===builderState.type)?.label || builderState.type;
  const html = `
    <button class="link" onclick="${isEdit ? 'closeWidgetBuilder()' : 'openWidgetBuilder()'}">&larr; ${isEdit ? 'Close' : 'Back'}</button>
    <div style="margin-top:6px;"><b>${isEdit ? 'Edit: ' : ''}${label}</b></div>
    ${isEdit ? `
    <div class="row" style="margin-top:10px;">
      <label style="font-size:11px;color:var(--text-dim);flex:1;">KPI type
        <select onchange="kfChangeType(this.value)" style="width:100%;margin-top:2px;">
          ${COMPONENT_CATALOG[1].items.map(i => `<option value="${i.type}" ${i.type === builderState.type ? 'selected' : ''}>${i.label}</option>`).join('')}
        </select>
      </label>
    </div>` : ''}
    <div class="row" style="margin-top:12px;"><input type="text" id="kf-title" placeholder="KPI title" style="flex:1;" value="${esc(existing && existing.title)}"></div>
    <div class="subtabs" style="margin:14px 0 12px;">
      <div class="subtab ${builderState.mode !== 'sql' ? 'active' : ''}" id="kf-tab-nocode" onclick="kfShowMode('nocode')">No-code</div>
      <div class="subtab ${builderState.mode === 'sql' ? 'active' : ''}" id="kf-tab-sql" onclick="kfShowMode('sql')">SQL</div>
    </div>
    <div id="kf-mode-nocode" style="display:${builderState.mode === 'sql' ? 'none' : 'block'};">
      <div class="row">
        <select id="kf-table" onchange="kfPopulateColumns()"><option value="">Select table</option>${tableOptionsHTML(existing && existing.table)}</select>
        ${aggSelectHTML('kf-agg')}
        <select id="kf-col"><option value="*">All rows</option></select>
      </div>
    </div>
    <div id="kf-mode-sql" style="display:${builderState.mode === 'sql' ? 'block' : 'none'};">
      <textarea id="kf-sql" placeholder="SELECT SUM(amount) FROM sales">${existing && existing.sql ? existing.sql : ''}</textarea>
      <p class="subtitle" style="margin-top:6px;">Must resolve to a single aggregate value, e.g. SELECT COUNT(*) FROM table or SELECT SUM(col) FROM table WHERE col = value.</p>
    </div>
    ${builderState.type !== 'number' ? `<div class="row" style="margin-top:10px;"><input type="text" id="kf-max" placeholder="Target / max value (optional)" value="${esc(existing && existing.max)}"></div>` : ''}
    <div class="row" style="margin-top:14px;">
      <button onclick="createKPIWidget()">${isEdit ? 'Save changes' : 'Create'}</button>
      <button class="secondary" onclick="closeWidgetBuilder()">Cancel</button>
    </div>`;
  document.getElementById('widgetBuilder').innerHTML = html;
  if (existing && existing.mode !== 'sql' && existing.table) {
    document.getElementById('kf-table').value = existing.table;
    kfPopulateColumns();
    document.getElementById('kf-agg').value = existing.agg || 'COUNT';
    document.getElementById('kf-col').value = existing.col || '*';
  }
}

function kfChangeType(newType) {
  builderState.type = newType;
  const snapshot = {
    title: document.getElementById('kf-title').value,
    mode: builderState.mode,
    table: document.getElementById('kf-table') ? document.getElementById('kf-table').value : '',
    agg: document.getElementById('kf-agg') ? document.getElementById('kf-agg').value : 'COUNT',
    col: document.getElementById('kf-col') ? document.getElementById('kf-col').value : '*',
    sql: document.getElementById('kf-sql') ? document.getElementById('kf-sql').value : '',
    max: document.getElementById('kf-max') ? document.getElementById('kf-max').value : ''
  };
  renderKPIConfig(snapshot);
}

function kfShowMode(mode) {
  builderState.mode = mode;
  document.getElementById('kf-tab-nocode').classList.toggle('active', mode === 'nocode');
  document.getElementById('kf-tab-sql').classList.toggle('active', mode === 'sql');
  document.getElementById('kf-mode-nocode').style.display = mode === 'nocode' ? 'block' : 'none';
  document.getElementById('kf-mode-sql').style.display = mode === 'sql' ? 'block' : 'none';
}

function kfPopulateColumns() {
  const table = State.tables[document.getElementById('kf-table').value];
  const opts = '<option value="*">All rows</option>' + (table ? table.columns.map(c => `<option value="${c}">${c}</option>`).join('') : '');
  document.getElementById('kf-col').innerHTML = opts;
}

function createKPIWidget() {
  const d = currentDashboard();
  if (!d) return;
  const title = document.getElementById('kf-title').value || 'KPI';
  const max = document.getElementById('kf-max') ? document.getElementById('kf-max').value : '';
  const props = { kpiType: builderState.type, title, mode: builderState.mode, max };
  if (builderState.mode === 'sql') {
    props.sql = document.getElementById('kf-sql').value.trim();
  } else {
    props.table = document.getElementById('kf-table').value;
    props.agg = document.getElementById('kf-agg').value;
    props.col = document.getElementById('kf-col').value;
    if (!props.table) { alert('Select a table first.'); return; }
  }
  snapshotWidgets();
  if (builderState.editingId) {
    const w = d.widgets.find(w => w.id === builderState.editingId);
    if (w) Object.assign(w, props);
  } else {
    d.widgets.push(newWidgetLayout({ id: Date.now(), kind: 'kpi', ...props }, d));
  }
  d.edited = fmtDate(new Date());
  closeWidgetBuilder();
  renderWidgets();
  saveStateToStorage();
}

/* ---- Selection component config (placeholder filters) ---- */

function renderSelectionConfig(existing) {
  const isEdit = !!(existing && builderState.editingId);
  const label = COMPONENT_CATALOG[2].items.find(i=>i.type===builderState.type)?.label || builderState.type;
  const html = `
    <button class="link" onclick="${isEdit ? 'closeWidgetBuilder()' : 'openWidgetBuilder()'}">&larr; ${isEdit ? 'Close' : 'Back'}</button>
    <div style="margin-top:6px;"><b>${isEdit ? 'Edit: ' : ''}${label}</b></div>
    <p class="subtitle" style="margin-top:6px;">Placeholder control — not yet wired to filter other widgets.</p>
    <div class="row" style="margin-top:10px;"><input type="text" id="sf-title" placeholder="Control title" style="flex:1;" value="${esc(existing && existing.title)}"></div>
    <div class="row" style="margin-top:10px;">
      <select id="sf-table" onchange="sfPopulateColumns()"><option value="">Select table</option>${tableOptionsHTML(existing && existing.table)}</select>
      <select id="sf-col"></select>
    </div>
    <div class="row" style="margin-top:14px;">
      <button onclick="createSelectionWidget()">${isEdit ? 'Save changes' : 'Create'}</button>
      <button class="secondary" onclick="closeWidgetBuilder()">Cancel</button>
    </div>`;
  document.getElementById('widgetBuilder').innerHTML = html;
  if (existing && existing.table) {
    document.getElementById('sf-table').value = existing.table;
    sfPopulateColumns();
    document.getElementById('sf-col').value = existing.col || '';
  }
}

function sfPopulateColumns() {
  const table = State.tables[document.getElementById('sf-table').value];
  document.getElementById('sf-col').innerHTML = table ? table.columns.map(c => `<option value="${c}">${c}</option>`).join('') : '';
}

function createSelectionWidget() {
  const d = currentDashboard();
  if (!d) return;
  const table = document.getElementById('sf-table').value;
  if (!table) { alert('Select a table first.'); return; }
  const props = { selType: builderState.type, title: document.getElementById('sf-title').value || 'Filter',
    table, col: document.getElementById('sf-col').value };
  snapshotWidgets();
  if (builderState.editingId) {
    const w = d.widgets.find(w => w.id === builderState.editingId);
    if (w) Object.assign(w, props);
  } else {
    d.widgets.push(newWidgetLayout({ id: Date.now(), kind: 'selection', ...props }, d));
  }
  d.edited = fmtDate(new Date());
  closeWidgetBuilder();
  renderWidgets();
  saveStateToStorage();
}

/* ============================================================
   WIDGET RENDERING
   ============================================================ */

function removeWidget(id) {
  const d = currentDashboard();
  if (!d) return;
  snapshotWidgets();
  d.widgets = d.widgets.filter(w => w.id !== id);
  renderWidgets();
  saveStateToStorage();
}
