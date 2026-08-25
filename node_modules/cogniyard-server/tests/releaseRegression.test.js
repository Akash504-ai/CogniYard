const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('v2.3.1 keeps all requested workflow corrections in the shipped source', () => {
  const app = read('client/src/App.jsx');
  const sidebar = read('client/src/components/Sidebar.jsx');
  const procurement = read('client/src/pages/ProcurementPage.jsx');
  const dashboard = read('client/src/pages/Dashboard.jsx');
  const analytics = read('server/controllers/analyticsController.js');
  const logistics = read('client/src/pages/LogisticsPage.jsx');
  const gateVision = read('client/src/components/WarehouseGateVision.jsx');
  const supplierPortal = read('client/src/pages/SupplierPortal.jsx');
  const supplierRoutes = read('server/routes/supplierRoutes.js');
  const finance = read('client/src/pages/FinancePage.jsx');
  const matching = read('server/services/invoiceService.js');
  const admin = read('client/src/pages/AdminPage.jsx');
  const vite = read('client/vite.config.js');
  const starter = read('START_COGNIYARD_WINDOWS.bat');

  assert.doesNotMatch(app, /SupplyChainSimulation|WorkflowGuide/);
  assert.doesNotMatch(sidebar, /ONLY YOUR WORK|System Online|Irrelevant modules/i);
  assert.match(procurement, /Select an evaluated supplier before dispatching the Purchase Order/);
  assert.match(dashboard, /xAxisLabel/);
  assert.match(dashboard, /Legend/);
  assert.match(analytics, /Distribution/);
  assert.match(sidebar, /\/yard-simulation/);
  assert.match(sidebar, /Intelligent Truck Simulation/);
  assert.match(logistics, /mode = 'verification'/);
  assert.match(logistics, /Simulation controls/);
  assert.match(logistics, /Receive Goods & GRN/);
  assert.match(gateVision, /Automatic truck and driver verification/);
  assert.match(supplierPortal, /Edit Invoice/);
  assert.match(supplierPortal, /Save & Refresh Finance/);
  assert.match(supplierRoutes, /patch\('\/supplier\/invoices\/:id'/);
  assert.match(finance, /!\/Line Total\|Tax Amount\|Grand Total\/i/);
  assert.doesNotMatch(matching, /field: `Line Total|field: 'Tax Amount'|field: 'Grand Total'/);

  for (const label of ['Supplier name', 'Company name', 'Phone number', 'Business email', 'Supplier login email', 'Supplier login password', 'Address']) {
    assert.match(admin, new RegExp(label, 'i'));
  }
  assert.doesNotMatch(admin, /Contact person|GST \/ VAT \/ Tax ID|Payment terms/);
  assert.match(vite, /strictPort:\s*true/);
  assert.match(starter, /VITE_PORT=3101/);
  assert.match(starter, /VITE_APP_VERSION=2\.3\.1/);
});
