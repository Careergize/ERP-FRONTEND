import assert from 'node:assert/strict';
import { createServer, loadEnv } from 'vite';
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
  const { saveTokens } = await server.ssrLoadModule('/src/lib/authSession.ts');
  const { loadWorkflowCollection } = await server.ssrLoadModule('/src/lib/productionWorkflowApi.ts');
  saveTokens('integration-test-access', 'integration-test-refresh', false);
  const calls = [];
  api.defaults.adapter = async config => {
    calls.push(config);
    if (config.url.endsWith('/machines/')) throw { response: { status: 404, data: 'Machine service unavailable' } };
    return { config, status: 200, statusText: 'OK', headers: {}, data: [{ id: config.url, revision: 2 }] };
  };
  const [models, processes, machines] = await Promise.allSettled([
    loadWorkflowCollection('models/'), loadWorkflowCollection('processes/'), loadWorkflowCollection('machines/'),
  ]);
  assert.equal(models.status, 'fulfilled');
  assert.equal(processes.status, 'fulfilled');
  assert.equal(machines.status, 'rejected');
  assert.equal(models.value[0].revision, 2);
  assert.deepEqual(calls.map(c => c.url), [
    '/production-workflow/models/', '/production-workflow/processes/', '/production-workflow/machines/',
  ]);
  assert.ok(calls.every(c => c.method === 'get' && c.headers.Authorization === 'Bearer integration-test-access'));
  api.defaults.adapter = async config => ({ config, status: 200, statusText: 'OK', headers: {}, data: '<html>Not an API collection</html>' });
  await assert.rejects(loadWorkflowCollection('models/'), /expected a collection/);
  api.defaults.adapter = async () => { throw { response: { status: 403, data: { detail: 'Permission denied' } } }; };
  await assert.rejects(loadWorkflowCollection('processes/'), /Permission denied/);
  const dev = loadEnv('development', process.cwd());
  const production = loadEnv('production', process.cwd());
  if (dev.VITE_API_BASE_URL === 'http://127.0.0.1:8000/api') {
    assert.notEqual(production.VITE_API_BASE_URL, dev.VITE_API_BASE_URL, 'Development-only override must not leak into production');
  }
  console.log('PASS: independent master responses, JWT/method/path, invalid responses, permission failures and development-only configuration. Mock transport; no persistence claim.');
} finally {
  await server.close();
}
