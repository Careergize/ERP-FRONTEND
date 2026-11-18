import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { verifyFrontend } from './finance-preservation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const baseline = JSON.parse(readFileSync(new URL('./finance-preview-baseline.json', import.meta.url)));
verifyFrontend(baseline.sha256);
const app = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');
for (const route of baseline.routes) assert.ok(app.includes(route), `Preserve route ${route}`);
const shell = readFileSync(resolve(root, 'src/components/layout/AppShell.tsx'), 'utf8');
assert.equal(shell.slice(shell.indexOf('const NAV_ITEMS:'), shell.indexOf('export function AppShell()')).replaceAll('\r\n', '\n'), baseline.navigation_constants);
assert.ok(app.indexOf("pathname === '/finance/preview'") < app.indexOf('<AuthProvider>'));
assert.match(app, /import\.meta\.env\.DEV && import\.meta\.env\.VITE_FINANCE_UI_PREVIEW === 'true'/);
assert.ok(!shell.includes("label: 'ERPNext Finance'"));

// Walk all preview dependencies, not just the page, to prevent future mock leakage.
const visited = new Set();
function inspect(path) {
  if (visited.has(path)) return;
  visited.add(path);
  const source = readFileSync(path, 'utf8');
  assert.doesNotMatch(source, /\b(?:axios|fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|sendBeacon)\b/, `No transport or persistence: ${path}`);
  assert.doesNotMatch(source, /ERPNext|Frappe|FinanceAccessContext|AuthContext|SharedEntriesContext/, `No live or branded dependencies: ${path}`);
  for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const name = match[1];
    if (!name.startsWith('.') && !name.startsWith('@/')) {
      assert.ok(['react', 'react-router-dom', 'lucide-react'].includes(name), `Unexpected external dependency ${name}`);
      continue;
    }
    const base = name.startsWith('@/') ? resolve(root, 'src', name.slice(2)) : resolve(dirname(path), name);
    let dependency;
    for (const suffix of ['.ts', '.tsx']) { try { readFileSync(base + suffix); dependency = base + suffix; break; } catch {} }
    assert.ok(dependency, `Resolve ${name}`);
    assert.ok(!dependency.includes('/context/') && !dependency.includes('\\context\\'), `No operational context: ${dependency}`);
    inspect(dependency);
  }
}
inspect(resolve(root, 'src/pages/FinancePreview/FinancePreviewRoutes.tsx'));
const server = await createServer({ configFile: false, resolve: { alias: { '@': resolve(root, 'src') } }, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
  const { createMasters, createSetup, blankMaster, validateMaster, validateSetup } = await server.ssrLoadModule('/src/finance/masterData.ts');
  const masters = createMasters();
  assert.deepEqual(validateSetup(createSetup()), []);
  assert.ok(validateSetup({ ...createSetup(), start: '2027-01-01' }).length);
  for (const kind of ['accounts', 'taxes', 'parties', 'banks']) {
    for (const row of masters[kind]) assert.deepEqual(validateMaster(kind, row, masters), [], `${kind}: fixture validity`);
    assert.ok(validateMaster(kind, blankMaster(), masters).length);
  }
  assert.deepEqual(validateMaster('accounts', { ...blankMaster(), name: 'New ledger', code: '1300', parent: 'DEMO-A1' }, masters), []);
  const asset = masters.accounts[0];
  assert.ok(validateMaster('accounts', { ...asset, parent: 'DEMO-A1' }, masters).some(e => e.includes('descendant')));
  masters.accounts.push({ ...blankMaster(), id: 'DEMO-CHILD', name: 'Child group', code: '1400', parent: asset.id, group: true });
  assert.ok(validateMaster('accounts', { ...asset, parent: 'DEMO-CHILD' }, masters).some(e => e.includes('descendant')));
  assert.ok(validateMaster('accounts', { ...masters.accounts[1], group: true }, masters).length);
  assert.ok(validateMaster('accounts', { ...masters.accounts[1], type: 'Income', parent: '' }, masters).length);
  assert.ok(validateMaster('accounts', { ...asset, group: false }, masters).length);
  assert.ok(validateMaster('accounts', { ...blankMaster(), name: 'Duplicate', code: '1100' }, masters).length);
  assert.ok(validateMaster('taxes', { ...masters.taxes[0], rate: '101' }, masters).length);
  assert.ok(validateMaster('taxes', { ...masters.taxes[0], ledger: 'DEMO-A2' }, masters).length);
  assert.ok(validateMaster('parties', { ...masters.parties[0], days: '1.5' }, masters).length);
  assert.ok(validateMaster('banks', { ...masters.banks[0], reference: 'real-bank' }, masters).length);
  assert.equal(createMasters().accounts.length, 6, 'Independent master factories');
  const { createMockFinanceService } = await server.ssrLoadModule('/src/finance/mockService.ts');
  const service = createMockFinanceService();
  const first = await service.loadDashboard();
  const second = await service.loadDashboard();
  first.transactions[0].amount = 0;
  first.cashAccounts[0].name = 'mutated locally';
  assert.equal(second.transactions[0].amount, 4000);
  assert.equal(second.cashAccounts[0].name, 'Fictional bank · report ledger');
  const controller = new AbortController(); controller.abort();
  await assert.rejects(service.loadDashboard(controller.signal));
  const ids = [...second.transactions, ...second.receivables, ...second.payables, ...second.cashAccounts].map(r => r.id);
  assert.ok(ids.every(id => id.startsWith('DEMO-')));
  assert.equal(new Set(ids).size, ids.length);
  for (const row of [...second.transactions, ...second.receivables, ...second.payables, ...second.cashAccounts]) assert.ok(Number.isSafeInteger(row.amount) && row.amount >= 0);
  for (const row of [...second.receivables, ...second.payables]) assert.ok(row.overdue <= row.amount && row.overdue >= 0);
  assert.equal(second.months.reduce((sum, m) => sum + m.revenue - m.expense, 0), 7750);
  const { FinanceChart } = await server.ssrLoadModule('/src/components/finance/preview/FinanceChart.tsx');
  const chart = renderToStaticMarkup(React.createElement(FinanceChart, { months: second.months, currency: second.currency }));
  assert.match(chart, /Horizontal axis: month/); assert.match(chart, /Vertical axis:/); assert.match(chart, /Demo Data/);
  const { FinanceRestrictedAction } = await server.ssrLoadModule('/src/components/finance/preview/FinanceRestrictedAction.tsx');
  for (const label of ['Post transaction', 'Approve', 'Activate Finance', 'Send email', 'Financial export']) {
    assert.match(renderToStaticMarkup(React.createElement(FinanceRestrictedAction, { label })), /disabled=""/);
  }
  console.log(`PASS: fresh preservation hashes, all existing routes/sidebar constants, dev gate before providers, ${visited.size} isolated dependencies, independent in-memory fixtures, abort, monetary consistency, accessible chart and disabled financial actions.`);
} finally { await server.close(); }
