import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
export async function checkReportBrowser({ evaluate, wait, cdp, evidence }) {
 const click = text => evaluate(`[...document.querySelectorAll('button,a')].find(b=>b.textContent===${JSON.stringify(text)}).click()`);
 const field = label => `[...document.querySelectorAll('dialog label,main label')].find(l=>l.querySelector('span')?.textContent===${JSON.stringify(label)})`;
 const fill = (label,value) => evaluate(`(()=>{const input=${field(label)}.querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}))})()`);
 const select = (label,value) => evaluate(`(()=>{const input=${field(label)}.querySelector('select');input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('change',{bubbles:true}))})()`);
 const nav = async page => { await evaluate(`(()=>{const link=document.querySelector('a[href="/finance/preview/${page}"]');link.scrollIntoView({block:'nearest'});link.click()})()`); await wait(`location.pathname==='/finance/preview/${page}'`); };
 const capture = async name => { await evaluate("if(document.querySelector('dialog'))document.querySelector('dialog').scrollTop=0"); await writeFile(join(evidence,`${name}.png`),Buffer.from((await cdp('Page.captureScreenshot',{captureBeyondViewport:!name.includes('drilldown')})).data,'base64')); };
 const escape = async () => { await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27}); await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27}); await wait("!document.querySelector('dialog')"); };
 // A saved Batch 3 plan must remain excluded from immutable financial reports.
 await nav('receipt'); await click('New transaction draft'); await fill('Document reference','DEMO-B4-EXCLUDED'); await select('Customer','DEMO-P1'); await select('Fictional bank','DEMO-B1'); await fill('Entry amount','123'); await select('Invoice 1','DEMO-FINV-S1'); await fill('Allocation amount 1','123'); await click('Save transaction draft'); await wait("!document.querySelector('dialog')");
 for (const page of ['ledger','trial-balance','profit-loss','balance-sheet','receivables','payables']) {
   await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false}); await nav(page);
   await wait("!!document.querySelector('table')");
   assert.ok(await evaluate("document.body.textContent.includes('All editable Batch 3 drafts are excluded')"));
   assert.equal(await evaluate("document.querySelector('main').textContent.includes('DEMO-B4-EXCLUDED')"),false);
   for (const label of ['Post transaction','Approve','Financial export','Print report','Activate Finance']) assert.ok(await evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.startsWith('${label}')&&b.disabled)`));
   assert.equal(await evaluate("[...document.querySelectorAll('main button')].some(b=>/^(Save|Edit|New)/.test(b.textContent)&&!b.disabled)"),false);
   if(page==='ledger') {
     await wait("document.body.textContent.includes('UGX 11,500')"); await click('DEMO-SALES-REF-01'); await wait("document.querySelector('dialog')?.textContent.includes('Invoice total: UGX 10,000')"); await escape();
     await select('Transaction type','receipt'); await wait("document.querySelector('tbody').rows.length===1"); assert.ok(await evaluate("document.querySelector('tbody').textContent.includes('11,500')"));
     await select('Transaction type','All'); await select('Ledger account','bank'); await wait("document.body.textContent.includes('UGX 100,250')"); await select('Ledger account','ar');
     await fill('Report start','2026-11-03'); await wait("document.body.textContent.includes('UGX 13,500')"); await fill('Report start','2026-11-01');
     await fill('Report end','2026-10-31'); await wait("document.querySelector('[role=alert]')?.textContent.includes('Choose valid dates')"); assert.equal(await evaluate("!!document.querySelector('table')"),false); await fill('Report end','2026-11-06'); await wait("!!document.querySelector('table')");
   }
   if(page==='trial-balance') { await wait("document.body.textContent.includes('Balanced: opening')"); assert.ok(await evaluate("document.body.textContent.includes('140,250')&&document.body.textContent.includes('23,500')&&document.body.textContent.includes('Current assets')")); }
   if(page==='profit-loss') { await wait("document.body.textContent.includes('UGX 5,500')"); assert.ok(await evaluate("document.body.textContent.includes('2026-10-26–2026-10-31')")); await fill('Report start','2026-01-01'); await wait("document.body.textContent.includes('UGX 7,750')"); assert.ok(await evaluate("document.body.textContent.includes('comparison unavailable outside dataset coverage')")); await fill('Report start','2026-11-01'); }
   if(page==='balance-sheet') { await wait("document.body.textContent.includes('UGX 134,500')"); assert.ok(await evaluate("document.body.textContent.includes('UGX 127,750')&&document.body.textContent.includes('UGX 7,750')&&document.body.textContent.includes('Accounting equation balanced')")); await fill('As of date','2026-01-01'); await wait("document.body.textContent.includes('UGX 120,000')"); await fill('As of date','2026-11-06'); }
   if(page==='receivables'||page==='payables') {
     await wait(`document.body.textContent.includes('UGX ${page==='receivables'?'11,500':'6,750'}')`);
     assert.ok(await evaluate("document.body.textContent.includes('Reconciled to control ledger')"));
     await click(page==='receivables'?'Sample customer Alpha':'Sample supplier Beta'); await wait("document.querySelector('dialog')?.open"); assert.equal(await evaluate("document.querySelectorAll('dialog li').length"),6);
     await click(page==='receivables'?'DEMO-SALES-REF-01':'DEMO-PURCHASE-REF-01'); await wait(`document.querySelector('dialog')?.textContent.includes('Invoice total: UGX ${page==='receivables'?'10,000':'6,000'}')`); await escape();
     if(page==='receivables') { await fill('As of date','2026-11-01'); await wait("document.body.textContent.includes('UGX 13,500')"); await fill('As of date','2026-11-06'); }
   }
   await evaluate("document.querySelector('main').scrollTop=0;window.scrollTo(0,0)"); await capture(`report-${page}-desktop`);
   await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
   assert.ok(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),`${page}: mobile overflow`); await capture(`report-${page}-mobile`);
   if(page==='receivables'||page==='payables') { await click(page==='receivables'?'Sample customer Alpha':'Sample supplier Beta'); await wait("document.querySelector('dialog')?.open"); await capture(`report-${page}-drilldown-mobile`); await escape(); }
 }
 await nav('receipt'); await wait("document.body.textContent.includes('DEMO-B4-EXCLUDED')"); await click('Reset preview'); await wait("!document.body.textContent.includes('DEMO-B4-EXCLUDED')"); await nav('receivables'); await wait("document.body.textContent.includes('UGX 11,500')");
 console.log('PASS: Batch 4 six read-only reports; exact Batch 3 reference drill-down; draft exclusion and retention; GL date/account/type/running balances; TB totals; P&L comparison/YTD to BS earnings; equation; aging/control/date settlement reconciliation; invoice drill-down; invalid-range withholding; desktop/mobile screenshots and overflow; disabled posting/approval/export/print/activation.');
}
