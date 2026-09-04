const COMPONENT_CATALOG = [
  { cat: 'Charts and tables', color: '#4f8cff', items: [
      { type: 'olaptable', label: 'OLAP Table', supported: true },
      { type: 'column', label: 'Column Chart', supported: true },
      { type: 'pie', label: 'Pie Chart', supported: true },
      { type: 'donut', label: 'Donut Chart', supported: true },
      { type: 'line', label: 'Line Chart', supported: true },
      { type: 'area', label: 'Area Chart', supported: true },
      { type: 'marker', label: 'Marker Chart', supported: false },
      { type: 'bubble', label: 'Bubble Plot', supported: false },
      { type: 'histogram', label: 'Histogram Chart', supported: false },
      { type: 'scatter', label: 'Scatter Plot', supported: false },
      { type: 'pivottable', label: 'Pivot Table', supported: true },
      { type: 'boxplot', label: 'Boxplot', supported: false },
      { type: 'worldmap', label: 'World Map', supported: false },
  ]},
  { cat: 'Single KPI components', color: '#3fd6a0', items: [
      { type: 'gauge', label: 'Gauge', supported: true },
      { type: 'fill', label: 'Fill', supported: true },
      { type: 'number', label: 'Number', supported: true },
      { type: 'radial', label: 'Radial', supported: true },
  ]},
  { cat: 'Selection components', color: '#e2a13f', items: [
      { type: 'dropdown', label: 'Dropdown', supported: true },
      { type: 'datepicker', label: 'Date Picker', supported: true },
  ]},
];

const SUPPORTED_CHART_TYPES = ['olaptable','column','pie','donut','line','area','pivottable'];

