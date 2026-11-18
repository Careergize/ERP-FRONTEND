import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { verifyFrontend } from './finance-preservation.mjs';

const baseline = JSON.parse(readFileSync(new URL('./fixtures/finance-gateway-baseline.json', import.meta.url)));
verifyFrontend(baseline.sha256);
const nav = readFileSync(new URL('../src/components/layout/AppShell.tsx', import.meta.url), 'utf8');
assert.equal(nav.slice(nav.indexOf('const NAV_ITEMS:'), nav.indexOf('export function AppShell()')).replaceAll('\r\n', '\n'), baseline.navigation_constants);
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
for (const route of baseline.existing_routes) assert.ok(app.includes(route), `Preserve route ${route}`);
assert.match(app, /path="\/finance\/erpnext" element={<FinanceRouteGuard>/);

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}
globalThis.localStorage = new MemoryStorage();
globalThis.sessionStorage = new MemoryStorage();
globalThis.window = new EventTarget();
globalThis.__financeUser = { id: 'fixture', name: 'Fixture', role: 'admin' };
globalThis.__financeState = { loading: false, error: false, access: null, retry() {} };
const server = await createServer({ configFile: false, resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  plugins: [{ name: 'finance-test-contexts', enforce: 'pre',
    resolveId(source, importer) {
      if (source.endsWith('/context/AuthContext')) return '\0finance-auth-fixture';
      if (source.endsWith('/context/FinanceAccessContext')) return '\0finance-access-fixture';
      if (source.endsWith('/context/SharedEntriesContext') && importer?.includes('AppShell')) return '\0finance-pending-fixture';
    },
    load(id) {
      if (id === '\0finance-auth-fixture') return 'export function useAuth(){return {user:globalThis.__financeUser,logout(){}}}';
      if (id === '\0finance-access-fixture') return 'export function useFinanceAccess(){return globalThis.__financeState}';
      if (id === '\0finance-pending-fixture') return 'export function useSharedEntriesPending(){return false}';
    },
  }], optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
  const { FinanceAccessBoundary } = await server.ssrLoadModule('/src/components/finance/FinanceRouteGuard.tsx');
  const state = { loading: false, error: false, access: null, retry() {} };
  const renderBoundary = overrides => renderToStaticMarkup(React.createElement(FinanceAccessBoundary, { state: { ...state, ...overrides } }, 'PROTECTED-CONTENT'));
  for (const overrides of [{ loading: true }, { error: true }, {}, { access: { entitled: false, available: true } }]) {
    assert.ok(!renderBoundary(overrides).includes('PROTECTED-CONTENT'));
  }
  assert.match(renderBoundary({ loading: true }), /Checking Finance access/);
  assert.match(renderBoundary({ error: true }), /Unable to check Finance access/);
  assert.match(renderBoundary({}), /Finance access denied/);
  assert.match(renderBoundary({ access: { entitled: true, available: false } }), /PROTECTED-CONTENT/);

  const { AppShell } = await server.ssrLoadModule('/src/components/layout/AppShell.tsx');
  const renderShell = () => {
    const original = console.error;
    console.error = (message, ...args) => {
      if (typeof message === 'string' && message.startsWith('Warning: useLayoutEffect does nothing on the server')) return;
      original(message, ...args);
    };
    try { return renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(AppShell))); }
    finally { console.error = original; }
  };
  for (const role of ['admin', 'accounts', 'receptionist', 'qc_inspector']) {
    globalThis.__financeUser.role = role;
    globalThis.__financeState = { ...state, access: { entitled: false, available: false } };
    assert.ok(!renderShell().includes('href="/finance/erpnext"'));
    globalThis.__financeState.access.entitled = true;
    assert.ok(renderShell().includes('href="/finance/erpnext"'));
    globalThis.__financeState.loading = true;
    assert.ok(!renderShell().includes('href="/finance/erpnext"'));
  }
  globalThis.__financeState = { ...state, access: { entitled: true, available: false } };
  const { ERPNextFinanceDashboard } = await server.ssrLoadModule('/src/pages/ERPNextFinanceDashboard.tsx');
  const shell = renderToStaticMarkup(React.createElement(ERPNextFinanceDashboard));
  assert.match(shell, /Finance unavailable/);
  assert.match(shell, /Check connection status/);
  assert.ok(!shell.includes('<form'));
  assert.ok(!shell.includes('Awaiting CA configuration and approval'));
  const { FinanceReadinessPanel } = await server.ssrLoadModule('/src/components/finance/FinanceReadinessPanel.tsx');
  const { FinanceSetupGuide } = await server.ssrLoadModule('/src/components/finance/FinanceSetupGuide.tsx');
  const safeStatus = { available: false, posting_enabled: false, accounting_setup: 'not_assessed', read_only: true, reason: 'frappe_sso_not_configured' };
  for (const connection of ['authenticated', 'not_configured', 'permission_denied', 'unavailable', 'timeout', 'invalid_response']) {
    const panel = renderToStaticMarkup(React.createElement(FinanceReadinessPanel, { status: { ...safeStatus, connection }, busy: false, error: '', onCheck() {} }));
    assert.match(panel, /Financial posting is disabled/);
    assert.ok(!panel.includes('Awaiting CA configuration and approval'));
    const guide = renderToStaticMarkup(React.createElement(FinanceSetupGuide, { connectivityVerified: connection === 'authenticated' }));
    assert.equal(guide.includes('Awaiting CA configuration and approval'), connection === 'authenticated');
    if (connection === 'authenticated') {
      assert.match(guide, /Accounting setup has not been assessed/);
      assert.ok(!guide.includes('<button') && !guide.includes('<form'));
    }
  }

  const { api } = await server.ssrLoadModule('/src/lib/api.ts');
  const { loadFinanceAccess, loadFinanceStatus } = await server.ssrLoadModule('/src/lib/financeGateway.ts');
  const calls = [];
  const respond = (data, status = 200) => async config => { calls.push(config); return { config, data, status, statusText: 'fixture', headers: {} }; };
  api.defaults.adapter = respond({ finance: { entitled: true, available: false } });
  assert.deepEqual(await loadFinanceAccess(), { entitled: true, available: false });
  api.defaults.adapter = respond({ finance: { entitled: 'true', available: true } });
  await assert.rejects(loadFinanceAccess());
  api.defaults.adapter = respond({ ...safeStatus, connection: 'not_configured' }, 503);
  assert.equal((await loadFinanceStatus()).available, false);
  api.defaults.adapter = respond({ ...safeStatus, connection: 'authenticated' });
  assert.equal((await loadFinanceStatus()).accounting_setup, 'not_assessed');
  for (const data of [{ ...safeStatus, available: true, connection: 'authenticated' },
    { ...safeStatus, posting_enabled: true, connection: 'authenticated' },
    { ...safeStatus, accounting_setup: 'approved', connection: 'authenticated' },
    { ...safeStatus, connection: 'unknown' }, { available: false, read_only: true, connection: 'authenticated' }]) {
    api.defaults.adapter = respond(data);
    await assert.rejects(loadFinanceStatus());
  }
  api.defaults.adapter = respond({ ...safeStatus, connection: 'authenticated' }, 503);
  await assert.rejects(loadFinanceStatus());
  api.defaults.adapter = respond({ ...safeStatus, connection: 'not_configured' }, 200);
  await assert.rejects(loadFinanceStatus());
  assert.ok(calls.every(call => call.method === 'get' && ['/auth/applications/', '/finance/status/'].includes(call.url)));
  console.log('PASS: preservation hashes; all existing routes/navigation; denied/loading/error guards; entitlement-only navigation for Admin/Accounts/Sales/QC; unavailable shell; validated read-only gateway requests. SSR fixtures, no live Frappe calls.');
} finally { await server.close(); }
