import assert from 'node:assert/strict';
import { checkFinalBrowser, finalRoutes } from './check-finance-final-browser.mjs';
import { checkAdministrationBrowser } from './check-finance-administration-browser.mjs';
import { checkReportBrowser } from './check-finance-reports-browser.mjs';
import { checkTransactionBrowser } from './check-finance-transactions-browser.mjs';
import { readFileSync } from 'node:fs';
import { createServer, preview } from 'vite';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile, mkdir, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';

const evidence = join(tmpdir(), 'navapack-finance-preview-batch6');
await mkdir(evidence, { recursive: true });
const options = enabled => ({ define: { 'import.meta.env.VITE_FINANCE_UI_PREVIEW': JSON.stringify(enabled ? 'true' : 'false') }, server: { port: 0, host: '127.0.0.1', hmr: false }, optimizeDeps: { noDiscovery: true, entries: [], include: ['react', 'react-dom/client', 'react-router-dom', 'axios', 'lucide-react'] } });
const server = await createServer(options(true));
let disabledServer, productionServer;
let browser, ws;
const profile = await mkdtemp(join(tmpdir(), 'finance-gateway-browser-'));
try {
  await server.listen();
  browser = spawn(process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    ['--headless', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
    { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  const endpoint = await new Promise((resolve, reject) => {
    let logs = ''; const timer = setTimeout(() => reject(Error('Browser startup timeout')), 15000);
    browser.stderr.on('data', chunk => { logs += chunk; const match = logs.match(/DevTools listening on (ws:\/\/\S+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
    browser.on('error', error => { clearTimeout(timer); reject(error); });
  });
  ws = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', () => reject(Error('Browser CDP loopback connection unavailable')), { once: true }); });
  let id = 0; const pending = new Map();
  ws.addEventListener('message', event => { const message = JSON.parse(String(event.data)); const request = pending.get(message.id); if (request) { clearTimeout(request.timer); pending.delete(message.id); message.error ? request.reject(Error(message.error.message)) : request.resolve(message.result); } });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const requestId = ++id; const timer = setTimeout(() => { pending.delete(requestId); reject(Error('CDP timeout: ' + method)); }, 10000); pending.set(requestId, { resolve, reject, timer }); ws.send(JSON.stringify({ id: requestId, method, params, sessionId })); });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const cdp = (method, params = {}) => send(method, params, sessionId);
  const evaluate = async expression => { const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails)); return result.result.value; };
  const wait = async expression => { const deadline = Date.now() + 15000; while (Date.now() < deadline) { if (await evaluate(expression)) return; await new Promise(resolve => setTimeout(resolve, 75)); } throw Error('Timed out: ' + expression + '; ' + await evaluate('document.body.innerText')); };

  const requests = [], errors = [];
  ws.addEventListener('message', event => {
    const message = JSON.parse(String(event.data));
    if (message.sessionId !== sessionId) return;
    if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map(a => a.value ?? a.description).join(' '));
  });
  await cdp('Network.enable'); await cdp('Runtime.enable');
  await cdp('Network.setBlockedURLs', { urls: ['*/api/*', 'https://*'] });
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const origin = server.resolvedUrls.local[0];
  await cdp('Page.navigate', { url: origin + 'finance/preview/dashboard' });
  await wait("document.body.textContent.includes('Open Finance UI preview')");
  assert.equal(await evaluate("document.body.textContent.includes('UGX')"), false, 'Explicit entry required');
  await evaluate("sessionStorage.setItem('navapack_access','synthetic-sentinel');localStorage.setItem('finance-entitled','unchanged-sentinel')");
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Open Finance UI preview').click()");
  await wait("document.querySelector('h1')?.textContent==='Finance Dashboard'");
  await wait("document.body.textContent.includes('13,500')");
  assert.equal(await evaluate("document.body.textContent.includes('ERPNext')"), false);
  assert.ok(await evaluate("document.body.textContent.includes('Demo Data — preview only')"));
  for (const label of ['Post transaction', 'Approve', 'Activate Finance', 'Send email', 'Financial export']) {
    assert.ok(await evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.startsWith(${JSON.stringify(label)})&&b.disabled)`));
  }
  await evaluate("document.querySelector('select').value='three';document.querySelector('select').dispatchEvent(new Event('change',{bubbles:true}))");
  await wait("document.body.textContent.includes('11,100')");
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Next').click()");
  await wait("document.body.textContent.includes('Page 2 of 2')");
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Previous').click()");
  await wait("document.body.textContent.includes('Page 1 of 2')");
  // Native setter exercises controlled React input behavior.
  await evaluate("(()=>{const input=document.querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'no-such-demo-record');input.dispatchEvent(new Event('input',{bubbles:true}))})()");
  await wait("document.body.textContent.includes('No demo transactions match')");
  await evaluate("(()=>{const input=document.querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'');input.dispatchEvent(new Event('input',{bubbles:true}))})()");
  await wait("!!document.querySelector('button[aria-label=\"View DEMO-COST-2026-11-04\"]')");
  await evaluate("(()=>{const button=document.querySelector('button[aria-label=\"View DEMO-COST-2026-11-04\"]');button.focus();button.click()})()");
  await wait("document.querySelector('dialog')?.open");
  assert.ok(await evaluate("document.querySelector('dialog').contains(document.activeElement)"));
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await wait("!document.querySelector('dialog')");
  assert.equal(await evaluate("document.activeElement?.getAttribute('aria-label')"), 'View DEMO-COST-2026-11-04');
  await evaluate("[...document.querySelectorAll('a')].find(a=>a.textContent==='Recent transactions').click()");
  await wait("location.hash==='#transactions'");
  await evaluate("document.querySelector('main').scrollTop=0;window.scrollTo(0,0)");
  await writeFile(join(evidence, 'desktop.png'), Buffer.from((await cdp('Page.captureScreenshot', { captureBeyondViewport: false })).data, 'base64'));
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate("location.hash='overview';document.getElementById('overview').scrollIntoView()");
  assert.ok(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'), 'No mobile document overflow');
  await writeFile(join(evidence, 'mobile.png'), Buffer.from((await cdp('Page.captureScreenshot', { captureBeyondViewport: true })).data, 'base64'));
  await evaluate("document.querySelector('details:last-child').open=true");
  await evaluate("(()=>{const select=document.querySelector('details:last-child select');select.value='error';select.dispatchEvent(new Event('change',{bubbles:true}))})()");
  await wait("document.body.textContent.includes('Simulated preview error')");
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Reset local preview').click()");
  await wait("document.querySelector('h1')?.textContent==='Finance Dashboard'");
  await wait("document.body.textContent.includes('13,500')");
  assert.equal(await evaluate("sessionStorage.getItem('navapack_access')"), 'synthetic-sentinel');
  assert.equal(await evaluate("localStorage.getItem('finance-entitled')"), 'unchanged-sentinel');
  // Batch 2: exercise every master screen in the actual isolated application.
  const clickText = text => evaluate(`[...document.querySelectorAll('a,button')].find(b=>b.textContent===${JSON.stringify(text)}).click()`);
  const fill = (label, value) => evaluate(`(()=>{const label=[...document.querySelectorAll('dialog label,main label')].find(l=>l.firstChild?.textContent===${JSON.stringify(label)});const input=label.querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}))})()`);
  const selectLabel = (label, value) => evaluate(`(()=>{const label=[...document.querySelectorAll('dialog label,main label')].find(l=>l.firstChild?.textContent===${JSON.stringify(label)});const input=label.querySelector('select');input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  for (const [path, title, nav] of [['setup','Accounting Setup','Accounting Setup'],['accounts','Chart of Accounts','Chart of Accounts'],['taxes','Tax Configuration','Tax Configuration'],['parties','Customer and Supplier Accounting','Customer & Supplier Accounting'],['banks','Banking Masters','Banking Masters']]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await evaluate(`document.querySelector('a[href="/finance/preview/${path}"]').click()`);
    await wait(`document.querySelector('h1')?.textContent===${JSON.stringify(title)}`);
    await writeFile(join(evidence, `${path}-desktop.png`), Buffer.from((await cdp('Page.captureScreenshot', { captureBeyondViewport: true })).data, 'base64'));
    await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    assert.ok(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'), `${path}: mobile overflow`);
    await writeFile(join(evidence, `${path}-mobile.png`), Buffer.from((await cdp('Page.captureScreenshot', { captureBeyondViewport: true })).data, 'base64'));
    if (path === 'setup') {
      await fill('Company name',''); await clickText('Save local setup draft');
      await wait("document.querySelector('[role=alert]')?.textContent.includes('Company')");
      await fill('Company name','Sample draft company'); await clickText('Save local setup draft');
      await wait("document.body.textContent.includes('Setup draft updated in memory only.')");
    } else {
      await clickText('Add local draft'); await wait("document.querySelector('dialog')?.open");
      await clickText('Save local draft'); await wait("document.querySelector('[role=alert]')?.textContent.includes('Name is required')");
      await fill('Name', `Sample ${path} draft`);
      if (path === 'accounts') { await fill('Account code','1300'); await selectLabel('Parent account','DEMO-A1'); }
      else { await selectLabel('Ledger mapping', path === 'taxes' ? 'DEMO-A6' : path === 'parties' ? 'DEMO-A2' : 'DEMO-A3'); }
      if (path === 'taxes') { await fill('Illustrative rate (%)','101'); await fill('Tax template name','Sample draft template'); await clickText('Save local draft'); await wait("document.querySelector('[role=alert]')?.textContent.includes('between 0 and 100')"); await fill('Illustrative rate (%)','5'); }
      if (path === 'parties') { await fill('Credit days','-1'); await clickText('Save local draft'); await wait("document.querySelector('[role=alert]')?.textContent.includes('Credit days')"); await fill('Credit days','45'); }
      if (path === 'banks') { await fill('Fictional account reference (FICTIONAL-)','123'); await clickText('Save local draft'); await wait("document.querySelector('[role=alert]')?.textContent.includes('fictional reference')"); await fill('Fictional account reference (FICTIONAL-)','FICTIONAL-TEST'); }
      await clickText('Save local draft'); await wait("!document.querySelector('dialog')");
      await wait(`document.body.textContent.includes('Sample ${path} draft')`);
      await clickText(`Sample ${path} draft`.replace('Sample accounts draft','1300 · Sample accounts draft'));
      await wait("document.querySelector('dialog')?.open");
      await writeFile(join(evidence, `${path}-drawer-mobile.png`), Buffer.from((await cdp('Page.captureScreenshot', { captureBeyondViewport: true })).data, 'base64'));
      await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await wait("!document.querySelector('dialog')");
      await evaluate(`document.querySelector('button[aria-label="Edit Sample ${path} draft"]').click()`);
      await wait("document.querySelector('dialog')?.open");
      await fill('Name', `Sample ${path} edited`); await clickText('Save local draft');
      await wait("!document.querySelector('dialog')");
      await wait(`document.body.textContent.includes('Sample ${path} edited')`);
      await fill('Search masters', 'no-such-master');
      await wait("document.body.textContent.includes('No demo masters match')");
      await fill('Search masters', '');
      await selectLabel('Filter type', path === 'accounts' ? 'Liability' : path === 'taxes' ? 'Template' : path === 'parties' ? 'Supplier' : 'Savings');
      assert.equal(await evaluate(`document.body.textContent.includes('Sample ${path} edited')`), false);
      await selectLabel('Filter type', 'All');
    }
  }
  await evaluate("document.querySelector('a[href=\"/finance/preview/accounts\"]').click()");
  await wait("document.body.textContent.includes('Sample accounts edited')");
  await clickText('Reset preview'); await wait("!document.body.textContent.includes('Sample accounts edited')");
  await evaluate("document.querySelector('a[href=\"/finance/preview/setup\"]').click()");
  await wait("[...document.querySelectorAll('input')].some(i=>i.value==='Sample Packaging Co.')");
  await checkTransactionBrowser({ evaluate, wait, cdp, evidence });
  await checkReportBrowser({ evaluate, wait, cdp, evidence });
  await checkAdministrationBrowser({ evaluate, wait, cdp, evidence });
  await checkFinalBrowser({ evaluate, wait, cdp, evidence });
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Exit preview')).click()");
  await wait("document.body.textContent.includes('Open Finance UI preview')");
  await cdp('Page.reload');
  await wait("document.body.textContent.includes('Open Finance UI preview')");
  disabledServer = await createServer(options(false)); await disabledServer.listen();
  await cdp('Page.navigate', { url: disabledServer.resolvedUrls.local[0] + 'finance/preview/dashboard' });
  await wait("document.body.textContent.includes('Finance preview unavailable')");
  assert.equal(await evaluate("document.body.textContent.includes('Open Finance UI preview')"), false);
  const deniedRoutes = ['/finance/preview', ...finalRoutes.map(([path]) => '/finance/preview/'+path)];
  for (const path of deniedRoutes) { await cdp('Page.navigate', { url: disabledServer.resolvedUrls.local[0] + path.slice(1) }); await wait("document.body.textContent.includes('Finance preview unavailable')"); assert.equal(await evaluate("document.body.textContent.includes('Open Finance UI preview')"), false); }
  // Existing base './' needs host asset routing for deep production links.
  // Emulate that routing in this test only; never modify production configuration.
  productionServer = await preview({ preview: { port: 0, host: '127.0.0.1' }, plugins: [{
    name: 'test-production-deep-link-assets',
    configurePreviewServer(vite) { vite.middlewares.use((req, res, next) => {
      if (!deniedRoutes.includes(req.url)) return next();
      res.setHeader('Content-Type', 'text/html');
      res.end(readFileSync('dist/index.html', 'utf8').replace('<head>', '<head><base href="/">'));
    }); },
  }] });
  await cdp('Page.navigate', { url: productionServer.resolvedUrls.local[0] + 'finance/preview/dashboard' });
  await wait("document.body.textContent.includes('Finance preview unavailable')");
  assert.equal(await evaluate("document.body.textContent.includes('Open Finance UI preview')"), false);
  for (const path of deniedRoutes) { await cdp('Page.navigate', { url: productionServer.resolvedUrls.local[0] + path.slice(1) }); await wait("document.body.textContent.includes('Finance preview unavailable')"); assert.equal(await evaluate("document.body.textContent.includes('Open Finance UI preview')"), false); }
  for (const file of await readdir('dist/assets')) if (file.endsWith('.js')) {
    const source = await readFile(join('dist/assets', file), 'utf8');
    assert.ok(!source.includes('DEMO-COST-2026-11-04') && !source.includes('DEMO-FINV-S1') && !source.includes('DEMO-OP-SALES-01') && !source.includes('DEMO-REPORT-OPENING') && !source.includes('DEMO-STMT-CHARGE'), 'All preview fixtures excluded from production bundle');
  }
  assert.deepEqual(requests.filter(url => /\/api\//.test(url)), [], 'No API requests even with an existing token');
  assert.deepEqual(requests.filter(url => url.startsWith('http') && !url.startsWith('http://127.0.0.1:') && !url.startsWith('http://localhost:') && !url.startsWith('https://fonts.googleapis.com/') && !url.startsWith('https://fonts.gstatic.com/')), [], 'No unexpected external requests; existing shell font URLs are allowed');
  assert.deepEqual(errors, [], 'No runtime exceptions or console errors');
  await writeFile(join(evidence, 'isolation-production-audit.json'), JSON.stringify({ apiRequests: requests.filter(url => /\/api\//.test(url)), consoleErrors: errors, productionDeniedRoutes: deniedRoutes, flagOffDeniedRoutes: deniedRoutes, productionFixtureExclusion: true, tokenPreservation: true, previewDependenciesRejectTransportAndPersistence: true }, null, 2));
  console.log('PASS: explicit deny on all 22 Preview routes plus namespace root in flag-off and production modes; persisted zero-API and production audit.');
  console.log(`PASS: Batch 2 setup and all four masters: add/edit/validation/search/filter/details, cross-route draft retention/reset, desktop/mobile screenshots and overflow; explicit entry, actual App with zero API requests, dev flag off denied, production denied even when built with preview flag, production fixture exclusion, period/search/pagination, keyboard drawer/focus restoration, mobile overflow, reset/exit/reload, token preservation and disabled actions. Evidence: ${evidence}`);
} finally {
  ws?.close(); browser?.kill();
  await server.close(); await disabledServer?.close();
  await new Promise(resolve => productionServer ? productionServer.httpServer.close(resolve) : resolve());
  assert.equal(resolve(dirname(profile)), resolve(tmpdir()));
  await new Promise(resolve => setTimeout(resolve, 300));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
}
