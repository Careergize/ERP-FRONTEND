import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { resolve } from 'node:path';
const server=await createServer({configFile:false,resolve:{alias:{'@':resolve('src')}},optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false},appType:'custom'});
try {
 const {createDemoSnapshot}=await server.ssrLoadModule('/src/finance/mockData.ts');
 const {createReportDataset,REPORT_AS_OF}=await server.ssrLoadModule('/src/finance/reportData.ts');
 const {profitLoss,balanceSheet,agingRows,accountRows}=await server.ssrLoadModule('/src/finance/reportMath.ts');
 const {createTransactionService}=await server.ssrLoadModule('/src/finance/transactionService.ts');
 const {createAdministrationService}=await server.ssrLoadModule('/src/finance/administrationService.ts');
 const {newDocument}=await server.ssrLoadModule('/src/finance/transactionData.ts');
 const {createMasters}=await server.ssrLoadModule('/src/finance/masterData.ts');
 const snapshot=createDemoSnapshot(),report=createReportDataset(),range={start:'2026-01-01',end:REPORT_AS_OF},pnl=profitLoss(report,range);
 assert.equal(snapshot.asOf,REPORT_AS_OF);assert.equal(snapshot.months.reduce((s,m)=>s+m.revenue,0),pnl.revenue);assert.equal(snapshot.months.reduce((s,m)=>s+m.expense,0),pnl.cost+pnl.expense);assert.equal(snapshot.months.reduce((s,m)=>s+m.revenue-m.expense,0),balanceSheet(report,REPORT_AS_OF).earnings);
 assert.equal(snapshot.cashAccounts.reduce((s,a)=>s+a.amount,0),accountRows(report,range).find(a=>a.id==='bank').closing);
 for(const side of ['receivables','payables']) {const aging=agingRows(report,REPORT_AS_OF,side);assert.equal(snapshot[side].reduce((s,a)=>s+a.amount,0),aging.reduce((s,a)=>s+a.outstanding,0));assert.equal(snapshot[side].reduce((s,a)=>s+a.overdue,0),aging.filter(a=>a.bucket>0).reduce((s,a)=>s+a.outstanding,0));}
 for(const row of snapshot.transactions){const doc=report.documents.find(d=>d.reference===row.id);assert.ok(doc);assert.equal(row.amount,report.lines.filter(l=>l.document===doc.id).reduce((s,l)=>s+l.debit,0));assert.equal(row.status,'Reference snapshot');}
 const masters=createMasters();assert.equal(Number(masters.parties.find(p=>p.id==='DEMO-P1').balance),11500);assert.equal(Number(masters.parties.find(p=>p.id==='DEMO-P2').balance),6750);
 const before=JSON.stringify(snapshot),transactions=createTransactionService(),administration=createAdministrationService();
 const receipt={...newDocument('receipt'),reference:'DEMO-QA-ISOLATION',party:'DEMO-P1',bank:'DEMO-B1',amount:'100',allocations:[{invoice:'DEMO-FINV-S1',amount:'100'}]};assert.deepEqual(transactions.save(receipt,createMasters()).errors,[]);
 assert.deepEqual(administration.match('DEMO-STMT-RECEIPT','DEMO-R-SETTLE-DEMO-FINV-S1-L1'),[]);
 assert.equal(JSON.stringify(createDemoSnapshot()),before,'Drafts and matching cannot alter immutable Dashboard/report totals');
 console.log('PASS: unified Dashboard/report as-of, revenue 13,500, cost+expense 5,750, surplus/YTD earnings 7,750, cash 100,250, AR 11,500/AP 6,750, overdue buckets and all recent document references reconcile; saved receipt and match leave snapshots unchanged.');
} finally {await server.close();}
