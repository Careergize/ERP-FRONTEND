import assert from 'node:assert/strict';
import { preview } from 'vite';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { finalRoutes } from './check-finance-final-browser.mjs';

const build = resolve('dist-finance-demo');
const html = await readFile(join(build, 'index.html'), 'utf8');
assert.match(html, /connect-src 'none'/);
assert.doesNotMatch(html, /fonts\.google|src\/main\.tsx/);
for (const name of await readdir(join(build, 'assets'))) {
  if (!name.endsWith('.js')) continue;
  const source = await readFile(join(build, 'assets', name), 'utf8');
  assert.doesNotMatch(source, /35\.175\.179\.96|navapack_access|navapack_refresh|FINANCE_FRAPPE_API|\/auth\/login\/|\/api\/resource\//);
}
const server = await preview({ configFile: 'vite.finance-demo.config.ts',
  preview: { host: '127.0.0.1', port: 0 } });
const profile = await mkdtemp(join(tmpdir(), 'navapack-static-demo-'));
let browser, ws;
try {
  browser = spawn(process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    ['--headless', '--disable-gpu', '--remote-debugging-port=0', '--no-first-run', `--user-data-dir=${profile}`, 'about:blank'],
    { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  const endpoint = await new Promise((resolveEndpoint, reject) => {
    let logs = ''; const timer = setTimeout(() => reject(Error('Browser startup timeout')), 15000);
    browser.stderr.on('data', chunk => { logs += chunk; const match = logs.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) { clearTimeout(timer); resolveEndpoint(match[1]); } });
    browser.on('error', error => { clearTimeout(timer); reject(error); });
  });
  ws = new WebSocket(endpoint);
  await new Promise((opened, reject) => { ws.addEventListener('open', opened, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  let id = 0; const pending = new Map();
  ws.addEventListener('message', event => {
    const message = JSON.parse(String(event.data)), request = pending.get(message.id);
    if (request) { clearTimeout(request.timer); pending.delete(message.id);
      message.error ? request.reject(Error(message.error.message)) : request.resolve(message.result); }
  });
  const send = (method, params = {}, sessionId) => new Promise((resolveResult, reject) => {
    const requestId = ++id, timer = setTimeout(() => { pending.delete(requestId); reject(Error(method+' timeout')); }, 10000);
    pending.set(requestId, { resolve: resolveResult, reject, timer });
    ws.send(JSON.stringify({ id: requestId, method, params, sessionId }));
  });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const cdp = (method, params = {}) => send(method, params, sessionId);
  const evaluate = async expression => {
    const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const wait = async expression => {
    const deadline = Date.now()+15000;
    while (Date.now()<deadline) { if (await evaluate(expression)) return; await new Promise(r => setTimeout(r, 75)); }
    throw Error('Timed out: '+expression+'; '+await evaluate('document.body.innerText'));
  };
  const requests = [], errors = [];
  ws.addEventListener('message', event => {
    const message = JSON.parse(String(event.data)); if (message.sessionId !== sessionId) return;
    if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  });
  await cdp('Network.enable'); await cdp('Runtime.enable');
  const origin = server.resolvedUrls.local[0];
  await cdp('Page.navigate', { url: origin+'finance/preview/dashboard' });
  await wait("document.body.textContent.includes('Open Finance UI preview')");
  await evaluate("sessionStorage.setItem('navapack_access','demo-sentinel')");
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Open Finance UI preview').click()");
  for (const [path, title] of finalRoutes) {
    await wait("!!document.querySelector('nav')");
    await evaluate(`document.querySelector('a[href="/finance/preview/${path}"]').click()`);
    await wait(`document.querySelector('h1')?.textContent===${JSON.stringify(title)}`);
    for (const width of [1440,390]) {
      await cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width<768 });
      assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'), `${path}: no overflow`);
    }
    assert.deepEqual(await evaluate("[...document.querySelectorAll('button')].filter(b=>/^(post\\b|approve\\b|activate\\b|synchronize\\b|send email|financial export)/i.test(b.textContent.trim())&&!b.disabled).map(b=>b.textContent)"), []);
  }
  assert.equal(await evaluate("sessionStorage.getItem('navapack_access')"), 'demo-sentinel');
  assert.deepEqual(errors, []);
  assert.deepEqual(requests.filter(url => /\/api\//.test(url) ||
    (!url.startsWith(origin) && !url.startsWith('data:image/'))), [], 'No APIs or external requests');
  await cdp('Page.reload');
  await wait("document.body.textContent.includes('Open Finance UI preview')");
  console.log('PASS: standalone production demo; 22 routes, desktop/mobile, reset on reload, disabled financial actions, no API/external requests, token untouched.');
} finally {
  ws?.close(); browser?.kill(); server.httpServer.closeAllConnections();
  await new Promise(r => server.httpServer.close(r));
  assert.equal(resolve(dirname(profile)), resolve(tmpdir()));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
