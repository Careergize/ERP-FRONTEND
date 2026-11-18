import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { formatDisplayDate } from '@/lib/formatDisplayDate';
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
const reportGroups: Record<string, string[]> = {

 other_income: ['Other Income', 'Transport Received'],
 indirect_expense: [
  'Admin & Operation Expenses', 'Employment Expenses', 'Finance Expenses', 'Remuneration',
  'Staff Welfare', 'Authorities Expenses', 'Casual Salary', 'Charles Salary Adv',
  'Depreciation', 'Expatriate Salary', 'Legal Expense', 'Maintenance & Repair',
  'Maintenance & Repairing (Recycle)',
 ],
};
const groupName = (path: string) => path.split(' / ').at(-1)?.trim().toLowerCase();

function ScheduleGroups({title, groups}: {title:string;groups:Map<string,number|null>}) {
 return <details className="pnl-section"><summary className="cursor-pointer font-semibold">{title}</summary>
  {[...groups].map(([name, amount]) => <div className="pnl-line pl-4 text-sm" key={name}>
   <span>{name}</span><span>{amount === null ? '—' : money(amount)}</span>
  </div>)}
 </details>;
}

type Voucher = { reversed?:boolean; id:number; number:string; date:string; currency:string; kind:string; items: {id:number;description:string;quantity?:string;unit?:string;price?:string;net?:string;tax?:string}[]; total?:unknown; notes?:unknown; journal?:unknown };

type VoucherActions = { onDelete?: (id: number) => void };
function ProfitSection({section,sales,documents,onDelete}:{section?:Section;sales?:DetailedProfitLossData['salesBreakdown'];documents:Voucher[]} & VoucherActions){
 const [selectedGroup,setSelectedGroup]=useState<string|null>(null);
 const [selectedLedger,setSelectedLedger]=useState<string|null>(null);
 const [voucherId,setVoucherId]=useState<number|null>(null);
 const [confirmDelete, setConfirmDelete] = useState(false);
 if(!section)return null;
 const groups=[...new Set(section.accounts.map(a=>a.group))];
 const missing=(reportGroups[section.key] ?? []).filter(name =>
  !groups.some(group => groupName(group) === groupName(name)));
 const ledgers = section.accounts.filter(account => account.group === selectedGroup);
 const ledger = ledgers.find(account => account.code === selectedLedger);
 const voucher = documents.find(document => document.id === voucherId);
 return <details className="pnl-section"><summary className="cursor-pointer font-semibold"><span className="ml-1">{section.label}</span><span className="float-right tabular-nums">{money(section.total)}</span></summary>
 {sales&&<div className="pl-4 text-sm text-gray-600">{sales.map(s=><div className="pnl-line" key={s.kind}><span>{s.kind === 'cash' ? 'Cash Sales' : s.kind === 'credit' ? 'Credit Customer' : s.label}</span><span>{money(s.amount)}</span></div>)}</div>}
 {[...groups, ...missing].map(group => <button
  type="button" key={group} aria-haspopup="dialog"
  className="finance-secondary mt-2 flex w-full justify-between"
  onClick={() => setSelectedGroup(group)}>
  <span>{group}</span>
  <span>{groups.includes(group) ? money(section.groups.find(row => row.name === group)?.total ?? '0') : '—'}</span>
 </button>)}
 {selectedGroup !== null && <ConfirmationDialog wide title={voucherId !== null ? 'Voucher details' : ledger ? ledger.name : selectedGroup} closeLabel="Close group details" onClose={() => {setVoucherId(null);setSelectedLedger(null);setSelectedGroup(null);}}>
  {voucherId !== null ? <>
   <button type="button" className="finance-secondary mb-3" onClick={() => setVoucherId(null)}>Back to {ledger?.name}</button>
   {voucher ? <>
    {onDelete && !voucher.reversed && !['reverse', 'allocate'].includes(voucher.kind) && (
      <button type="button" className="finance-secondary mb-3" onClick={() => setConfirmDelete(true)}>Delete voucher</button>
    )}
    <dl className="mb-4 grid gap-3 sm:grid-cols-3">
     {[
      ['Voucher',voucher.number], ['Date',formatDisplayDate(voucher.date)], ['Type',voucher.kind],
      ['Payment type',ledger?.entries.find(entry => entry.document === voucherId)?.paymentType ?? 'Unrecorded'],
      ['Total',voucher.total == null ? '—' : voucher.currency + ' ' + money(String(voucher.total))],
      ['Notes',String(voucher.notes || '—')],
     ].map(([label,value]) => <div key={label}><dt className="text-sm text-gray-500">{label}</dt><dd className="capitalize">{value}</dd></div>)}
    </dl>
    {voucher.items.length > 0 && <div className="overflow-x-auto">
     <table className="finance-table">
      <thead><tr>{['Description','Quantity','Unit','Unit price','Net','Tax'].map(label => <th key={label}>{label}</th>)}</tr></thead>
      <tbody>{voucher.items.map(item => <tr key={item.id}>
       <td>{item.description}</td><td>{item.quantity}</td><td>{item.unit}</td>
       <td>{item.price}</td><td>{item.net}</td><td>{item.tax}</td>
      </tr>)}</tbody>
     </table>
    </div>}
    {Array.isArray(voucher.journal) && <div className="mt-4 overflow-x-auto">
     <table className="finance-table">
      <caption className="text-left font-semibold">Journal entries</caption>
      <thead><tr><th>Account</th><th>Debit</th><th>Credit</th></tr></thead>
      <tbody>{voucher.journal.map(line => <tr key={line.id}><td>{line.accountName}</td><td>{money(line.debit)}</td><td>{money(line.credit)}</td></tr>)}</tbody>
     </table>
    </div>}
   </> : <p>Voucher details are unavailable for this entry.</p>}
  </> : <>
  {ledger && <button type="button" className="finance-secondary mb-3" onClick={() => setSelectedLedger(null)}>Back to {selectedGroup}</button>}
  <div className="overflow-x-auto">
   <table className="finance-table">
    <thead><tr>{(ledger ? ['Date','Voucher','Type','Customer','Cost category','Payment type','Amount'] : ['Ledger','Amount']).map(label => <th key={label}>{label}</th>)}</tr></thead>
    <tbody>{ledger ? ledger.entries.map(entry => <tr key={entry.line}>
     <td>{formatDisplayDate(entry.date)}</td><td><button type="button" className="finance-secondary" onClick={() => setVoucherId(entry.document)}>{entry.number}</button></td><td>{entry.voucherType}</td>
     <td>{entry.customer}</td><td>{entry.category}</td>
     <td>{entry.paymentType === 'cash' ? 'Cash' : entry.paymentType === 'credit' ? 'Credit' : 'Unrecorded'}</td>
     <td className="text-right tabular-nums">{money(entry.amount)}</td>
    </tr>) : ledgers.map(account => <tr key={account.code}>
     <td><button type="button" className="finance-secondary" onClick={() => setSelectedLedger(account.code)}>{account.name} · {account.code}</button></td>
     <td className="text-right tabular-nums">{money(account.amount)}</td>
    </tr>)}</tbody>
    <tfoot><tr className="border-t font-semibold">
     <th scope="row" colSpan={ledger ? 6 : 1}>Grand Total</th>
     <td className="text-right tabular-nums">{money(ledger?.amount ?? section.groups.find(row => row.name === selectedGroup)?.total ?? '0')}</td>
    </tr></tfoot>
   </table>
   {(ledger ? !ledger.entries.length : !ledgers.length) &&
    <p className="py-3 text-sm text-gray-500">No posted vouchers for the selected period.</p>}
  </div>
  </>}
 </ConfirmationDialog>}
 {confirmDelete && voucher && onDelete && (
   <ConfirmationDialog
     title="Delete voucher?"
     closeLabel="Cancel"
     onClose={() => setConfirmDelete(false)}
     confirm={{ label: 'Delete voucher', action: () => {
       setConfirmDelete(false);
       setVoucherId(null);
       setSelectedLedger(null);
       setSelectedGroup(null);
       onDelete(voucher.id);
     } }}
   >
     <p>Voucher <strong>{voucher.number}</strong> will be permanently deleted. This action cannot be undone.</p>
   </ConfirmationDialog>
 )}
 {!section.accounts.length&&!missing.length&&<p className="pl-4 text-sm text-gray-500">No posted entries.</p>}</details>;
}
export function ProfitLossStatement({data,documents=[],onDelete}:{data:DetailedProfitLossData;documents?:Voucher[]} & VoucherActions){
 const section=(key:string)=>data.sections.find(s=>s.key===key);
 const gross=Number(data.totals.grossProfit),net=Number(data.totals.netProfit);
 const tradingTotal=Number(data.totals.tradingTotal),operatingTotal=Number(data.totals.operatingTotal);
 const stockGroups = (field: 'openingValue' | 'closingValue') => {
  const groups = new Map<string,number|null>([['Finished Goods', null]]);
  for (const row of data.stock?.rows ?? []) {
   const group = row.item.startsWith('finished:') ? 'Finished Goods'
    : row.item.startsWith('raw:') ? 'Raw Materials' : 'Other Stock';
   groups.set(group, (groups.get(group) ?? 0) + Number(row[field]));
  }
  return groups;
 };
 const purchases = new Map<string,number|null>(
  ['Nickson_rw Virgin', 'Pepsi', 'Raw Materials - Virgin', 'Raw Material Waste'].map(name => [name, null]),
 );
 for (const row of data.purchases?.rows ?? []) {
  const supplier = row.supplier || 'Unassigned supplier';
  const group = [...purchases.keys()].find(name => groupName(name) === groupName(supplier)) ?? supplier;
  purchases.set(group, (purchases.get(group) ?? 0) + Number(row.amount));
 }
 const balance=(label:string,value:number)=><div className="pnl-line pnl-balance"><strong>{label}</strong><strong>{money(value)}</strong></div>;
 return <div className="space-y-5"><header className="text-center"><h2 className="text-xl font-semibold">Profit &amp; Loss Account</h2><p className="font-medium">{data.company}</p><p>{data.customer?`Customer ledger: ${data.customer.name} · P-${data.customer.id}`:'Overall company'} · {data.start} to {data.end} · {data.currency}</p></header>
 {data.warnings.map((w,i)=><p key={i} role="note" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{w}</p>)}
 <div className="grid gap-3 sm:grid-cols-2">{[['Gross profit / loss',gross],['Net profit / loss',net]].map(([label,value])=><div className="rounded border bg-gray-50 p-3" key={String(label)}><p className="text-sm text-gray-500">{label}</p><strong className={Number(value)<0?'text-red-700':'text-emerald-800'}>{data.currency} {money(Number(value))}</strong></div>)}</div>
 <section className="pnl-sheet" aria-label="Trading and gross profit"><h3 className="pnl-caption">Trading account · expand groups and ledgers for vouchers</h3><p className="px-3 py-2 text-xs text-gray-500">Stock and purchase schedules support the trading account. Gross profit uses posted cost of goods sold. A dash indicates no matching posted data.</p><div className="pnl-columns"><div className="pnl-column"><p className="pnl-column-title">Particulars · Costs</p><ScheduleGroups title="Opening Stock" groups={stockGroups('openingValue')}/><ScheduleGroups title="Purchase Accounts" groups={purchases}/><ProfitSection documents={documents} onDelete={onDelete} section={section('cost_of_sales')}/><ProfitSection documents={documents} onDelete={onDelete} section={section('direct_expense')}/>{gross>=0&&balance('Gross profit c/o',gross)}{balance('Total',tradingTotal)}</div><div className="pnl-column"><p className="pnl-column-title">Particulars · Sales</p><ProfitSection documents={documents} onDelete={onDelete} section={section('sales')} sales={data.salesBreakdown}/><ScheduleGroups title="Closing Stock" groups={stockGroups('closingValue')}/>{gross<0&&balance('Gross loss c/o',-gross)}{balance('Total',tradingTotal)}</div></div></section>
 <section className="pnl-sheet" aria-label="Net profit and loss"><h3 className="pnl-caption">Profit &amp; loss account</h3><div className="pnl-columns"><div className="pnl-column"><p className="pnl-column-title">Particulars · Expenses</p>{gross<0&&balance('Gross loss b/f',-gross)}<ProfitSection documents={documents} onDelete={onDelete} section={section('indirect_expense')}/><ProfitSection documents={documents} onDelete={onDelete} section={section('unclassified_expense')}/>{net>=0&&balance('Net profit',net)}{balance('Total',operatingTotal)}</div><div className="pnl-column"><p className="pnl-column-title">Particulars · Income</p>{gross>=0&&balance('Gross profit b/f',gross)}<ProfitSection documents={documents} onDelete={onDelete} section={section('other_income')}/><ProfitSection documents={documents} onDelete={onDelete} section={section('unclassified_income')}/>{net<0&&balance('Net loss',-net)}{balance('Total',operatingTotal)}</div></div></section>
 {data.stock&&<details className="rounded border p-4" open><summary className="cursor-pointer font-semibold">Supporting stock schedule · not added to expenses again</summary><p className="my-2 text-sm text-gray-600">Opening {money(data.stock.openingValue)} + valued receipts {money(data.stock.receipts)} − valued issues {money(data.stock.issues)} = closing {money(data.stock.closingValue)} {data.currency}. Posted valuation records only; quantities retain their own units.</p><div className="overflow-x-auto"><table className="finance-table"><thead><tr>{['Stock item','Unit','Opening qty','Opening value','Receipts value','Issues value','Closing qty','Closing value'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{data.stock.rows.map(r=><tr key={r.item}><td>{r.name}<small className="block">{r.item}</small></td><td>{r.unit}</td><td>{r.openingQuantity}</td><td>{money(r.openingValue)}</td><td>{money(r.receipts)}</td><td>{money(r.issues)}</td><td>{r.closingQuantity}</td><td>{money(r.closingValue)}</td></tr>)}</tbody></table>{!data.stock.rows.length&&<p>No posted inventory valuation records.</p>}</div></details>}
 {data.purchases&&<details className="rounded border p-4"><summary className="cursor-pointer font-semibold">Supporting purchase bills · {data.currency} {money(data.purchases.total)}</summary><p className="my-2 text-sm text-gray-600">Net posted bills and reversals at their saved exchange rates. Purchases may be stock, assets or expenses; this schedule is not added again to P&amp;L.</p><div className="overflow-x-auto"><table className="finance-table"><thead><tr><th>Date</th><th>Voucher</th><th>Supplier</th><th>Net value</th></tr></thead><tbody>{data.purchases.rows.map(r=><tr key={r.document}><td>{r.date}</td><td>{r.number}</td><td>{r.supplier}</td><td>{money(r.amount)}</td></tr>)}</tbody></table></div></details>}
 {data.customer&&<p className="text-sm text-gray-600">Company-wide unassigned income: {data.currency} {money(data.companyUnassigned.income)} · unassigned expenses: {money(data.companyUnassigned.expenses)}. These amounts are excluded from this customer’s P&amp;L.</p>}
 <p className="text-xs text-gray-500">{data.basis} Negative figures represent credits or reversals. Current ledger names, groups and P&amp;L classifications apply to the selected period.</p></div>;
}
export function FinanceProfitLoss({start,end,refreshToken,documents,onDelete}:{start:string;end:string;refreshToken:unknown;documents:Voucher[]} & VoucherActions){
 const [revision,setRevision]=useState(0),[data,setData]=useState<DetailedProfitLossData|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let live=true;setLoading(true);setData(null);setError('');void api.get<DetailedProfitLossData>('/accounting/detailed-profit-loss/',{params:{start,end}}).then(({data})=>{if(live)setData(data);}).catch(cause=>{if(live)setError(financeErrorMessage(cause));}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[start,end,revision,refreshToken]);
 return <div className="space-y-4"><div className="flex flex-wrap items-end gap-3"><button type="button" className="finance-secondary" disabled={loading} onClick={()=>setRevision(n=>n+1)}><RefreshCw size={16}/>Refresh P&amp;L</button><button type="button" className="finance-secondary" disabled={!data||loading} onClick={()=>data&&saveCsv(data)}><Download size={16}/>Export detailed P&amp;L CSV</button></div>{loading&&<p role="status">Loading detailed Profit &amp; Loss…</p>}{error&&<p role="alert" className="rounded border border-red-200 p-3 text-red-700">{error}</p>}{data&&<ProfitLossStatement data={data} documents={documents} onDelete={onDelete}/>}</div>;
}
