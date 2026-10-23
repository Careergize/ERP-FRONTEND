import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
globalThis.sessionStorage = globalThis.localStorage;
globalThis.window = new EventTarget();
const server = await createServer({ configFile: false, resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } }, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function () { throw new Error('Outbound sockets blocked'); };
try {
  const { api } = await server.ssrLoadModule('/src/lib/api.ts');
  const { registerApi, registerError } = await server.ssrLoadModule('/src/lib/registerApi.ts');
  const { ItemRegisterPage } = await server.ssrLoadModule('/src/pages/Registers/ItemRegisterPage.tsx');
  const store = { spares: [], consumables: [] }, calls = [];
  let fail = false, release;
  api.defaults.adapter = async config => {
    calls.push(config);
    if (fail) throw new Error('Synthetic offline');
    const [, kind] = config.url.split('/');
    if (config.method === 'post') {
      await new Promise(resolve => { release = resolve; });
      const saved = { id: 'saved', ...JSON.parse(config.data) }; store[kind].push(saved);
      return { data: saved, status: 201, statusText: 'Created', headers: {}, config };
    }
    if (config.method === 'patch') { Object.assign(store[kind][0], JSON.parse(config.data)); return { data: store[kind][0], status: 200, headers: {}, config }; }
    return { data: { count: store[kind].length, next: null, previous: null, results: structuredClone(store[kind]) }, status: 200, headers: {}, config };
  };
  const draft = { code: 'S1', name: 'Synthetic', category: 'IMPORTED', unit: 'Each', minimum_stock: '0.000001', description: '', is_active: true };
  let confirmed = false;
  const pending = registerApi.save('spares', undefined, draft).then(row => { confirmed = true; return row; });
  while (!release) await new Promise(resolve => setImmediate(resolve));
  assert.equal(confirmed, false); assert.equal(store.spares.length, 0);
  release(); const saved = await pending; assert.equal(saved.minimum_stock, '0.000001');
  assert.equal((await registerApi.list('spares', { category: 'IMPORTED', unit: 'Each', search: 'S1' })).results[0].id, 'saved');
  assert.deepEqual(calls.at(-1).params, { category: 'IMPORTED', unit: 'Each', search: 'S1', page: 1 });
  assert.equal((await registerApi.list('consumables', {})).count, 0);
  await registerApi.save('spares', saved.id, { ...draft, name: 'Edited' });
  assert.equal((await registerApi.list('spares', {})).results[0].name, 'Edited');
  fail = true;
  await assert.rejects(registerApi.list('spares', {}), /Synthetic offline/);
  await assert.rejects(registerApi.save('consumables', undefined, draft), /Synthetic offline/);
  assert.match(registerError({ response: { status: 403 } }), /not authorized/);
  const consumables = renderToStaticMarkup(React.createElement(ItemRegisterPage, { kind: 'consumables' }));
  assert.match(consumables, /Add Consumable/); assert.match(consumables, /Loading consumables/);
  for (const forbidden of ['Stock IN', 'Stock OUT', 'Opening Stock', 'Current Stock', 'Movements', 'Below Minimum']) assert.ok(!consumables.includes(forbidden), forbidden);
  const spares = renderToStaticMarkup(React.createElement(ItemRegisterPage, { kind: 'spares' }));
  assert.match(spares, /Add Spare/); assert.match(spares, /Stock IN/); assert.match(spares, /Stock OUT/); assert.match(spares, /unavailable/);
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const sidebar = await readFile(new URL('../src/components/layout/AppShell.tsx', import.meta.url), 'utf8');
  for (const path of ['/spares', '/consumables']) { assert.ok(app.includes(`path="${path}"`)); assert.ok(sidebar.includes(`to: "${path}"`)); }
  console.log('PASS: adapter persistence simulation, confirmed saves, decimal strings, edits, filters, errors, initial UI and routes. Browser interaction not covered.');
} finally { net.Socket.prototype.connect = connect; await server.close(); }
