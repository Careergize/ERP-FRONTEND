import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
  const { api } = await server.ssrLoadModule('/src/lib/api.ts');
  const { workflowRequest } = await server.ssrLoadModule('/src/lib/productionWorkflowApi.ts');
  const fail = (status, data) => { api.get = async () => { throw { response: { status, data } }; }; };
  fail(404, '<!doctype html><h1>Not Found</h1>');
  await assert.rejects(workflowRequest('order-options/'), error => error.message.includes('VITE_API_BASE_URL') && !error.message.includes('<'));
  fail(502, '<html>Bad gateway</html>');
  await assert.rejects(workflowRequest('order-options/'), error => error.message.includes('HTTP 502') && !error.message.includes('<html>'));
  fail(400, { detail: 'Select an active customer.' });
  await assert.rejects(workflowRequest('orders/'), /Select an active customer/);
  api.get = async () => ({ data: { customers: [], staff: [], models: [] } });
  assert.deepEqual(await workflowRequest('order-options/'), { customers: [], staff: [], models: [] });
  console.log('Production workflow error checks passed.');
} finally {
  await server.close();
}
