import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
globalThis.sessionStorage = globalThis.localStorage;
// The context is client-only; supply its unloaded server snapshot in this test
// transform. Production code and client subscriptions remain unchanged.
const server = await createServer({ configFile: false, plugins: [{ name: 'test-unloaded-shared-snapshot', transform(code, id) {
  if (id.replaceAll('\\', '/').endsWith('/context/SharedEntriesContext.tsx')) return code.replace(/useSyncExternalStore\(([^;\n]*)\);/g, 'useSyncExternalStore($1, () => 0);');
} }], resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } }, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function () { throw new Error('Outbound sockets blocked'); };
try {
  const { InhouseWaste } = await server.ssrLoadModule('/src/pages/Recycling/InhouseWaste.tsx');
  const { RecyclingPage } = await server.ssrLoadModule('/src/pages/Recycling/RecyclingPage.tsx');
  const html = renderToStaticMarkup(React.createElement(InhouseWaste));
  assert.match(html, /Module 4 · In-house Waste Delivery/);
  assert.match(html, /Daily waste deliveries in kg/);
  assert.match(html, /Loading waste deliveries/);
  assert.match(html, /disabled=""[^>]*>Add daily delivery/);
  assert.match(html, /disabled=""[^>]*>Download Excel/);
  const selected = renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ['/recycling?module=4'] }, React.createElement(RecyclingPage)));
  assert.match(selected, /aria-current="page"[^>]*><span[^>]*>Module 4/);
  assert.ok(!selected.includes('This module’s workflow will be added'));
  console.log('PASS: Module 4 selection, in-house waste register, loading state and disabled controls before backend access loads. Browser interaction not covered.');
} finally { net.Socket.prototype.connect = connect; await server.close(); }
