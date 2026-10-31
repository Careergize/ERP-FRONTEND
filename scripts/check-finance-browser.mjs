import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {spawn} from 'node:child_process';
import {mkdtemp, rm, writeFile, readdir, readFile, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname, resolve} from 'node:path';

const book={company:'Synthetic Packaging Ltd',currency:'UGX',startDate:'2026-01-01',fiscalMonth:1,closedThrough:'',valuation:'weighted-average'};
const bootstrap={book,canWrite:true,canConfigure:true,parties:[{id:1,name:'Customer Alpha',kind:'customer'},{id:2,name:'Supplier Beta',kind:'supplier'}],accounts:[{code:'1100',name:'Cash',kind:'asset',cash:true,control:false},{code:'1200',name:'Bank',kind:'asset',cash:true,control:false},{code:'1210',name:'MTN Mobile Money',kind:'asset',cash:true,control:false},{code:'6100',name:'Transport',kind:'expense',cash:false,control:false}]};
const document={id:1,number:'RCPT-001',date:'2026-10-15',kind:'receipt',party:1,partyName:'Customer Alpha',currency:'UGX',fx:'1',total:'125000',outstanding:null,unallocated:'125000',reversed:false,notes:'Customer collection',items:[],allocations:[],journal:[{id:1,account:'1210',accountName:'MTN Mobile Money',cash:true,debit:'125000',credit:'0'},{id:2,account:'1300',accountName:'Customer receivables',cash:false,debit:'0',credit:'125000'}]};
const report={currency:'UGX',profitLoss:{income:'850000',expenses:'510000',netProfit:'340000',accounts:[]},balanceSheet:{assets:'1300000',liabilities:'420000',equity:'540000',retainedEarnings:'340000',difference:'0',accounts:[]},trialBalance:[{code:'1300',balance:'275000'},{code:'2100',balance:'-180000'}],trialDifference:'0',cashFlow:{operating:'210000'},cashFlowDetails:[{category:'operating',inflows:'400000',outflows:'190000',net:'210000'}],cashBank:[{code:'1100',name:'Cash',closing:'240000'},{code:'1200',name:'Bank',closing:'475000'},{code:'1210',name:'MTN Mobile Money',closing:'90000'}],partyBalances:[],ledger:[],ledgerOpening:'0',ledgerClosing:'0',transactions:[{kind:'invoice',date:'2026-10-15',baseNet:'850000'},{kind:'bill',date:'2026-10-14',baseNet:'320000'}],documents:[document],inventory:[],customerProfit:{rows:[{customerId:1,customer:'Customer Alpha',income:'850000',costOfSales:'460000',otherCosts:'20000',netProfit:'370000'}],details:[],unassignedIncome:'0',unassignedCosts:'30000',unassignedNet:'-30000',companyNetProfit:'340000'},assignableCosts:[{line:5,document:'EXP-001',date:'2026-10-12',account:'Transport',remaining:'30000'}],orderCommitments:{asOf:'2026-10-30',sales:[{number:'SO-001',party:'Customer Alpha',date:'2026-10-12',currency:'USD',item:'Bags',unit:'pcs',ordered:'100',invoiced:'40',remaining:'60',remainingValue:'300',status:'Approved'}],purchases:[],totals:[],issues:[],basis:'Current saved order scope. Values before tax and discounts.'}};
bootstrap.groups=[{id:10,name:'Expenses',kind:'expense',parent_id:null},{id:11,name:'Assets',kind:'asset',parent_id:null}];
bootstrap.accounts.push({code:'3100',name:'Opening equity',kind:'equity',cash:false,control:false});
bootstrap.costCategories=[];bootstrap.currencies=[{code:'UGX',name:'Reporting currency',symbol:'UGX'}];bootstrap.voucherTypes=[];

function profitFixture(customer){
 const scoped=!!customer;
 const values=scoped?{sales:200,cost_of_sales:50,direct_expense:0,other_income:0,indirect_expense:0,unclassified_income:0,unclassified_expense:0}:{sales:1000,cost_of_sales:400,direct_expense:100,other_income:50,indirect_expense:100,unclassified_income:0,unclassified_expense:0};
 const labels={sales:'Sales accounts',cost_of_sales:'Cost of goods sold',direct_expense:'Direct expenses',other_income:'Indirect income',indirect_expense:'Indirect expenses',unclassified_income:'Unclassified income',unclassified_expense:'Unclassified expenses'};
 const gross=scoped?150:500,net=scoped?150:450;
 return {company:'Synthetic Packaging Ltd',currency:'UGX',start:'2026-10-01',end:'2026-10-31',customer:scoped?{id:1,name:'Customer Alpha'}:null,
  sections:Object.entries(values).map(([key,value],i)=>({key,label:labels[key],total:String(value),groups:value?[{name:'Synthetic group',total:String(value)}]:[],accounts:value?[{code:String(4100+i),name:'Synthetic '+labels[key],group:'Synthetic group',amount:String(value),entries:[{line:i+1,document:i+1,number:'PL-VOUCHER-'+key,date:'2026-10-15',voucherType:'Synthetic voucher',kind:'invoice',customer:'Customer Alpha',category:'Synthetic category',amount:String(value),currency:'UGX',fx:'1',paymentType:'credit'}]}]:[]})),
  salesBreakdown:[{kind:'cash',label:'Cash sales',amount:scoped?'0':'400'},{kind:'credit',label:'Credit sales',amount:scoped?'200':'600'},{kind:'unclassified',label:'Sales without recorded cash/credit type',amount:'0'}],
  totals:{income:scoped?'200':'1050',expenses:scoped?'50':'600',grossProfit:String(gross),netProfit:String(net),tradingTotal:scoped?'200':'1000',operatingTotal:scoped?'150':'550'},
  stock:scoped?null:{openingValue:'1000',receipts:'0',issues:'400',closingValue:'600',rows:[{item:'finished:fixture',name:'Synthetic finished goods',unit:'ctn',openingQuantity:'100',openingValue:'1000',receipts:'0',issues:'400',closingQuantity:'60',closingValue:'600'}]},
  purchases:scoped?null:{total:'300',rows:[{document:99,number:'PL-PURCHASE',date:'2026-10-10',supplier:'Supplier Beta',amount:'300'}]},
  companyUnassigned:{income:'0',expenses:'100'},pendingEvents:[],warnings:scoped?['Customer P&L includes attributed entries only. Company stock is not allocated to this customer.']:[],basis:'Posted journals only. Supporting stock and purchases are not added to expenses again.'};
}
const commands=[];const voucherDownloads=[];let failVoucherDownload=false;
const server=await createServer({server:{port:0,host:'127.0.0.1'},define:{'import.meta.env.VITE_API_BASE_URL':JSON.stringify('/__finance-api')},plugins:[{
  name:'finance-browser-fixtures',
  resolveId(id){if(id==='/__finance-check-entry.tsx')return '\0finance-check-entry.tsx';},
  load(id){if(id==='\0finance-check-entry.tsx')return `import React from 'react';import {createRoot} from 'react-dom/client';import {AccountingPage} from '/src/pages/Accounting.tsx';import '/src/index.css';createRoot(document.getElementById('root')).render(React.createElement(AccountingPage));`;},
  configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
    if(req.url?.startsWith('/__finance-api/')){
      if(req.url.includes('/vouchers/')&&req.url.includes('/pdf/')){
        voucherDownloads.push(req.url);
        if(failVoucherDownload){res.statusCode=403;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({detail:'Voucher download is not permitted.'}));return;}
        res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition','attachment; filename="RCPT-001.pdf"');res.end(Buffer.from('%PDF-1.4\nSynthetic voucher download fixture\n%%EOF'));return;
      }
      let data=report;
      if(req.method==='POST') {let body='';for await(const chunk of req)body+=chunk;const payload=JSON.parse(body);commands.push(payload);data=document;
        const kind=req.url.split('/masters/')[1]?.split('/')[0];
        const id=100+commands.length;
        if(kind==='groups')bootstrap.groups.push({id,name:payload.name,kind:payload.kind,parent_id:payload.parent??null});
        if(kind==='accounts')bootstrap.accounts.push({...payload,group_id:payload.group,control:false});
        if(kind==='cost-categories')bootstrap.costCategories.push({id,name:payload.name});
        if(kind==='currencies')bootstrap.currencies.push(payload);
        if(kind==='voucher-types')bootstrap.voucherTypes.push({id,name:payload.name,base_kind:payload.baseKind});
        if(kind==='ledger-update'){const row=(payload.ledgerType==='account'?bootstrap.accounts:bootstrap.parties).find(r=>String(payload.ledgerType==='account'?r.code:r.id)===String(payload.ledger));if(row){row.name=payload.name;row.group_id=payload.group;}}
        if(kind==='ledger-delete'){if(payload.ledgerType==='account')bootstrap.accounts=bootstrap.accounts.filter(r=>r.code!==payload.ledger);else bootstrap.parties=bootstrap.parties.filter(r=>r.id!==payload.ledger);}
        if(kind==='pnl-classification'){const account=bootstrap.accounts.find(a=>a.code===payload.account);if(account)account.pnl_section=payload.section;}
        if(kind==='group-membership'){const ledger=bootstrap.accounts.find(a=>a.code===payload.ledger);if(ledger)ledger.group_id=payload.group;}
        if(kind)data={id};}
      else if(req.url.includes('/detailed-profit-loss/'))data=profitFixture(new URL(req.url,'http://fixture').searchParams.get('customer'));
      else if(req.url.includes('/setup/'))data=bootstrap;
      else if(req.url.includes('/valuation-items/'))data=[{id:'finished:fixture-cartons',name:'Fixture cartons',unit:'ctn',valuedUnit:'Ctn',lastDate:'2026-10-30'},{id:'raw:fixture-material',name:'Fixture raw material',unit:'kg',valuedUnit:null,lastDate:null}];
      else if(req.url.includes('/posting-queue/')||req.url.includes('/purchase-bills/'))data=[];
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));return;
    }
    if(req.url==='/__finance-check'){
      res.setHeader('Content-Type','text/html');res.end(await vite.transformIndexHtml('/__finance-check',`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="background:#f5f7f5;margin:0;padding:24px"><div id="root"></div><script type="module" src="/__finance-check-entry.tsx"></script></body></html>`));return;
    }next();
  });}
}]});
let chrome,ws;const profile=await mkdtemp(join(tmpdir(),'finance-browser-'));
try{
 await server.listen();const url=server.resolvedUrls.local[0]+'__finance-check';
 chrome=spawn(process.env.CHROME_PATH||'C:/Users/server/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',['--headless','--no-sandbox','--disable-gpu','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
 const endpoint=await new Promise((resolve,reject)=>{let logs='';const timer=setTimeout(()=>reject(new Error('Chromium startup timeout')),15000);chrome.stderr.on('data',chunk=>{logs+=chunk;const match=logs.match(/DevTools listening on (ws:\/\/\S+)/);if(match){clearTimeout(timer);resolve(match[1]);}});chrome.on('error',reject);});
 ws=new WebSocket(endpoint);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 let id=0;const pending=new Map();ws.addEventListener('message',event=>{const data=JSON.parse(String(event.data));if(data.id&&pending.has(data.id)){const {resolve,reject,timer}=pending.get(data.id);clearTimeout(timer);pending.delete(data.id);data.error?reject(new Error(data.error.message)):resolve(data.result);}});
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const requestId=++id;const timer=setTimeout(()=>{pending.delete(requestId);reject(new Error('CDP timeout: '+method));},10000);pending.set(requestId,{resolve,reject,timer});ws.send(JSON.stringify({id:requestId,method,params,sessionId}));});
 const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
 const cdp=(method,params={})=>send(method,params,sessionId);
 const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const wait=async expression=>{const deadline=Date.now()+10000;while(Date.now()<deadline){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,75));}throw new Error('UI wait timed out: '+expression+'; page: '+await evaluate(`document.body?.innerText`));};
 const click=async text=>{await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b)throw Error('Missing button: '+${JSON.stringify(text)});b.click();})()`);};
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});await cdp('Page.navigate',{url});
 await wait(`document.body?.innerText.includes('Analysis home')`);
 assert.equal(await evaluate(`getComputedStyle(document.querySelector('.finance-navigation button[aria-current="page"]')).backgroundColor`),'rgb(232, 245, 238)');
 if(process.env.FINANCE_SCREENSHOT){await writeFile(process.env.FINANCE_SCREENSHOT,Buffer.from((await cdp('Page.captureScreenshot',{captureBeyondViewport:true})).data,'base64'));}
 await click('Reports');await wait(`document.body?.innerText.includes('Profit & Loss Account')`);
 assert.ok(await evaluate(`document.body.innerText.includes('450.00')`));
 await evaluate(`document.querySelector('[aria-label="Trading and gross profit"] details summary').click()`);
 await evaluate(`document.querySelector('[aria-label="Trading and gross profit"] details details summary').click()`);
 assert.ok(await evaluate(`document.body.innerText.includes('PL-VOUCHER-cost_of_sales')`));
 if(process.env.FINANCE_SCREENSHOT)await writeFile(process.env.FINANCE_SCREENSHOT.replace('.png','-profit-loss.png'),Buffer.from((await cdp('Page.captureScreenshot',{captureBeyondViewport:true})).data,'base64'));
 await evaluate(`(()=>{const el=[...document.querySelectorAll('label')].find(l=>l.textContent.startsWith('P&L scope')).querySelector('select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,'1');el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 await wait(`document.body?.innerText.includes('Customer ledger: Customer Alpha')`);
 assert.ok(await evaluate(`document.body.innerText.includes('150.00')`));
 assert.equal(await evaluate(`document.body.innerText.includes('Supporting stock schedule')`),false);
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 assert.equal(await evaluate(`document.documentElement.scrollWidth<=window.innerWidth`),true,'Detailed P&L must stack on mobile without page overflow');
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
 await click('Customer profit');await wait(`document.body?.innerText.includes('Attributed net profit')`);assert.ok(await evaluate(`document.body?.innerText.includes('370,000.00')`));
 if(process.env.FINANCE_SCREENSHOT)await writeFile(process.env.FINANCE_SCREENSHOT.replace('.png','-customer.png'),Buffer.from((await cdp('Page.captureScreenshot',{captureBeyondViewport:true})).data,'base64'));
 await click('Uninvoiced orders');await wait(`document.body?.innerText.includes('SO-001')`);await click('Purchase orders');await wait(`document.body?.innerText.includes('No records for this selection.')`);
 report.documents.push(...Array.from({length:60},(_,i)=>({...document,id:100+i,number:'HISTORY-'+i})));
 await click('Day book');await wait(`document.body?.innerText.includes('RCPT-001')`);await click('View voucher');await wait(`!!document.querySelector('dialog[open]')`);
 assert.ok(await evaluate(`document.querySelector('dialog[open]').innerText.includes('Payment accounts & journal')`));
 assert.ok(await evaluate(`document.querySelector('dialog[open]').innerText.includes('RCPT-001')`));
 const downloadPath=join(profile,'downloads');await mkdir(downloadPath,{recursive:true});
 await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath});
 await click('Download voucher PDF');await wait(`[...document.querySelectorAll('dialog[open] button')].some(b=>b.textContent.trim()==='Download voucher PDF'&&!b.disabled)`);
 const downloadDeadline=Date.now()+5000;while(!(await readdir(downloadPath)).includes('RCPT-001.pdf')&&Date.now()<downloadDeadline)await new Promise(r=>setTimeout(r,50));
 assert.ok((await readFile(join(downloadPath,'RCPT-001.pdf'))).toString().startsWith('%PDF-'));
 assert.ok(voucherDownloads[0].includes('/vouchers/1/pdf/'));assert.ok(voucherDownloads[0].includes('asOf='));
 failVoucherDownload=true;await click('Download voucher PDF');await wait(`document.querySelector('dialog[open]')?.innerText.includes('Voucher download is not permitted.')`);failVoucherDownload=false;

 assert.equal(await evaluate(`(()=>{const r=document.querySelector('dialog[open]').getBoundingClientRect();return r.top>=0&&r.top<innerHeight&&r.bottom<=innerHeight;})()`),true,'Voucher details must open visibly even for a long register');
 await click('Close voucher');await wait(`!document.querySelector('dialog[open]')`);
 await click('View voucher');await wait(`!!document.querySelector('dialog[open]')`);
 await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await wait(`!document.querySelector('dialog[open]')`);
 await click('View voucher');await wait(`!!document.querySelector('dialog[open]')`);await click('Open MTN Mobile Money ledger');await wait(`document.body?.innerText.includes('Opening:')`);
 await click('New voucher');await wait(`document.body?.innerText.includes('Post a financial transaction')`);
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await click('Dashboard');await wait(`document.body?.innerText.includes('Analysis home')`);
 assert.equal(await evaluate(`document.documentElement.scrollWidth<=window.innerWidth`),true,'Mobile page must not overflow horizontally');
 if(process.env.FINANCE_SCREENSHOT)await writeFile(process.env.FINANCE_SCREENSHOT.replace('.png','-mobile.png'),Buffer.from((await cdp('Page.captureScreenshot',{captureBeyondViewport:true})).data,'base64'));
 assert.equal(commands.length,0,'Read-only navigation must not post accounting commands');
 await click('Customer profit');await wait(`document.body?.innerText.includes('Assign a recorded cost')`);
 await evaluate(`(()=>{const set=(name,value)=>{const label=[...document.querySelectorAll('form fieldset label')].find(el=>el.textContent.trim().startsWith(name));const el=label?.querySelector('input,select');if(!el)throw Error('Missing field '+name);Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value').set.call(el,value);el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));};set('Recorded cost','5');set('Customer','1');set('Amount (UGX)','5000');set('Assignment reference','ASSIGN-UI');set('Posting date','2026-10-30');set('Reason','Reviewed customer delivery');})()`);
 await click('Assign cost');await wait(`document.body?.innerText.includes('Cost assigned. Customer profitability updated.')`);
 assert.equal(commands.length,1);assert.equal(commands[0].kind,'assign-cost');assert.equal(commands[0].sourceLine,5);assert.equal(commands[0].customer,1);assert.equal(commands[0].amount,'5000');assert.ok(commands[0].commandId);

 const setFields=async values=>evaluate(`(()=>{for(const [name,value] of Object.entries(${JSON.stringify(values)})){const label=[...document.querySelectorAll('form fieldset label')].find(el=>el.textContent.trim().startsWith(name));const el=label?.querySelector('input,select');if(!el)throw Error('Missing field '+name);Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value').set.call(el,value);el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));}})()`);
 const masterTab=async name=>evaluate(`(()=>{const button=[...document.querySelectorAll('nav[aria-label="Finance masters"] button')].find(b=>b.textContent.trim().startsWith(${JSON.stringify(name)}));if(!button)throw Error('Missing master tab');button.click();})()`);
 await click('Masters');await wait(`document.body?.innerText.includes('Organise your books')`);
 await setFields({'Group name':'Office costs','Classification':'expense','Parent group':'10'});await click('Create group');await wait(`document.body?.innerText.includes('Expenses › Office costs')`);
 const officeGroup=bootstrap.groups.find(g=>g.name==='Office costs');assert.ok(officeGroup);
 await masterTab('Ledgers');await wait(`document.body?.innerText.includes('Create ledger')`);
 await setFields({'Ledger name':'Office rent','Ledger code':'6150','Under group':String(officeGroup.id)});await click('Create ledger');await wait(`document.body?.innerText.includes('Office rent')&&document.querySelector('.finance-table')?.innerText.includes('6150')`);
 await evaluate(`document.querySelector('[aria-label="Edit ledger 6150"]').click()`);
 await wait(`document.querySelector('#finance-ledger-name')?.value==='Office rent'`);
 await setFields({'Updated ledger name':'Updated transport ledger','Updated group':'10'});await click('Save ledger changes');
 await wait(`document.querySelector('.finance-table')?.innerText.includes('Updated transport ledger')`);
 assert.equal(bootstrap.accounts.find(a=>a.code==='6150').name,'Updated transport ledger');
 await setFields({'Existing ledger':'account:6150','Place in group':'10'});await click('Update group');await wait(`document.body?.innerText.includes('Accounting master saved.')`);
 assert.equal(bootstrap.accounts.find(a=>a.code==='6150').group_id,10);
 await setFields({'Income / expense ledger':'6150','P&L section':'indirect_expense'});await click('Save P&L classification');await wait(`document.body?.innerText.includes('Accounting master saved.')`);assert.equal(bootstrap.accounts.find(a=>a.code==='6150').pnl_section,'indirect_expense');
 const beforeDelete=commands.length;
 await evaluate(`window.confirm=()=>false;document.querySelector('[aria-label="Delete ledger 6150"]').click()`);assert.equal(commands.length,beforeDelete);
 await evaluate(`window.confirm=()=>true;document.querySelector('[aria-label="Delete ledger 6150"]').click()`);
 await wait(`!document.querySelector('[aria-label="Edit ledger 6150"]')`);
 assert.equal(bootstrap.accounts.some(a=>a.code==='6150'),false);
 assert.equal(commands.at(-1).ledgerType,'account');assert.equal(commands.at(-1).expectedName,'Updated transport ledger');

 await masterTab('Cost categories');await setFields({'Category name':'Administration'});await click('Create cost category');await wait(`document.querySelector('.finance-table')?.innerText.includes('Administration')`);
 await masterTab('Currencies');await setFields({'ISO Currency Code':'USD','Formal name':'US Dollar','Symbol':'$','Number of decimal places':'2','Show amount in millions':'no','Suffix symbol to amount':'yes','Add space between amount and symbol':'yes','Word representing amount after decimal':'cents','No. of decimal places for amount in words':'2'});await click('Create currency');await wait(`document.querySelector('.finance-table')?.innerText.includes('US Dollar')`);
 assert.equal(bootstrap.currencies.find(c=>c.code==='USD').suffix_symbol,true);assert.equal(bootstrap.currencies.find(c=>c.code==='USD').decimal_word,'cents');
 await masterTab('Voucher types');await setFields({'Voucher type name':'Mobile collection','Based on':'receipt'});await click('Create voucher type');await wait(`document.querySelector('.finance-table')?.innerText.includes('Mobile collection')`);
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
 if(process.env.FINANCE_SCREENSHOT)await writeFile(process.env.FINANCE_SCREENSHOT.replace('.png','-masters.png'),Buffer.from((await cdp('Page.captureScreenshot',{captureBeyondViewport:true})).data,'base64'));
 await click('New voucher');await wait(`document.body?.innerText.includes('Post a financial transaction')`);
 const custom=bootstrap.voucherTypes.find(v=>v.name==='Mobile collection'),category=bootstrap.costCategories.find(c=>c.name==='Administration');
 await setFields({'Voucher type':String(custom.id),'Cost category':String(category.id),'Document number':'CUSTOM-001','Posting date':'2026-10-30','Currency':'USD','FX:':'2','Customer':'1','Amount':'25'});
 await click('Post transaction');await wait(`document.body?.innerText.includes('Transaction posted; ledgers and reports updated.')`);
 const posted=commands.at(-1);assert.equal(posted.kind,'receipt');assert.equal(posted.voucherType,custom.id);assert.equal(posted.costCategory,category.id);assert.equal(posted.currency,'USD');assert.equal(posted.fx,'2');
 await click('Valuation');await wait(`!!document.querySelector('select option[value="finished:fixture-cartons"]')`);
 await setFields({'Valuation action':'stock-receipt','Stock item':'finished:fixture-cartons'});
 await wait(`[...document.querySelectorAll('label')].find(l=>l.textContent.startsWith('Unit (from item)'))?.querySelector('input')?.value==='ctn'`);
 assert.equal(await evaluate(`[...document.querySelectorAll('label')].find(l=>l.textContent.startsWith('Unit (from item)')).querySelector('input').readOnly`),true);
 await setFields({'Document number':'AUTO-UNIT-TEST','Quantity':'10','Total receipt value':'500','Contra account':'3100'});
 await click('Post valuation');await wait(`document.body?.innerText.includes('Inventory value and accounting updated.')`);
 assert.equal(commands.at(-1).item,'finished:fixture-cartons');assert.equal(commands.at(-1).unit,'ctn');
 await setFields({'Stock item':'raw:fixture-material'});
 await wait(`[...document.querySelectorAll('label')].find(l=>l.textContent.startsWith('Unit (from item)'))?.querySelector('input')?.value==='kg'`);
 console.log('PASS: Chromium finance desktop/mobile layout, customer profit, order filters, voucher/ledger navigation, PDF download/filename/as-of/error handling, cost assignment, group and ledger creation/membership, row-level ledger edit/delete/cancel confirmation, cost categories, currencies, custom voucher types, voucher posting, detailed company/customer P&L, ledger/voucher drill-down, P&L classification and automatic read-only valuation units (ctn/kg). Synthetic API fixtures only.');
} finally {ws?.close();chrome?.kill();await server.close();await new Promise(r=>setTimeout(r,300));assert.equal(resolve(dirname(profile)),resolve(tmpdir()));await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200}).catch(()=>{});}



