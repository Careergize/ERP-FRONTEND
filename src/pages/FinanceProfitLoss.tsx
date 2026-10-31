import { useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { financeErrorMessage } from '@/lib/financeApiErrors';

type Entry={line:number;document:number;number:string;date:string;kind:string;voucherType:string;category:string;customer:string;amount:string;currency:string;fx:string;paymentType:string};
type Ledger={code:string;name:string;group:string;amount:string;entries:Entry[]};
type Section={key:string;label:string;total:string;groups:{name:string;total:string}[];accounts:Ledger[]};
type StockRow={item:string;name:string;unit:string;openingQuantity:string;openingValue:string;receipts:string;issues:string;closingQuantity:string;closingValue:string};
type PurchaseRow={document:number;number:string;date:string;supplier:string;amount:string};
export interface DetailedProfitLossData{
 company:string;currency:string;start:string;end:string;customer:{id:number;name:string}|null;sections:Section[];
 salesBreakdown:{kind:string;label:string;amount:string}[];totals:{income:string;expenses:string;grossProfit:string;netProfit:string;tradingTotal:string;operatingTotal:string};
 stock:{rows:StockRow[];openingValue:string;receipts:string;issues:string;closingValue:string}|null;
 purchases:{total:string;rows:PurchaseRow[]}|null;warnings:string[];pendingEvents:{source:string;error:string}[];
 companyUnassigned:{income:string;expenses:string};basis:string;
}
const money=(n:string|number)=>Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
function saveCsv(data:DetailedProfitLossData){
 const rows:unknown[][]=[['Profit & Loss',data.company],['Scope',data.customer?.name??'Overall company'],['From',data.start,'Through',data.end,'Currency',data.currency],
 ['Section','Group','Account code','Ledger','Amount'],...data.sections.flatMap(s=>s.accounts.map(a=>[s.label,a.group,a.code,a.name,a.amount])),
 ['Gross profit',data.totals.grossProfit],['Net profit',data.totals.netProfit],[],['Section','Account','Date','Voucher','Customer','Cost category','Amount','Source currency','FX'],
 ...data.sections.flatMap(s=>s.accounts.flatMap(a=>a.entries.map(e=>[s.label,a.code,e.date,e.number,e.customer,e.category,e.amount,e.currency,e.fx])))];
 if(data.stock)rows.push([],['Supporting stock only','Item','Unit','Opening quantity','Opening value','Valued receipts','Valued issues','Closing quantity','Closing value'],...data.stock.rows.map(r=>['Stock',r.item,r.unit,r.openingQuantity,r.openingValue,r.receipts,r.issues,r.closingQuantity,r.closingValue]));
 if(data.purchases)rows.push([],['Supporting purchases only','Date','Voucher','Supplier','Net amount'],...data.purchases.rows.map(r=>['Purchase',r.date,r.number,r.supplier,r.amount]));
 rows.push([],['Basis',data.basis],...data.warnings.map(w=>['Warning',w]));
 const escape=(v:unknown)=>'"'+String(v??'').replace(/^[=+@\-]/,"'$&").replaceAll('"','""')+'"';
 const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(escape).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=`profit-loss-${data.customer?.id??'company'}-${data.start}-${data.end}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function ProfitSection({section,sales}:{section?:Section;sales?:DetailedProfitLossData['salesBreakdown']}){
 if(!section)return null;
 const groups=[...new Set(section.accounts.map(a=>a.group))];
 return <div className="pnl-section"><div className="pnl-line font-semibold"><span>{section.label}</span><span>{money(section.total)}</span></div>
 {sales&&<div className="pl-4 text-sm text-gray-600">{sales.map(s=><div className="pnl-line" key={s.kind}><span>{s.label}</span><span>{money(s.amount)}</span></div>)}</div>}
 {groups.map(group=><details key={group} className="mt-2 pl-3"><summary className="cursor-pointer text-sm font-medium">{group} · {money(section.groups.find(g=>g.name===group)?.total??'0')}</summary>
 {section.accounts.filter(a=>a.group===group).map(a=><details key={a.code} className="mt-2 pl-3"><summary className="cursor-pointer"><span className="pnl-line inline-flex w-full gap-3"><span>{a.code} · {a.name}</span><strong>{money(a.amount)}</strong></span></summary><div className="overflow-x-auto py-2"><table className="finance-table"><thead><tr>{['Date','Voucher','Type','Customer','Cost category','Amount'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{a.entries.map(e=><tr key={e.line}><td>{e.date}</td><td>{e.number}</td><td>{e.voucherType}</td><td>{e.customer}</td><td>{e.category}</td><td className="text-right tabular-nums">{money(e.amount)}</td></tr>)}</tbody></table></div></details>)}</details>)}
 {!section.accounts.length&&<p className="pl-4 text-sm text-gray-500">No posted entries.</p>}</div>;
}
export function ProfitLossStatement({data}:{data:DetailedProfitLossData}){
 const section=(key:string)=>data.sections.find(s=>s.key===key);
 const gross=Number(data.totals.grossProfit),net=Number(data.totals.netProfit);
 const tradingTotal=Number(data.totals.tradingTotal),operatingTotal=Number(data.totals.operatingTotal);
 const balance=(label:string,value:number)=><div className="pnl-line pnl-balance"><strong>{label}</strong><strong>{money(value)}</strong></div>;
 return <div className="space-y-5"><header className="text-center"><h2 className="text-xl font-semibold">Profit &amp; Loss Account</h2><p className="font-medium">{data.company}</p><p>{data.customer?`Customer ledger: ${data.customer.name} · P-${data.customer.id}`:'Overall company'} · {data.start} to {data.end} · {data.currency}</p></header>
 {data.warnings.map((w,i)=><p key={i} role="note" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{w}</p>)}
 <div className="grid gap-3 sm:grid-cols-3">{[['Gross profit / loss',gross],['Net profit / loss',net],['Total income',Number(data.totals.income)]].map(([label,value])=><div className="rounded border bg-gray-50 p-3" key={String(label)}><p className="text-sm text-gray-500">{label}</p><strong className={Number(value)<0?'text-red-700':'text-emerald-800'}>{data.currency} {money(Number(value))}</strong></div>)}</div>
 <section className="pnl-sheet" aria-label="Trading and gross profit"><h3 className="pnl-caption">Trading account · expand groups and ledgers for vouchers</h3><div className="pnl-columns"><div className="pnl-column"><p className="pnl-column-title">Particulars · Costs</p><ProfitSection section={section('cost_of_sales')}/><ProfitSection section={section('direct_expense')}/>{gross>=0&&balance('Gross profit c/o',gross)}{balance('Total',tradingTotal)}</div><div className="pnl-column"><p className="pnl-column-title">Particulars · Sales</p><ProfitSection section={section('sales')} sales={data.salesBreakdown}/>{gross<0&&balance('Gross loss c/o',-gross)}{balance('Total',tradingTotal)}</div></div></section>
 <section className="pnl-sheet" aria-label="Net profit and loss"><h3 className="pnl-caption">Profit &amp; loss account</h3><div className="pnl-columns"><div className="pnl-column"><p className="pnl-column-title">Particulars · Expenses</p>{gross<0&&balance('Gross loss b/f',-gross)}<ProfitSection section={section('indirect_expense')}/><ProfitSection section={section('unclassified_expense')}/>{net>=0&&balance('Net profit',net)}{balance('Total',operatingTotal)}</div><div className="pnl-column"><p className="pnl-column-title">Particulars · Income</p>{gross>=0&&balance('Gross profit b/f',gross)}<ProfitSection section={section('other_income')}/><ProfitSection section={section('unclassified_income')}/>{net<0&&balance('Net loss',-net)}{balance('Total',operatingTotal)}</div></div></section>
 {data.stock&&<details className="rounded border p-4" open><summary className="cursor-pointer font-semibold">Supporting stock schedule · not added to expenses again</summary><p className="my-2 text-sm text-gray-600">Opening {money(data.stock.openingValue)} + valued receipts {money(data.stock.receipts)} − valued issues {money(data.stock.issues)} = closing {money(data.stock.closingValue)} {data.currency}. Posted valuation records only; quantities retain their own units.</p><div className="overflow-x-auto"><table className="finance-table"><thead><tr>{['Stock item','Unit','Opening qty','Opening value','Receipts value','Issues value','Closing qty','Closing value'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{data.stock.rows.map(r=><tr key={r.item}><td>{r.name}<small className="block">{r.item}</small></td><td>{r.unit}</td><td>{r.openingQuantity}</td><td>{money(r.openingValue)}</td><td>{money(r.receipts)}</td><td>{money(r.issues)}</td><td>{r.closingQuantity}</td><td>{money(r.closingValue)}</td></tr>)}</tbody></table>{!data.stock.rows.length&&<p>No posted inventory valuation records.</p>}</div></details>}
 {data.purchases&&<details className="rounded border p-4"><summary className="cursor-pointer font-semibold">Supporting purchase bills · {data.currency} {money(data.purchases.total)}</summary><p className="my-2 text-sm text-gray-600">Net posted bills and reversals at their saved exchange rates. Purchases may be stock, assets or expenses; this schedule is not added again to P&amp;L.</p><div className="overflow-x-auto"><table className="finance-table"><thead><tr><th>Date</th><th>Voucher</th><th>Supplier</th><th>Net value</th></tr></thead><tbody>{data.purchases.rows.map(r=><tr key={r.document}><td>{r.date}</td><td>{r.number}</td><td>{r.supplier}</td><td>{money(r.amount)}</td></tr>)}</tbody></table></div></details>}
 {data.customer&&<p className="text-sm text-gray-600">Company-wide unassigned income: {data.currency} {money(data.companyUnassigned.income)} · unassigned expenses: {money(data.companyUnassigned.expenses)}. These amounts are excluded from this customer’s P&amp;L.</p>}
 <p className="text-xs text-gray-500">{data.basis} Negative figures represent credits or reversals. Current ledger names, groups and P&amp;L classifications apply to the selected period.</p></div>;
}
export function FinanceProfitLoss({start,end,parties,refreshToken}:{start:string;end:string;parties:{id:number;name:string;kind:string}[];refreshToken:unknown}){
 const [customer,setCustomer]=useState(''),[revision,setRevision]=useState(0),[data,setData]=useState<DetailedProfitLossData|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let live=true;setLoading(true);setData(null);setError('');void api.get<DetailedProfitLossData>('/accounting/detailed-profit-loss/',{params:{start,end,customer:customer||undefined}}).then(({data})=>{if(live)setData(data);}).catch(cause=>{if(live)setError(financeErrorMessage(cause));}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[start,end,customer,revision,refreshToken]);
 return <div className="space-y-4"><div className="flex flex-wrap items-end gap-3"><label className="text-sm">P&amp;L scope<select className="mt-1 block rounded border px-3 py-2" value={customer} onChange={e=>setCustomer(e.target.value)}><option value="">Overall company</option>{parties.filter(p=>p.kind==='customer').map(p=><option key={p.id} value={p.id}>{p.name} · P-{p.id}</option>)}</select></label><button type="button" className="finance-secondary" disabled={loading} onClick={()=>setRevision(n=>n+1)}><RefreshCw size={16}/>Refresh P&amp;L</button><button type="button" className="finance-secondary" disabled={!data||loading} onClick={()=>data&&saveCsv(data)}><Download size={16}/>Export detailed P&amp;L CSV</button></div>{loading&&<p role="status">Loading detailed Profit &amp; Loss…</p>}{error&&<p role="alert" className="rounded border border-red-200 p-3 text-red-700">{error}</p>}{data&&<ProfitLossStatement data={data}/>}</div>;
}
