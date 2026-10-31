import assert from 'node:assert/strict';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const mocks={
 '@/context/AuthContext':`export const useAuth=()=>({user:{id:'1',role:'admin'}});`,
 '@/context/SharedEntriesContext':`export const useConfirmSharedSave=()=>async()=>{};export const useRefreshSharedEntry=()=>async key=>{window.__refreshed=key;};`,
 '@/context/CommercialContext':`export const useCommercial=()=>({company:{currency:'USD',taxRate:0,tradingName:'Synthetic seller',legalName:'Synthetic seller',address:'Seller address',tin:'TEST',email:'test@example.invalid',telephone:'TEST'}});`,
 '@/context/QuotationsContext':`export const useQuotations=()=>({create:()=>{throw Error('Must use approved order')}});`,
 '@/context/SalesOrdersContext':`import {fixture} from '/__dispatch-fixture';const reloadOrders=async()=>{};export const useSalesOrders=()=>({orders:[fixture.order],loading:false,loadError:'',reloadOrders});`,
 '@/context/InventoryContext':`import {fixture} from '/__dispatch-fixture';export const useInventory=()=>({finishedProducts:[fixture.product],finishedLoading:false,finishedError:'',reloadFinished:async()=>{},ledger:fixture.ledger,previewDispatchBatch:()=>{},dispatchBatch:(orderId,entries)=>{window.__dispatch={orderId,entries};}});`,
 '@/lib/productionWorkflowApi':`export const workflowRequest=async()=>({customers:[],staff:[]});`,
 '@/lib/api':`export const api={get:async()=>{if(window.__failBalance)throw {response:{data:{detail:'Balance service unavailable'}}};return {data:{partyName:'Synthetic customer',balance:'125.50',reportingCurrency:'USD',asOf:'2026-10-31',pendingPostings:0,cashAccounts:[{code:'1100',name:'Cash'},{code:'1210',name:'Mobile money'}]}};}};`
};
const server=await createServer({configFile:false,resolve:{alias:[...Object.keys(mocks).map(key=>({find:key,replacement:'\0dispatch-mock:'+key})),{find:'@',replacement:fileURLToPath(new URL('../src',import.meta.url))}]},optimizeDeps:{include:['react','react-dom/client','react-router-dom','lucide-react']},server:{host:'127.0.0.1',port:0},plugins:[react(),{
 name:'dispatch-sale-fixtures',enforce:'pre',
 resolveId(id){if(id.startsWith('\0dispatch-mock:'))return id;if(id in mocks)return '\0dispatch-mock:'+id;if(id==='/__dispatch-entry.tsx'||id==='/__dispatch-fixture')return '\0'+id;},
 load(id){
  if(id.startsWith('\0dispatch-mock:'))return mocks[id.slice('\0dispatch-mock:'.length)];
  if(id==='\0/__dispatch-fixture')return `import {FINISHED_GOODS} from '/src/lib/finishedGoodsData.ts';const product=FINISHED_GOODS.find(p=>p.openingStock!==null);export const fixture={product,ledger:{movements:[],allocations:[],dispatches:[]},order:{id:'wf-order-1',orderNumber:'SO-TEST',date:'2026-10-30',customerId:'db:1',customerName:'Synthetic customer',marketingPersonName:'Synthetic salesperson',customerType:'B2C',requisitionOrder:'',currency:'USD',taxRate:0,status:'Approved',salesOrderApproval:{approvedBy:'Manager'},items:[{id:'line-1',itemId:product.id,itemName:'Synthetic stock item',quantity:2,unit:product.unit,unitPrice:10,fulfillmentSource:'stock'}]}};`;
  if(id==='\0/__dispatch-entry.tsx')return `import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';import {StockOutSaleModal} from '/src/pages/Sales/StockOutSaleModal.tsx';import '/src/index.css';createRoot(document.getElementById('root')).render(React.createElement(MemoryRouter,null,React.createElement(StockOutSaleModal,{onClose:()=>{window.__closed=true;},onRecorded:()=>{window.__recorded=true;}})));`;
 },
 configureServer(vite){vite.middlewares.use(async(req,res,next)=>{if(req.url!='/__dispatch-check')return next();res.setHeader('Content-Type','text/html');res.end(await vite.transformIndexHtml('/__dispatch-check','<html><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module" src="/__dispatch-entry.tsx"></script></body></html>'));});}
}]});
let chrome,ws;const profile=await mkdtemp(join(tmpdir(),'dispatch-sale-browser-'));
try{
 await server.listen();const url=server.resolvedUrls.local[0]+'__dispatch-check';
 chrome=spawn(process.env.CHROME_PATH||'C:/Users/server/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',['--headless','--no-sandbox','--disable-gpu','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
 const endpoint=await new Promise((resolve,reject)=>{let logs='';const timer=setTimeout(()=>reject(new Error('Chromium startup timeout: '+logs)),15000);chrome.stderr.on('data',chunk=>{logs+=chunk;const match=logs.match(/DevTools listening on (ws:\/\/\S+)/);if(match){clearTimeout(timer);resolve(match[1]);}});chrome.on('error',reject);});
 ws=new WebSocket(endpoint);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 let id=0;const pending=new Map();ws.addEventListener('message',event=>{const data=JSON.parse(String(event.data));if(data.id&&pending.has(data.id)){const {resolve,reject,timer}=pending.get(data.id);clearTimeout(timer);pending.delete(data.id);data.error?reject(new Error(data.error.message)):resolve(data.result);}});
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const requestId=++id;const timer=setTimeout(()=>{pending.delete(requestId);reject(new Error('CDP timeout: '+method));},10000);pending.set(requestId,{resolve,reject,timer});ws.send(JSON.stringify({id:requestId,method,params,sessionId}));});
 const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
 const cdp=(method,params={})=>send(method,params,sessionId);
 const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const wait=async expression=>{const deadline=Date.now()+10000;while(Date.now()<deadline){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,75));}throw new Error('UI wait timed out: '+expression);};
 const click=async text=>evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b)throw Error('Missing button');b.click();})()`);
 const field=async(name,value)=>evaluate(`(()=>{const label=[...document.querySelectorAll('label')].find(l=>l.firstChild?.textContent?.trim().startsWith(${JSON.stringify(name)}));const el=label?.querySelector('select,input');if(!el)throw Error('Missing field '+${JSON.stringify(name)});Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 for(const kind of ['cash','credit']){
  await cdp('Page.navigate',{url});await wait(`document.body?.innerText.includes('Sale source')`);
  await field('Sale source','existing');await field('Sales Order','wf-order-1');
  await wait(`document.body?.innerText.includes('125.50')`);
  assert.ok(await evaluate(`document.body?.innerText.includes('due from customer')`));
  assert.equal(await evaluate(`document.querySelector('input[aria-label="Rate 1"]').readOnly`),true);
  await field('Sale payment',kind);await field('Customer billing address','Synthetic billing');await field('Delivery challan','CH-TEST');
  if(kind==='cash')await field('Receive into','1210');
  await click('Confirm Dispatch, Invoice & Payment');await wait(`window.__recorded===true`);
  const posted=await evaluate(`window.__dispatch.entries[0].draft.sale.payment`);
  assert.equal(posted.kind,kind);assert.equal(posted.fx,'1');assert.equal(posted.billingAddress,'Synthetic billing');
  if(kind==='cash')assert.equal(posted.cashAccount,'1210');else assert.equal(posted.cashAccount,undefined);
  assert.equal(await evaluate(`window.__refreshed`),'invoices');
 }
 await cdp('Page.navigate',{url});await wait(`document.body?.innerText.includes('Sale source')`);
 await evaluate(`window.__failBalance=true`);await field('Sale source','existing');await field('Sales Order','wf-order-1');
 await wait(`document.body?.innerText.includes('Balance service unavailable')`);
 assert.equal(await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Confirm Dispatch, Invoice & Payment').disabled`),true);
 assert.equal(await evaluate(`!!window.__dispatch`),false);
 console.log('PASS: Chromium approved-order dispatch displays ledger balance, locks rates, submits cash/mobile-money and credit choices, refreshes invoices, and blocks submission on balance-load failure. Synthetic context fixtures only; backend accounting is tested separately.');
}finally{
 ws?.close();chrome?.kill();await server.close();await new Promise(r=>setTimeout(r,300));
 assert.equal(resolve(dirname(profile)),resolve(tmpdir()));await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200}).catch(()=>{});
}
