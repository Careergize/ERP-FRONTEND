// Task 01: mocked adapter characterization; no backend calls or business changes.
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}
globalThis.localStorage = new MemoryStorage();
globalThis.sessionStorage = new MemoryStorage();
globalThis.window = new EventTarget();
const server = await createServer({ configFile: false,
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
  const { api } = await server.ssrLoadModule('/src/lib/api.ts');
  const { workflowRequest } = await server.ssrLoadModule('/src/lib/productionWorkflowApi.ts');
  const { postRawMovement } = await server.ssrLoadModule('/src/lib/rawInventoryApi.ts');
  const calls = [];
  // Every request from these adapters is intercepted before any transport executes.
  api.defaults.adapter = async config => {
    calls.push({ url: config.url, method: config.method, data: config.data, timeout: config.timeout });
    return { config, data: config.method === 'get' ? [] : JSON.parse(config.data), status: 200, statusText: 'OK', headers: {} };
  };
  assert.deepEqual(await workflowRequest('orders/'), []);
  assert.deepEqual(calls[0], { url: '/production-workflow/orders/', method: 'get', data: undefined, timeout: 15000 });
  const order = { creationKey: crypto.randomUUID(), items: [{ id: 'stock-line' }, { id: 'manufacturing-line' }] };
  assert.deepEqual(await workflowRequest('orders/', order), order);
  assert.equal(calls[1].timeout, 20000);
  assert.equal(calls[1].url, '/production-workflow/orders/');
  const movement = { id: crypto.randomUUID(), materialId: 'synthetic', unit: 'kg', quantity: 1, movementType: 'OUT' };
  await postRawMovement(movement);
  await postRawMovement(movement);
  assert.equal(calls[2].url, '/raw-inventory/movements/');
  assert.equal(calls[2].data, calls[3].data, 'Adapter preserves caller request UUID and payload on retry');
  api.defaults.adapter = async () => { throw { response: { status: 409, data: { detail: 'Reload before issue.' } } }; };
  await assert.rejects(workflowRequest('jobs/1/issue/', {}), error => {
    assert.equal(error.message, JSON.stringify({ detail: 'Reload before issue.' }));
    // Current structured status loss is evidence for planning, not a future contract.
    assert.equal(error.response, undefined);
    return true;
  });
  console.log('PASS: baseline adapter paths, envelopes, stable request payload and current error handling (5 groups).');
} finally {
  await server.close();
}
