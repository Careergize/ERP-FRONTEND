import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';

const authModule = `import React,{createContext,useContext,useState} from 'react';
const C=createContext(null);export function FixtureAuth({children}){const [user,setUser]=useState({id:'first',name:'Fixture',role:'admin'});window.setFinanceUser=setUser;return <C.Provider value={{user,logout(){setUser(null)}}}>{children}</C.Provider>}export function useAuth(){return useContext(C)}`;
const entry = `import React from 'react';import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route} from 'react-router-dom';import {FixtureAuth} from '/__finance-auth.tsx';
import {FinanceAccessProvider} from '/src/context/FinanceAccessContext';
import {FinanceRouteGuard} from '/src/components/finance/FinanceRouteGuard';
import {ERPNextFinanceDashboard} from '/src/pages/ERPNextFinanceDashboard';
import {AppShell} from '/src/components/layout/AppShell';import {api} from '/src/lib/api';import '/src/index.css';
import {AxiosError} from 'axios';
sessionStorage.setItem('navapack_access','synthetic-token-not-a-real-jwt');
window.fixture={entitled:true,available:false,fail:false,delay:0,statusDelay:0,status:'not_configured',calls:[]};
api.defaults.adapter=async config=>{const f=window.fixture;f.calls.push(config.url);if(config.method!=='get')throw Error('Write request forbidden');
let data,status=200;if(config.url==='/auth/applications/'){data={finance:{entitled:f.entitled,available:f.available}};const fail=f.fail;await new Promise(r=>setTimeout(r,f.delay));if(fail)throw new AxiosError('fixture offline','ERR_NETWORK',config);}
else if(config.url==='/finance/status/'){const mode=f.status;await new Promise(r=>setTimeout(r,f.statusDelay));if(mode==='forbidden')throw new AxiosError('SECRET-MUST-NOT-RENDER','ERR_BAD_REQUEST',config,null,{status:403,data:{secret:'SECRET-MUST-NOT-RENDER'}});status=mode==='authenticated'?200:503;data={available:false,posting_enabled:false,accounting_setup:'not_assessed',read_only:true,reason:'frappe_sso_not_configured',connection:mode};}
else throw Error('Unexpected API request '+config.url);return {config,status,statusText:'fixture',headers:{},data};};
createRoot(document.getElementById('root')).render(<FixtureAuth><FinanceAccessProvider><MemoryRouter initialEntries={['/finance/erpnext']}><Routes><Route element={<AppShell/>}><Route path="/finance/erpnext" element={<div id="finance-content"><FinanceRouteGuard><ERPNextFinanceDashboard/></FinanceRouteGuard></div>}/></Route></Routes></MemoryRouter></FinanceAccessProvider></FixtureAuth>);`;

const server = await createServer({ server: { port: 0, host: '127.0.0.1', hmr: false }, optimizeDeps: { noDiscovery: true, entries: [], include: ['react', 'react-dom/client', 'react-router-dom', 'axios', 'lucide-react'] }, plugins: [{ name: 'finance-browser-fixtures', enforce: 'pre',
  resolveId(source, importer) {
    if (source.endsWith('/context/AuthContext') || (source === './AuthContext' && importer?.includes('FinanceAccessContext'))) return '/__finance-auth.tsx';
    if (source.endsWith('/context/SharedEntriesContext') && importer?.includes('AppShell')) return '\0finance-pending';
    if (source === '/__finance-auth.tsx' || source === '/__finance-entry.tsx') return source;
  },
  load(id) {
    if (id === '/__finance-auth.tsx') return authModule;
    if (id === '/__finance-entry.tsx') return entry;
    if (id === '\0finance-pending') return 'export function useSharedEntriesPending(){return false}';
  },
  configureServer(vite) { vite.middlewares.use(async (req, res, next) => {
    if (req.url !== '/__finance-gateway') return next();
    res.setHeader('Content-Type', 'text/html');
    res.end(await vite.transformIndexHtml('/__finance-gateway', '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/__finance-entry.tsx"></script></body></html>'));
  }); },
}] });
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
  const refresh = () => evaluate("window.dispatchEvent(new Event('focus'))");
  const clickStatus = () => evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Check connection status').click()");
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: server.resolvedUrls.local[0] + '__finance-gateway' });
  await wait("document.querySelector('#finance-content')?.textContent.includes('Finance unavailable')");
  assert.equal(await evaluate("window.fixture.calls.filter(c=>c==='/finance/status/').length"), 0, 'No automatic upstream diagnostics');
  assert.ok(await evaluate("!!document.querySelector('a[href=\"/finance/erpnext\"]')"));
  assert.equal(await evaluate("document.body.textContent.includes('Awaiting CA configuration and approval')"), false);
  await clickStatus(); await wait("document.body.textContent.includes('server connection is not configured')");
  assert.equal(await evaluate("document.body.textContent.includes('Awaiting CA configuration and approval')"), false);
  await evaluate("window.fixture.status='authenticated'"); await clickStatus();
  await wait("document.body.textContent.includes('Awaiting CA configuration and approval')");
  assert.ok(await evaluate("document.body.textContent.includes('Accounting setup has not been assessed')"));
  await evaluate("window.fixture.status='timeout';window.fixture.statusDelay=500"); await clickStatus();
  await wait("document.body.textContent.includes('Checking the server connection')");
  assert.equal(await evaluate("document.body.textContent.includes('Awaiting CA configuration and approval')"), false);
  await wait("document.body.textContent.includes('did not respond in time')");
  assert.equal(await evaluate("document.body.textContent.includes('Awaiting CA configuration and approval')"), false);
  await evaluate("window.fixture.statusDelay=0");
  await evaluate("window.fixture.status='forbidden'"); await clickStatus();
  await wait("document.body.textContent.includes('do not have permission to inspect')");
  assert.equal(await evaluate("document.body.textContent.includes('SECRET-MUST-NOT-RENDER')"), false);
  await evaluate("window.fixture.fail=true"); await refresh();
  await wait("document.body.textContent.includes('Unable to check Finance access')");
  assert.equal(await evaluate("!!document.querySelector('a[href=\"/finance/erpnext\"]')"), false);
  await evaluate("window.fixture.fail=false;window.fixture.delay=500;[...document.querySelectorAll('button')].find(b=>b.textContent==='Retry access check').click()");
  await wait("document.body.textContent.includes('Checking Finance access')");
  await wait("document.querySelector('#finance-content')?.textContent.includes('Finance unavailable')");
  await evaluate("window.fixture.entitled=false;window.fixture.delay=0"); await refresh();
  await wait("document.body.textContent.includes('Finance access denied')");
  assert.equal(await evaluate("!!document.querySelector('a[href=\"/finance/erpnext\"]')"), false);
  await evaluate("window.fixture.entitled=true;window.fixture.delay=400"); await refresh();
  await wait("document.body.textContent.includes('Checking Finance access')");
  await evaluate("window.fixture.entitled=false;window.fixture.delay=0;window.setFinanceUser({id:'second',name:'Second',role:'accounts'})");
  await wait("document.body.textContent.includes('Finance access denied')");
  await evaluate("new Promise(r=>setTimeout(r,600))");
  assert.equal(await evaluate("!!document.querySelector('a[href=\"/finance/erpnext\"]')"), false, 'Late first-user grant must be discarded');
  await evaluate("window.fixture.entitled=true;window.fixture.available=true"); await refresh();
  await wait("document.querySelector('#finance-content')?.textContent.includes('Finance unavailable')");
  assert.ok(await evaluate("document.body.textContent.includes('Financial posting is disabled')"));
  assert.equal(await evaluate("document.body.textContent.includes('Awaiting CA configuration and approval')"), false);
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.ok(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'));
  if (process.env.FINANCE_SCREENSHOT) await writeFile(process.env.FINANCE_SCREENSHOT, Buffer.from((await cdp('Page.captureScreenshot', { captureBeyondViewport: true })).data, 'base64'));
  await evaluate("window.setFinanceUser(null)");
  await wait("document.body.textContent.includes('Finance access denied')");
  console.log('PASS: Edge desktop/mobile shell, denied/loading/error/retry states, diagnostic 503/403 sanitization, no automatic diagnostics, revocation on focus, stale user-response cancellation, logout and unavailable even if fixture advertises availability. Synthetic JWT/API fixtures only.');
} finally {
  ws?.close(); browser?.kill(); await server.close();
  // Resolve and verify the disposable profile before a recursive removal.
  assert.equal(resolve(dirname(profile)), resolve(tmpdir()));
  await new Promise(resolve => setTimeout(resolve, 300));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
}
