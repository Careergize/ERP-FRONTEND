import { createReportDataset, REPORT_AS_OF, reportParties } from './reportData';
import { accountRows, agingRows, profitLoss } from './reportMath';
import type { DemoId, FinanceSnapshot, TransactionKind } from './types';
// Dashboard and reports share one fictional ledger. Editable drafts are excluded.
export function createDemoSnapshot(): FinanceSnapshot {
 const data = createReportDataset();
 const months = ['2026-06','2026-07','2026-08','2026-09','2026-10','2026-11'].map(id => {
  const end = id === '2026-11' ? REPORT_AS_OF : new Date(Date.UTC(2026,Number(id.slice(5)),0)).toISOString().slice(0,10);
  const pnl = profitLoss(data,{start:`${id}-01`,end});
  return {id,label:new Intl.DateTimeFormat('en-GB',{month:'short',timeZone:'UTC'}).format(new Date(`${id}-01T00:00:00Z`)),revenue:pnl.revenue,expense:pnl.cost+pnl.expense};
 });
 const outstanding = (side: 'receivables'|'payables') => {
  const aging = agingRows(data,REPORT_AS_OF,side);
  return reportParties.filter(p=>aging.some(r=>r.document.party===p.id)).map(p=>({id:`DEMO-DASH-${side}-${p.id}` as DemoId,name:p.name,amount:aging.filter(r=>r.document.party===p.id).reduce((s,r)=>s+r.outstanding,0),overdue:aging.filter(r=>r.document.party===p.id&&r.bucket>0).reduce((s,r)=>s+r.outstanding,0)}));
 };
 const kinds: Record<string,TransactionKind> = {'sales-invoice':'Sales invoice','purchase-invoice':'Purchase invoice',receipt:'Receipt',payment:'Payment',journal:'Journal'};
 return {source:'demo',company:'Sample Packaging Co.',currency:'UGX',asOf:REPORT_AS_OF,months,receivables:outstanding('receivables'),payables:outstanding('payables'),cashAccounts:[{id:'DEMO-BANK-001',name:'Fictional bank · report ledger',amount:accountRows(data,{start:'2026-01-01',end:REPORT_AS_OF}).find(a=>a.id==='bank')!.closing}],transactions:data.documents.filter(d=>d.kind!=='opening').sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id)).slice(0,7).map(d=>({id:d.reference as DemoId,date:d.date,party:reportParties.find(p=>p.id===d.party)?.name||'Sample Packaging Co.',description:d.description,kind:kinds[d.kind],status:'Reference snapshot',amount:data.lines.filter(l=>l.document===d.id).reduce((s,l)=>s+l.debit,0)}))};
}
export const demoPeriods = [
 {id:'six',label:'June–6 November 2026',monthCount:6},
 {id:'three',label:'September–6 November 2026',monthCount:3},
] as const;
