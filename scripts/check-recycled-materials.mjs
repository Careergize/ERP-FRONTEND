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
  const { RecycledMaterials } = await server.ssrLoadModule('/src/pages/Recycling/RecycledMaterials.tsx');
  const { RecyclingPage } = await server.ssrLoadModule('/src/pages/Recycling/RecyclingPage.tsx');
  const html = renderToStaticMarkup(React.createElement(RecycledMaterials));
  assert.match(html, /Module 2 · Recycled Materials/);
  assert.match(html, /1 bag = 40 kg/);
  assert.match(html, /Loading saved recycled materials/);
  assert.match(html, /HDPE Clear Jerrycan/);
  assert.match(html, /LDPE Blue \(Jumbo Cap\)/);
  assert.match(html, /disabled=""[^>]*>Add bag entry/);
  const selected = renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ['/recycling?module=2'] }, React.createElement(RecyclingPage)));
  assert.match(selected, /aria-current="page"[^>]*><span[^>]*>Module 2/);
  assert.ok(!selected.includes('This module’s workflow will be added'));
  console.log('PASS: Module 2 selection, reference materials, bag conversion, loading state and disabled entry controls before backend access loads. Browser interaction not covered.');
} finally { net.Socket.prototype.connect = connect; await server.close(); }
