const FAQ_ITEMS = [
  {
    q: 'How do I get data into the warehouse?',
    a: 'Go to Data > New source. Upload a CSV/TSV/XLSX file directly, connect a local folder to load files from disk, or use the SharePoint/OneDrive or Amazon S3 tiles (best-effort connectors — see their own notes for limitations).'
  },
  {
    q: 'How do I transform data with SQL?',
    a: 'Go to Data > Existing data > Transform. Write a query like "SELECT region, SUM(amount) FROM sales GROUP BY region", give it a name under "save as," and click Run. The result becomes a new table.'
  },
  {
    q: 'How do I build a process map?',
    a: 'Go to Process Flow, click "+ Add new," then map your table\'s Case ID, Activity, and Timestamp columns. The diagram builds automatically from those three columns.'
  },
  {
    q: 'The process flow looks too tangled — how do I simplify it?',
    a: 'Use the Activities and Paths sliders at the top of the process flow. Lowering them keeps only the highest-volume activities/paths, which cuts noise from rare variants and converges toward the "happy path" as you lower the Paths slider further.'
  },
  {
    q: 'How do I build a dashboard?',
    a: 'Go to Dashboards, click "+ Add new," then "+ Add widget" inside it to open the widget catalog — charts, KPIs, tables, and selection controls. Drag widgets to move them, drag the bottom-right corner to resize.'
  },
  {
    q: 'Where is my data actually stored?',
    a: 'Your tables, dashboards, and process flows are stored in Firebase (Firestore), tied to your signed-in account. A connected local folder stays on your device only, since that\'s inherently tied to your specific browser.'
  },
  {
    q: 'Can I switch between dark and light mode?',
    a: 'Yes — go to User Profile > Appearance and use the toggle.'
  },
  {
    q: 'How do I back up my work outside of Firebase?',
    a: 'Go to User Profile > Workspace and click "Export workspace (.json)." That file can be re-imported later from the same screen.'
  },
  {
    q: 'Who can see my dashboards and process flows?',
    a: 'Right now, only you — sharing with other users (Analyst/Viewer roles) is a planned feature and hasn\'t been enabled yet.'
  }
];
