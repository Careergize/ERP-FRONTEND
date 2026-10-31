import { ArrowUpFromLine } from 'lucide-react';
import { StockOutSaleModal } from './StockOutSaleModal';
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useOutletContext, useLocation } from 'react-router-dom';
import { loadCustomers, customerError } from '@/lib/customersApi';
import { Card } from '@/components/ui/Card';
import { ENTRY_INPUT } from '@/components/ui/SearchSelect';
import { useAuth } from '@/context/AuthContext';
import { SalesManagementProvider, useSalesManagement } from '@/context/SalesManagementContext';
import { SALES_VIEW_ROLES, SALES_EDIT_ROLES, SALES_QC_ROLES, salesRestockingReadiness, emptySalesFilters, filterSalesLedger, salesLedger, salesSummary, salesCsv, type SalesFilters, type SalesLedgerRow, type SalesReturn, type CreditNote, type SalesInvoice } from '@/lib/salesManagement';
import { ReturnEditor, CreditEditor, SalesDocumentDetail, SalesDialog } from './SalesDocuments';
import { SalesTabs } from './SalesTabs';

export const SALES_BUTTON='rounded-card border border-gray-200 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50';
const amount=(n:number)=>n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
interface FilterContext { filters:SalesFilters;rows:SalesLedgerRow[];currency:string;documentStatus:string;setDocumentStatus:(value:string)=>void }
export function SalesLayout(){const {user}=useAuth();const {pathname}=useLocation();if(!user||!SALES_VIEW_ROLES.includes(user.role))return <Navigate to="/" replace/>;if(SALES_QC_ROLES.includes(user.role)&&pathname!=='/sales/returns')return <Navigate to="/sales/returns" replace/>;return <SalesManagementProvider key={user.id}><SalesFrame/></SalesManagementProvider>;}
function SalesFrame(){
  const store=useSalesManagement();const {user}=useAuth();const {pathname}=useLocation();
  const [salesOut,setSalesOut]=useState(false),[dispatchNotice,setDispatchNotice]=useState('');
  const canDispatch=['admin','receptionist'].includes(user?.role??'')&&!user?.id.startsWith('demo-');
  const [masterCustomers,setMasterCustomers]=useState<{key:string;name:string}[]>([]);
  const [customerLoadError,setCustomerLoadError]=useState('');
  const [customerRevision,setCustomerRevision]=useState(0);
  useEffect(()=>{let live=true;setMasterCustomers([]);setCustomerLoadError('');
    if(store.source!=='saved'||!user||user.id.startsWith('demo-'))return;
    void loadCustomers().then(rows=>{if(live)setMasterCustomers(rows.map(c=>({key:'customer:'+c.id.replace(/^db:/,''),name:c.name})));}).catch(error=>{if(live)setCustomerLoadError(customerError(error));});
    return()=>{live=false;};
  },[user?.id,store.source,customerRevision]);
  const [sectionFilters,setSectionFilters]=useState<Record<string,SalesFilters>>({});
  const [sectionStatuses,setSectionStatuses]=useState<Record<string,string>>({});
  const filters=sectionFilters[pathname]??emptySalesFilters();
  const setFilters=(next:SalesFilters|((previous:SalesFilters)=>SalesFilters))=>setSectionFilters(all=>({...all,[pathname]:typeof next==='function'?next(all[pathname]??emptySalesFilters()):next}));
  useEffect(()=>{setSectionFilters({});setSectionStatuses({});},[store.source]);
  const currencies=[...new Set([...store.invoices.map(i=>i.currency),...store.state.returns.map(r=>r.invoice.currency)])].sort();
  const currency=filters.currency||currencies[0]||'',effective={...filters,currency};
  const customers=new Map([...masterCustomers.map(c=>[c.key,c.name] as const),...store.invoices.map(i=>[i.customerKey,`${i.customer}${i.linkedCustomer?'':` · ${i.number} (unlinked customer)`}`] as const)]);
  const products=new Map(store.invoices.flatMap(i=>i.lines.map(l=>[l.productId,l.product] as const)));
  const rows=filterSalesLedger(salesLedger(store.invoices,store.state),store.invoices,effective);
  const change=(key:keyof SalesFilters,value:string)=>setFilters(f=>({...f,[key]:value}));
  const invalidRange=!!filters.from&&!!filters.to&&filters.from>filters.to;
  return <div className="space-y-5">
    <header><h1 className="text-2xl font-semibold text-navy">Sales Management</h1><p className="text-sm text-gray-500">Customer sales, return previews and credit-note previews</p></header>
    {canDispatch&&<Card><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-navy">Sales dispatch · Stock OUT</h2><p className="mt-1 text-sm text-gray-600">Dispatch an approved Sales Order, view the customer ledger balance, and choose cash or credit. Confirmation saves Stock OUT, the invoice and any cash receipt.</p></div><button type="button" className="flex items-center gap-2 rounded-card bg-navy px-4 py-2 text-sm text-white disabled:opacity-50" disabled={store.source!=='saved'} onClick={()=>setSalesOut(true)}><ArrowUpFromLine size={18} aria-hidden="true"/>Stock OUT</button></div>{store.source==='demo'&&<p className="mt-2 text-sm text-gray-500">Choose Saved invoice snapshots to dispatch real orders.</p>}</Card>}
    {salesOut&&canDispatch&&<StockOutSaleModal onClose={()=>setSalesOut(false)} onRecorded={order=>{setDispatchNotice(`Dispatch saved for ${order.orderNumber}. Stock, customer invoice and payment treatment updated.`);store.refresh();}}/>}
    {dispatchNotice&&<p role="status" className="rounded-card bg-emerald-50 p-3 text-sm text-emerald-900">{dispatchNotice}</p>}
    <SalesTabs role={user?.role}/>
    <label className="block max-w-sm text-sm">Data source<select className={ENTRY_INPUT} value={store.source} onChange={e=>store.setSource(e.target.value as 'saved'|'demo')}><option value="saved">Saved invoice snapshots</option><option value="demo">Explicit example workspace</option></select></label>
    <div role="note" className="rounded-card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>{store.source==='demo'?'Example data — not business transactions.':'Read-only saved invoice snapshots.'}</strong> All new returns, inspections, credit notes and approvals are frontend previews. Saved-invoice previews are lost when leaving this workspace. Explicit examples remain in this tab’s memory so a different signed-in profile can review them; a refresh clears them. Return and credit-note previews do not save to the server, restock inventory or post accounting. The separate Sales dispatch action above saves real transactions. Creators, editors and submitters cannot review their own documents, including Admins. UI roles are preview controls, not server authorization.</div>
    {store.notice&&<p role="status" className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{store.notice}</p>}
    {store.source==='saved'&&<p className="text-sm text-gray-600">Existing invoice records have no authoritative issuance/payment status; shown as “Recorded”. Unlinked customer identities remain invoice-specific to avoid merging different customers by name. <button className={SALES_BUTTON} onClick={store.refresh} disabled={store.loading}>Refresh invoice snapshots</button></p>}
    {store.loading?<p role="status">Loading existing invoice records…</p>:store.error?<Card><p role="alert" className="text-red-700">{store.error}</p><button className={SALES_BUTTON} onClick={store.refresh}>Retry invoice read</button></Card>:<>
      {store.issues.length>0&&<details className="rounded border border-amber-200 p-3"><summary>{store.issues.length} invalid invoice snapshot(s) excluded; totals are incomplete</summary><ul className="list-disc pl-5">{store.issues.map((issue,i)=><li key={i}>{issue}</li>)}</ul></details>}
      <Card><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm">From<input aria-label="From date" className={ENTRY_INPUT} type="date" value={filters.from} onChange={e=>change('from',e.target.value)}/></label><label className="text-sm">To<input aria-label="To date" className={ENTRY_INPUT} type="date" value={filters.to} onChange={e=>change('to',e.target.value)}/></label>
        <label className="text-sm">Customer<select className={ENTRY_INPUT} value={filters.customer} onChange={e=>change('customer',e.target.value)}><option value="">All customers</option>{[...customers].map(([key,name])=><option key={key} value={key}>{name}</option>)}</select><button type="button" className={SALES_BUTTON+' mt-2'} onClick={()=>setCustomerRevision(v=>v+1)}>Refresh customers</button>{customerLoadError&&<span role="alert" className="mt-2 block text-xs text-red-700">{customerLoadError}</span>}</label>
        <label className="text-sm">Item / Product<select className={ENTRY_INPUT} value={filters.product} onChange={e=>change('product',e.target.value)}><option value="">All invoiced products</option>{[...products].map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
        <label className="text-sm">Invoice status<select className={ENTRY_INPUT} value={filters.invoiceStatus} onChange={e=>change('invoiceStatus',e.target.value)}><option value="">All invoice statuses</option>{['Recorded','Issued','Draft','Cancelled'].map(s=><option key={s}>{s}</option>)}</select></label>
        <label className="text-sm">Currency<select className={ENTRY_INPUT} value={currency} onChange={e=>change('currency',e.target.value)}>{!currencies.length&&<option value="">No invoices</option>}{currencies.map(c=><option key={c}>{c}</option>)}</select></label>
        <label className="text-sm">Search<input className={ENTRY_INPUT} value={filters.search} placeholder="Reference, customer or product" onChange={e=>change('search',e.target.value)}/></label><div className="flex items-end"><button className={SALES_BUTTON} onClick={()=>setFilters(emptySalesFilters())}>Reset filters</button></div>
      </div>{invalidRange&&<p role="alert" className="mt-2 text-red-700">From date must be on or before To date.</p>}</Card>
      {!invalidRange&&<Outlet context={{filters:effective,rows,currency,documentStatus:sectionStatuses[pathname]??'',setDocumentStatus:(value:string)=>setSectionStatuses(all=>({...all,[pathname]:value}))} satisfies FilterContext}/>}
    </>}
  </div>;
}
function useFilteredSales(){return useOutletContext<FilterContext>();}
function SummaryCards({rows,currency}:{rows:SalesLedgerRow[];currency:string}){
  const {state}=useSalesManagement(),summary=salesSummary(rows,state);
  const cards:[string,string|number][]=[['Total Sales Value',`${currency} ${amount(summary.gross)}`],['Total Invoices',summary.invoices],['Total Customers',summary.customers],['Total Sales Returns',summary.returns],['Total Credit Notes Issued (approved preview)',summary.credits],['Total Return Value (approved, tax inclusive)',`${currency} ${amount(summary.adjustment)}`],['Net Sales Value (tax inclusive)',`${currency} ${amount(summary.net)}`],['Net Sales Value (tax exclusive)',`${currency} ${amount(summary.taxExclusiveNet)}`]];
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value])=><Card key={label}><p className="text-xs text-gray-500">{label}</p><p className="mt-2 text-xl font-semibold text-navy">{value}</p></Card>)}</div>;
}
export function SalesDashboard(){
  const {rows,currency}=useFilteredSales();const [detail,setDetail]=useState<SalesLedgerRow|null>(null);
  const monthly=groupChart(rows,r=>r.date.slice(0,7)),customers=groupChart(rows,r=>r.customerKey,r=>`${r.customer}${r.customerKey.startsWith('unlinked:')?` · ${r.invoiceNumber}`:''}`);
  return <section className="space-y-5"><h2 className="text-xl font-semibold">Sales Dashboard</h2><SummaryCards rows={rows} currency={currency}/>
    <p className="text-sm text-gray-600">Gross sales and net sales use invoice totals including existing VAT/LED. Tax-exclusive net excludes those components. Approved preview returns reduce net once; linked credit notes document that adjustment. Outstanding receivables are unavailable: payments and customer opening balances are not integrated.</p>
    <div className="grid gap-4 lg:grid-cols-2"><SalesChart title="Monthly sales" currency={currency} values={monthly}/><SalesChart title="Customer-wise sales" currency={currency} values={customers}/><SalesChart title="Sales vs Returns" currency={currency} values={monthly} returns/></div>
    <Card><h3 className="mb-3 font-semibold">Recent sales transactions</h3><RecentRows rows={rows.filter(r=>r.type==='Sale').slice(-5).reverse()} onView={setDetail}/></Card>
    <Card><h3 className="mb-3 font-semibold">Recent customer returns</h3><RecentRows rows={rows.filter(r=>r.type==='Return').slice(-5).reverse()} onView={setDetail}/></Card>
    {detail&&<LedgerDetail row={detail} onClose={()=>setDetail(null)}/>}
  </section>;
}
function groupChart(rows:SalesLedgerRow[],label:(r:SalesLedgerRow)=>string,display=label){const groups=new Map<string,{label:string;sales:number;returns:number}>();for(const r of rows){if(r.type==='Credit Note')continue;const key=label(r),entry=groups.get(key)??{label:display(r),sales:0,returns:0};entry.sales+=r.debit;entry.returns+=r.credit;groups.set(key,entry);}return [...groups.values()];}
export function SalesChart({title,currency,values,returns:showReturns=false}:{title:string;currency:string;values:{label:string;sales:number;returns:number}[];returns?:boolean}){
  const max=Math.max(1,...values.flatMap(v=>[v.sales,v.returns]));return <Card><figure aria-label={title}><figcaption className="mb-3 font-semibold">{title}</figcaption><p className="mb-3 text-xs text-gray-500">{currency} · tax-inclusive amounts · current filters. Green: Sales{showReturns?' · Amber: Approved returns':''}.</p>{!values.length?<p className="text-sm text-gray-500">No transactions match these filters.</p>:<div className="max-h-72 space-y-3 overflow-y-auto">{values.map(v=><div key={v.label}><p className="mb-1 text-xs">{v.label} · Sales {amount(v.sales)}{showReturns?` / Returns ${amount(v.returns)}`:''}</p><div className="h-3 rounded bg-gray-100"><div className="h-3 rounded bg-emerald-600" style={{width:`${v.sales/max*100}%`}}/></div>{showReturns&&<div className="mt-1 h-3 rounded bg-gray-100"><div className="h-3 rounded bg-amber-500" style={{width:`${v.returns/max*100}%`}}/></div>}</div>)}</div>}</figure></Card>;
}
function RecentRows({rows,onView}:{rows:SalesLedgerRow[];onView:(r:SalesLedgerRow)=>void}){return rows.length?<ul className="divide-y">{rows.map(r=><li key={r.key} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{r.date} · {r.reference} · {r.customer} · {r.status}</span><button className="underline" onClick={()=>onView(r)}>{r.currency} {amount(r.debit||r.credit)} · View</button></li>)}</ul>:<p className="text-sm text-gray-500">No transactions match these filters.</p>;}
export function SalesLedgerPage(){
  const {rows,filters,currency}=useFilteredSales(),store=useSalesManagement();const [page,setPage]=useState(1),[detail,setDetail]=useState<SalesLedgerRow|null>(null);
  useEffect(()=>setPage(1),[JSON.stringify(filters),rows.length]);const pages=Math.max(1,Math.ceil(rows.length/20)),current=Math.min(page,pages),summary=salesSummary(rows,store.state);
  const exportCsv=()=>{const url=URL.createObjectURL(new Blob([salesCsv(rows)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`sales-ledger-${currency||'empty'}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  return <section className="space-y-4"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-semibold">Sales Ledger</h2><button className={SALES_BUTTON} disabled={!rows.length} onClick={exportCsv}>Export filtered CSV</button></div><SummaryCards rows={rows} currency={currency}/>
    {filters.customer&&<Card><h3 className="font-semibold">Selected customer</h3><p className="text-sm">Invoiced: {currency} {amount(summary.gross)} · Approved returns: {currency} {amount(summary.adjustment)} · Approved credit-note face value: {currency} {amount(summary.creditValue)} (already represented by returns)</p><p className="text-sm">Approved returned quantities: {Object.entries(summary.quantities).map(([unit,q])=>`${q} ${unit}`).join(' · ')||'None'}</p></Card>}
    <p className="text-sm text-gray-600">Debit = invoice sales; credit = approved preview return adjustment. Credit-note rows add zero credit to avoid double counting. Running balances are per customer and currency across full available history, before date/search/product filters. They exclude payments/openings and are not outstanding receivables. Quantities in different units are never summed.</p>
    <div className="overflow-x-auto rounded-card border bg-white"><table className="w-full text-left text-sm"><thead className="bg-gray-50"><tr>{['Date','Customer','Reference No.','Transaction Type','Product','Reason','Quantity','Unit','Debit','Credit','Customer sales balance','Status','Action'].map(t=><th className="whitespace-nowrap p-3" key={t}>{t}</th>)}</tr></thead><tbody>{rows.slice((current-1)*20,current*20).map(r=><tr className="border-t" key={r.key}>{[r.date,r.customer,r.reference,r.type,r.product,r.reason,r.quantity,r.unit,amount(r.debit),amount(r.credit),amount(r.balance),r.status].map((v,i)=><td key={i} className="p-3">{v}</td>)}<td className="p-3"><button className="underline" onClick={()=>setDetail(r)}>View details</button></td></tr>)}</tbody></table>{!rows.length&&<p className="p-8 text-center text-gray-500">No sales transactions match the selected filters.</p>}</div><div className="flex items-center gap-3"><button className={SALES_BUTTON} disabled={current===1} onClick={()=>setPage(current-1)}>Previous</button><span>Page {current} / {pages} · {rows.length} rows</span><button className={SALES_BUTTON} disabled={current===pages} onClick={()=>setPage(current+1)}>Next</button></div>{detail&&<LedgerDetail row={detail} onClose={()=>setDetail(null)}/>}</section>;
}
function LedgerDetail({row,onClose}:{row:SalesLedgerRow;onClose:()=>void}){
  const store=useSalesManagement();const doc=row.type==='Return'?store.state.returns.find(r=>r.id===row.documentId):row.type==='Credit Note'?store.state.credits.find(c=>c.id===row.documentId):store.invoices.find(i=>i.id===row.documentId);
  return doc?<SalesDocumentDetail document={doc} kind={row.type} onClose={onClose}/>:<SalesDialog title={row.reference} onClose={onClose}><p>{row.note}</p></SalesDialog>;
}
export function SalesDocumentsPage({kind}:{kind:'return'|'credit'}){
  const store=useSalesManagement(),{rows,filters,documentStatus:status,setDocumentStatus:setStatus}=useFilteredSales(),{user}=useAuth();const [editor,setEditor]=useState<{id?:string}|null>(null),[detail,setDetail]=useState<SalesReturn|CreditNote|null>(null),[page,setPage]=useState(1);
  useEffect(()=>setPage(1),[JSON.stringify(filters),status,kind]);
  const ids=new Set(rows.filter(r=>r.type===(kind==='return'?'Return':'Credit Note')).map(r=>r.documentId));
  const records=(kind==='return'?store.state.returns:store.state.credits).filter(r=>ids.has(r.id)&&(!status||r.status===status)).sort((a,b)=>b.date.localeCompare(a.date)||b.number.localeCompare(a.number));
  const pages=Math.max(1,Math.ceil(records.length/15)),current=Math.min(page,pages),canEdit=!!user&&SALES_EDIT_ROLES.includes(user.role);
  return <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">{kind==='return'?'Sales Returns':'Credit Notes'}</h2><button className={SALES_BUTTON} disabled={!canEdit||!store.invoices.length} onClick={()=>setEditor({})}>{kind==='return'?'New Sales Return':'Create Credit Note'}</button></div><p className="text-sm text-gray-600">{kind==='return'?'Returned goods require inspection/QC before any restocking decision. No return status changes Finished Goods stock.':'Create from an approved return. VAT/LED values are read-only allocations of the original invoice, not newly calculated tax rules. No journal posting occurs.'}</p><label className="block max-w-xs text-sm">Approval status<select className={ENTRY_INPUT} value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{['Draft','Submitted','Pending Approval','Approved','Rejected','Cancelled'].map(s=><option key={s}>{s}</option>)}</select></label>
    <div className="overflow-x-auto rounded-card border bg-white"><table className="w-full text-left text-sm"><thead className="bg-gray-50"><tr>{['Reference','Date','Customer','Original Invoice','Product','Reason','Quantity / Unit','Value (tax inclusive)','Status','QC / Restocking','Actions'].map(s=><th className="p-3" key={s}>{s}</th>)}</tr></thead><tbody>{records.slice((current-1)*15,current*15).map(r=><tr key={r.id} className="border-t">{[r.number,r.date,r.invoice.customer,r.invoice.number,r.line.product,r.reason,`${r.quantity} ${r.line.unit}`,`${r.invoice.currency} ${amount(r.total)}`,r.status,'inspections' in r?salesRestockingReadiness(r):'Not applicable'].map((s,i)=><td className="p-3" key={i}>{s}</td>)}<td className="p-3"><div className="flex gap-3"><button className="underline" onClick={()=>setDetail(r)}>View / actions</button>{canEdit&&r.status==='Draft'&&<button className="underline" onClick={()=>setEditor({id:r.id})}>Edit draft</button>}</div></td></tr>)}</tbody></table>{!records.length&&<p className="p-8 text-center text-gray-500">No {kind==='return'?'sales returns':'credit notes'} match these filters. New documents remain session-only.</p>}</div><div className="flex items-center gap-3"><button className={SALES_BUTTON} disabled={current===1} onClick={()=>setPage(current-1)}>Previous</button><span>Page {current} / {pages}</span><button className={SALES_BUTTON} disabled={current===pages} onClick={()=>setPage(current+1)}>Next</button></div>
    {editor&&(kind==='return'?<ReturnEditor id={editor.id} onClose={()=>setEditor(null)}/>:<CreditEditor id={editor.id} onClose={()=>setEditor(null)}/>)}
    {detail&&<SalesDocumentDetail key={detail.id} document={(kind==='return'?store.state.returns:store.state.credits).find(r=>r.id===detail.id)??detail} kind={kind==='return'?'Return':'Credit Note'} onClose={()=>setDetail(null)}/>}
  </section>;
}

export function SalesInvoiceSnapshot({invoice}:{invoice:SalesInvoice}){return <div className="space-y-2 text-sm"><p>{invoice.number} · {invoice.date} · {invoice.customer} · {invoice.currency}</p><p>Sales Order: {invoice.orderNumber||invoice.orderId||'Not supplied'} · Invoice status: {invoice.status}</p><p>Original price basis: {invoice.taxMode}; invoice net {amount(invoice.net)}, VAT {amount(invoice.vat)}, LED {amount(invoice.led)}, total {amount(invoice.total)}.</p>{invoice.lines.map(l=><p key={l.key}>{l.product} · {l.quantity} {l.unit} · Original unit price {amount(l.unitPrice)} · Allocated total {amount(l.total)}</p>)}</div>;}
export function SalesField({label,children}:{label:string;children:ReactNode}){return <label className="block text-sm">{label}{children}</label>;}
