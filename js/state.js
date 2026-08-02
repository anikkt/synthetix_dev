
export const State = {
  tables: {},           // { tableName: { columns: [...], rows: [...] } }
  dashboards: [],        // Array of dashboard objects
  currentDashboardId: null,
  processFlows: [],      // Array of process flow config objects
  currentProcessFlowId: null,
  theme: 'dark',
  
  listeners: [],
  subscribe(fn) {
    this.listeners.push(fn);
  },
  notify() {
    this.listeners.forEach(fn => fn(this));
  }
};
