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
  const { LabourJobs } = await server.ssrLoadModule('/src/pages/Recycling/LabourJobs.tsx');
  const { RecyclingPage } = await server.ssrLoadModule('/src/pages/Recycling/RecyclingPage.tsx');
  const html = renderToStaticMarkup(React.createElement(LabourJobs));
  assert.match(html, /Module 3 · Labour Job/);
  assert.match(html, /Customer material IN and OUT, in kg/);
  assert.match(html, /Loading saved entries/);
  assert.match(html, /disabled=""[^>]*>Add entry/);
  assert.match(html, /disabled=""[^>]*>Download Excel/);
  const selected = renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ['/recycling?module=3'] }, React.createElement(RecyclingPage)));
  assert.match(selected, /aria-current="page"[^>]*><span[^>]*>Module 3/);
  assert.ok(!selected.includes('This module’s workflow will be added'));
  console.log('PASS: Module 3 selection, labour job register, loading state and disabled controls before backend access loads. Browser interaction not covered.');
} finally { net.Socket.prototype.connect = connect; await server.close(); }
