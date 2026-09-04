/* ============================================================
   STATE
   ============================================================ */
const State = {
  tables: {},          // { tableName: { columns:[...], rows:[{...}] } }
  dashboards: [],       // { id, name, creator, created, lastEditor, edited, widgets:[] }
  currentDashboardId: null,
  processFlows: [],     // { id, name, creator, created, lastEditor, edited, config: {table,caseCol,activityCol,timeCol} }
  currentProcessFlowId: null,
  theme: 'dark'
};

let builderState = { kind: null, type: null, mode: 'nocode' };

/* ============================================================
   SIDEBAR — collapse + section expand + navigation
   ============================================================ */

let _confirmCallback = null;

let pfCases = null, pfVariants = null, pfTotalCases = 0;

let pfLastDFG = null, pfLastLayout = null;

let pfManualPositions = {};

let pfZoom = 1;


let pfDragging = false;

/* ---- Zoom controls ---- */

let undoStack = [], redoStack = [];

let dashEditMode = true;

const PF_SNAP = 20;

let connectedDirHandle = null;

/* ---- Auth (Firebase) ---- */
let currentUser = null;
let currentUserRole = 'admin';

