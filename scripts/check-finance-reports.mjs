import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { resolve } from 'node:path';
const server = await createServer({ configFile: false, resolve: { alias: { '@': resolve('src') } }, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
 const { createReportDataset, REPORT_START, REPORT_AS_OF } = await server.ssrLoadModule('/src/finance/reportData.ts');
 const r = await server.ssrLoadModule('/src/finance/reportMath.ts');
 const { createTransactionFixtures, isInvoice } = await server.ssrLoadModule('/src/finance/transactionData.ts');
 const { amountTotals } = await server.ssrLoadModule('/src/finance/transactionMath.ts');
 const data = createReportDataset(), range = { start: '2026-11-01', end: REPORT_AS_OF }, year = { start: REPORT_START, end: REPORT_AS_OF };
 assert.deepEqual(r.validateReportDataset(data), []);
 assert.ok(r.validateReportDataset({ accounts: [], documents: [], lines: [] }).length);
 assert.equal(data.documents.length, 19); assert.equal(data.lines.length, 39);
 assert.deepEqual(r.trialTotals(data, range), { opening: 0, debit: 23500, credit: 23500, closingDebit: 140250, closingCredit: 140250 });
 assert.deepEqual(r.profitLoss(data, range), { revenue: 10000, cost: 4000, expense: 500, gross: 6000, net: 5500 });
 assert.equal(r.profitLoss(data, year).net, 7750);
 assert.deepEqual(r.balanceSheet(data, REPORT_AS_OF), { assets: 134500, liabilities: 6750, capital: 120000, earnings: 7750, equity: 127750, difference: 0 });
 assert.deepEqual(r.previousRange(range), { start: '2026-10-26', end: '2026-10-31' });
 assert.deepEqual(r.profitLoss(data, r.previousRange(range)), { revenue: 500, cost: 0, expense: 0, gross: 500, net: 500 });
 assert.equal(r.previousRange({ start: REPORT_START, end: '2026-01-06' }), null);
 for (const dates of [{ start: '', end: REPORT_AS_OF }, { start: '2026-02-30', end: REPORT_AS_OF }, { start: REPORT_START, end: '2026-11-07' }, { start: '2026-11-06', end: '2026-11-01' }]) assert.equal(r.validateRange(dates), false);
 for (const [due, bucket] of [['2026-11-07',0],['2026-11-06',0],['2026-11-05',1],['2026-10-07',1],['2026-10-06',2],['2026-09-07',2],['2026-09-06',3],['2026-08-08',3],['2026-08-07',4]]) assert.equal(r.agingBucket(due, REPORT_AS_OF), bucket, due);
 for (const [side, expected, buckets] of [['receivables',11500,[8500,600,700,800,900]],['payables',6750,[5250,300,350,400,450]]]) {
   const aging = r.agingRows(data, REPORT_AS_OF, side);
   assert.equal(aging.reduce((s,a)=>s+a.outstanding,0),expected);
   assert.deepEqual([0,1,2,3,4].map(i=>aging.filter(a=>a.bucket===i).reduce((s,a)=>s+a.outstanding,0)),buckets);
   const control = r.accountRows(data, year).find(a=>a.id===(side==='receivables'?'ar':'ap')).closing;
   assert.equal(expected,side==='receivables'?control:(-control || 0));
 }
 for (const invoice of createTransactionFixtures().documents.filter(isInvoice)) {
   const doc = data.documents.find(d=>d.id===invoice.id);
   assert.deepEqual(doc.invoice, invoice, 'Exact Batch 3 snapshot reference and values');
   const aging = r.agingRows(data, REPORT_AS_OF, invoice.kind==='sales-invoice'?'receivables':'payables').find(a=>a.document.id===invoice.id);
   assert.equal(aging.gross,amountTotals(invoice.lines).total);
   assert.equal(aging.settled,invoice.settled);
   assert.equal(aging.outstanding,amountTotals(invoice.lines).total-invoice.settled);
 }
 assert.equal(r.agingRows(data,'2026-11-01','receivables').find(a=>a.document.id==='DEMO-FINV-S1').settled,0);
 assert.ok(!r.agingRows(data,'2026-11-01','payables').some(a=>a.document.id==='DEMO-FINV-P1'));
 // Reconcile every account, control and equation for all 310 covered calendar dates.
 let days = 0;
 for (let time=Date.parse(REPORT_START);time<=Date.parse(REPORT_AS_OF);time+=86400000) {
   const end=new Date(time).toISOString().slice(0,10), period={start:REPORT_START,end};
   const totals=r.trialTotals(data,period);
   assert.equal(totals.debit,totals.credit); assert.equal(totals.closingDebit,totals.closingCredit);
   assert.equal(r.balanceSheet(data,end).difference,0);
   for (const account of data.accounts.filter(a=>!a.group)) {
     const ledger=r.ledgerRows(data,period,account.id,'All');
     assert.equal(ledger.opening+ledger.debit-ledger.credit,ledger.closing);
     if (ledger.rows.length) assert.equal(ledger.rows.at(-1).balance,ledger.closing);
   }
   for (const side of ['receivables','payables']) {
     const total=r.agingRows(data,end,side).reduce((s,a)=>s+a.outstanding,0);
     const control=r.accountRows(data,period).find(a=>a.id===(side==='receivables'?'ar':'ap')).closing;
     assert.equal(total,side==='receivables'?control:(-control || 0));
   }
   days++;
 }
 assert.equal(days,310);
 const filtered=r.ledgerRows(data,range,'ar','receipt'); assert.equal(filtered.rows.length,1); assert.equal(filtered.rows[0].balance,11500); assert.equal(filtered.opening,3500);
 const clone=()=>JSON.parse(JSON.stringify(data));
 const broken=clone(); broken.lines[0].debit++; assert.ok(r.validateReportDataset(broken).some(e=>e.includes('Unbalanced')));
 const invoiceMismatch=clone(); invoiceMismatch.documents.find(d=>d.invoice).invoice.lines[0].unitPrice='999'; assert.ok(r.validateReportDataset(invoiceMismatch).some(e=>e.includes('differ')));
 const settlementMismatch=clone(); settlementMismatch.documents.find(d=>d.settlement).settlement.amount++; assert.ok(r.validateReportDataset(settlementMismatch).length);
 const cycle=clone(); cycle.accounts[0].parent='current-assets'; assert.ok(r.validateReportDataset(cycle).includes('Invalid account hierarchy.'));
 const invalidDue=clone(); invalidDue.documents.find(d=>d.invoice).due='2026-02-30'; assert.ok(r.validateReportDataset(invalidDue).length);
 const tax=clone(); tax.documents.find(d=>d.invoice).invoice.lines[0].taxRate='10'; assert.ok(r.validateReportDataset(tax).some(e=>e.includes('zero illustrative tax')));
 const opening=clone(); opening.documents[0].date='2026-01-02'; assert.ok(r.validateReportDataset(opening).some(e=>e.includes('opening date')));
 const other=createReportDataset(); other.lines[0].debit=0; assert.notEqual(data.lines[0].debit,0);
 console.log('PASS: 19 documents / 39 ledger lines; 310 daily TB/BS/GL/aging reconciliations; exact Batch 3 invoice and settlement parity; Nov movements 23,500 Dr=Cr, closing 140,250 Dr=Cr; YTD profit 7,750; assets 134,500 = liabilities 6,750 + equity 127,750; AR 11,500, AP 6,750; all aging boundaries, dated settlements, comparisons, corruption rejection and independent fixtures.');
} finally { await server.close(); }
