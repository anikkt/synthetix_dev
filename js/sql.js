function runETL() {
  const errEl = document.getElementById('sqlErr');
  errEl.textContent = '';
  const sql = document.getElementById('sqlInput').value.trim();
  const saveAs = document.getElementById('saveAsName').value.trim();
  try {
    const result = executeSQL(sql);
    if (saveAs) {
      State.tables[sanitizeTableName(saveAs)] = result;
      refreshTableList();
      saveStateToStorage();
    }
    document.getElementById('previewArea').innerHTML = renderTableHTML(result.columns, result.rows.slice(0, 50));
  } catch (err) {
    errEl.textContent = err.message;
  }
}


const AGG_RE = /^(COUNT|SUM|AVG|MIN|MAX)\((DISTINCT\s+)?(\*|\w+)\)$/i;


function executeSQL(sql) {
  const m = sql.match(/^SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+GROUP BY\s+(\w+))?$/i);
  if (!m) throw new Error('Could not parse query. Expected: SELECT cols FROM table [WHERE ...] [GROUP BY col]');
  const [, selectPart, tableName, wherePart, groupCol] = m;
  const table = State.tables[tableName];
  if (!table) throw new Error(`Table "${tableName}" not found`);

  let rows = table.rows;
  if (wherePart) {
    const wm = wherePart.match(/^\s*(\w+)\s*(=|!=|>|<|>=|<=)\s*(.+?)\s*$/);
    if (!wm) throw new Error('Could not parse WHERE clause');
    const [, col, op, rawVal] = wm;
    const val = coerce(rawVal.replace(/^'(.*)'$/, '$1'));
    const cmp = { '=': (a,b)=>a==b, '!=': (a,b)=>a!=b, '>': (a,b)=>a>b, '<': (a,b)=>a<b, '>=': (a,b)=>a>=b, '<=': (a,b)=>a<=b }[op];
    rows = rows.filter(r => cmp(r[col], val));
  }

  const fields = selectPart.split(',').map(s => s.trim());

  if (groupCol) {
    const groups = {};
    rows.forEach(r => {
      const key = r[groupCol];
      (groups[key] = groups[key] || []).push(r);
    });
    const outRows = Object.entries(groups).map(([key, groupRows]) => {
      const out = { [groupCol]: key };
      fields.forEach(f => {
        if (f === groupCol) return;
        const agg = f.match(AGG_RE);
        if (agg) {
          const [, fn, distinct, col] = agg;
          const effFn = (fn.toUpperCase() === 'COUNT' && distinct) ? 'COUNTD' : fn.toUpperCase();
          out[f] = aggregate(effFn, col, groupRows);
        } else {
          out[f] = groupRows[0][f];
        }
      });
      return out;
    });
    const outCols = [groupCol, ...fields.filter(f => f !== groupCol)];
    return { columns: outCols, rows: outRows };
  }

  const isAggQuery = fields.every(f => AGG_RE.test(f));
  if (isAggQuery) {
    const out = {};
    fields.forEach(f => {
      const agg = f.match(AGG_RE);
      const [, fn, distinct, col] = agg;
      const effFn = (fn.toUpperCase() === 'COUNT' && distinct) ? 'COUNTD' : fn.toUpperCase();
      out[f] = aggregate(effFn, col, rows);
    });
    return { columns: fields, rows: [out] };
  }

  const outCols = fields[0] === '*' ? table.columns : fields;
  const outRows = rows.map(r => {
    const out = {};
    outCols.forEach(c => out[c] = r[c]);
    return out;
  });
  return { columns: outCols, rows: outRows };
}


function aggregate(fn, col, rows) {
  if (fn === 'COUNT') {
    if (col === '*') return rows.length;
    return rows.filter(r => r[col] !== '' && r[col] != null).length;
  }
  if (fn === 'COUNTD') return new Set(rows.map(r => r[col])).size;
  const nums = rows.map(r => Number(r[col]) || 0);
  if (fn === 'SUM') return nums.reduce((a,b)=>a+b, 0);
  if (fn === 'AVG') return nums.reduce((a,b)=>a+b, 0) / (nums.length || 1);
  if (fn === 'MIN') return nums.length ? Math.min(...nums) : 0;
  if (fn === 'MAX') return nums.length ? Math.max(...nums) : 0;
  return null;
}

/* ============================================================
   DASHBOARDS — list + per-dashboard widget grid
   ============================================================ */

function aggregateByX(table, xCol, yAgg, yCol) {
  const groups = {};
  table.rows.forEach(r => {
    const key = r[xCol];
    (groups[key] = groups[key] || []).push(r);
  });
  const labels = Object.keys(groups);
  const values = labels.map(k => aggregate(yAgg, yCol, groups[k]));
  return { labels, values };
}

