/* ============================================================
   STATE
   ============================================================ */
const State = {
  tables: {},          // { tableName: { columns:[...], rows:[{...}] } }
  dashboards: [],       // { firestoreId, name, creator, created, lastEditor, edited, ownerUid, sharedWith:{uid:role}, sheets:[{id,name,widgets:[]}], currentSheetId }
  currentDashboardId: null,   // a firestoreId string, not the old numeric id
  processFlows: [],     // { id, name, creator, created, lastEditor, edited, config: {table,caseCol,activityCol,timeCol} }
  currentProcessFlowId: null,
  theme: 'dark',
  userDirectory: null,   // { uid: {uid,email,name,role} } — loaded on demand for Share picker / Admin Users page
  shareTargetDashboardId: null
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

