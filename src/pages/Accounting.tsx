import { formatDisplayDate } from '@/lib/formatDisplayDate';
import { FinanceProfitLoss } from './FinanceProfitLoss';
import { FinanceValuationItem } from './FinanceValuationItem';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { useInventory } from '@/context/InventoryContext';
import { finishedBalance, finishedGoodLabel } from '@/lib/finishedGoodsData';
import { RAW_CATEGORY_LABEL } from '@/lib/rawMaterialData';
import { financeErrorMessage as msg } from '@/lib/financeApiErrors';
import { FinanceAnalysisHome } from './FinanceAnalysisHome';
import { FinanceAnalysis } from './FinanceAnalysis';
import { Card } from '@/components/ui/Card';
import { CustomerProfitability, UninvoicedOrders, type CustomerProfit, type OrderCommitments } from './FinanceInsights';
import { BookOpen, ChartNoAxesCombined, CircleDollarSign, Clock3, FileText, Layers, Plus, RefreshCw, Settings2, Wallet } from 'lucide-react';
import { FinanceMasters, type FinanceMasterData } from './FinanceMasters';
import './finance.css';

type Row = Record<string, unknown>;
type Account = { code: string; name: string; kind: string; cash: boolean; control: boolean; pnl_section?: string; group_id?: number | null };
type Party = { id: number; name: string; kind: string; group_id?: number | null };
type Book = { company: string; currency: string; startDate: string; fiscalMonth: number; closedThrough: string; valuation: string };
type Bootstrap = FinanceMasterData & { book: Book | null; accounts: Account[]; parties: Party[]; canWrite: boolean; canConfigure: boolean; supportsManualCashSales?: boolean; supportsPaidPurchases?: boolean; purchaseMethods?: { value: string; label: string }[]; receiptModes?: { value: string; label: string }[] };
type Doc = { id: number; number: string; date: string; kind: string; party: number | null; currency: string; outstanding: string | null; reversed: boolean; items: { id: number; description: string }[] };
type ReceiptInvoice = Pick<Doc, 'id' | 'number' | 'date' | 'currency' | 'outstanding' | 'items'> & { total?: string; paid?: string; paymentType?: string };
type CashFlowEntry = {document:number;line:number|null;date:string;voucher:string;kind:string;party:string;notes:string;direction:string;amount:string};
type Report = { groupSummary?: Row[]; partyGroupSummary?: Row[]; costCategorySummary?: Row[]; customerProfit?: CustomerProfit; assignableCosts?: Row[]; orderCommitments?: OrderCommitments; currency: string; cashFlowDetails?: Row[]; cashFlowSummary?: {group:string;ledger:string;inflow:string;outflow:string;entries?:CashFlowEntry[]}[]; cashFlowGroupMapping?: Row[]; profitLoss: { income: string; expenses: string; netProfit: string; accounts: Row[] }; balanceSheet: { assets: string; liabilities: string; equity: string; retainedEarnings: string; difference: string; accounts: Row[] }; trialBalance: Row[]; trialDifference: string; cashFlow: Record<string,string>; cashBank: Row[]; partyBalances: Row[]; ledger: Row[]; ledgerOpening: string; ledgerClosing: string; transactions: Row[]; documents: (Doc & Row)[]; inventory: Row[] };
type Item = { item: string; description: string; quantity: string; unit: string; price: string; tax: string; account: string };
type Allocation = { bill: string; itemLine: string; amount: string };
type Queue = { source: string; payload: Row; error: string };
type Purchase = { id:number;number:string;supplier:string;currency:string;lines:{id:number;description:string;unit:string;remaining:string;price:string}[] };
const receiptModeHelp: Record<string,string> = {
  advance: 'Record money received before an invoice. Apply it later from Advances.',
  'against-ref': 'Apply the full receipt amount to one or more outstanding invoices. A receipt can pay part of an invoice.',
  'new-ref': 'Record the receipt under a new reference for a current purchase. Post its sales invoice separately and apply the receipt from Advances.',
  'on-account': 'Credit the customer ledger without selecting a particular invoice.',
};

const voucherCategories = [
  ['receipt', 'Receipt (customer receipt)'],
  ['payment', 'Payment (supplier payment)'],
  ['invoice', 'Sales (sales invoice)'],
  ['bill', 'Purchase (supplier bill)'],
  ['expense', 'Expense'],
  ['transfer', 'Contra (cash or bank transfer)'],
  ['journal', 'Journal entry'],
  ['opening', 'Opening balances'],
  ['reverse', 'Reverse voucher'],
];

const input = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm';
const button = 'rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-50';
const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const money = (v: unknown) => Number(v ?? 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const emptyItem = (): Item => ({item:'',description:'',quantity:'1',unit:'',price:'',tax:'0',account:'6100'});

function Table({ rows, columns }: { rows: Row[]; columns?: string[] }) {
  const keys=columns ?? Object.keys(rows[0] ?? {}).filter(k => !rows.some(r => typeof r[k]==='object' && r[k]!==null));
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{keys.map(k=><th className="whitespace-nowrap border-b px-3 py-3" key={k}>{k.replace(/([A-Z])/g,' $1')}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{keys.map(k=><td className="border-b px-3 py-3" key={k}>{typeof r[k]==='boolean' ? r[k]?'Yes':'No' : formatDisplayDate(String(r[k] ?? '—'))}</td>)}</tr>)}</tbody></table>{!rows.length && <p className="py-5 text-sm text-gray-500">No posted records for these filters.</p>}</div>;
}
function PartyLedgerDetails({ report, party }: { report: Report; party: string }) {
  const ledgerDocuments = new Set(report.ledger.map(row => String(row.document)));
  const documents = report.documents.filter(doc => String(doc.party) === party || ledgerDocuments.has(String(doc.id)));
  const documentIds = new Set(documents.map(doc => String(doc.id)));
  const items = report.transactions.filter(row => documentIds.has(String(row.document)));

  return <>
    {[
      { kind: 'invoice', title: 'Sales invoice details' },
      { kind: 'bill', title: 'Purchase bill details' },
      { kind: 'receipt', title: 'Customer receipts' },
      { kind: 'payment', title: 'Supplier payments' },
    ].map(({ kind, title }) => {
      const vouchers = documents.filter(doc => doc.kind === kind);
      const itemRows = items.filter(row => row.kind === kind);
      const isTrade = kind === 'invoice' || kind === 'bill';
      return <section key={kind} className="mt-5">
        <h3 className="font-semibold">{title}</h3>
        <Table rows={vouchers.map(doc => {
          const payment = kind === 'invoice' ? doc.salePayment : doc.purchasePayment;
          return {
          date: doc.date, voucher: doc.number, currency: doc.currency,
          amount: doc.total == null ? null : money(doc.total),
          ...(isTrade && {
            paymentType: payment === 'cash' ? 'Cash' : payment === 'credit' ? 'Credit' : 'Unknown',
            outstanding: doc.outstanding == null ? null : money(doc.outstanding),
          }),
          status: doc.reversed ? 'Reversed' : 'Posted', notes: doc.notes,
          };
        })} />
        {itemRows.length > 0 && <Table rows={itemRows} columns={['date','number','description','quantity','unit','price','net','tax','currency']} />}
      </section>;
    })}
  </>;
}
 
const cashFlowGroups = [
  'Current Assets', 'Sales Accounts', 'Purchase Accounts',
  'Direct Expenses', 'Indirect Income', 'Indirect Expenses',
];

function CashFlowSummary({report}: {report: Report}) {
  if (!report.cashFlowSummary) return null;
  const totals = {inflow: 0, outflow: 0};
  const columns = (['inflow', 'outflow'] as const).map(direction => {
    const groups = new Map<string, {ledger:string; amount:number; vouchers:CashFlowEntry[]}[]>();
    for (const row of report.cashFlowSummary ?? []) {
      const amount = Number(row[direction]);
      if (!amount) continue;
      const entries = groups.get(row.group) ?? [];
      entries.push({ledger:row.ledger, amount, vouchers:(row.entries ?? []).filter(entry => entry.direction === direction)});
      groups.set(row.group, entries);
      totals[direction] += amount;
    }
    return <section key={direction} className="pnl-column flex flex-col">
      <h3 className="pnl-column-title capitalize">{direction}</h3>
      <div className="flex-1">
        {[...groups].map(([group, entries]) => <details className="pnl-section" key={group}>
          <summary className="cursor-pointer font-semibold">
            <span className="ml-1">{group}</span>
            <span className="float-right tabular-nums">{money(entries.reduce((sum, row) => sum + row.amount, 0))}</span>
          </summary>
          {entries.map(row => <details className="mt-2 pl-4 text-sm" key={row.ledger}>
            <summary className="cursor-pointer">
              <span className="ml-1">{row.ledger}</span>
              <span className="float-right tabular-nums">{money(row.amount)}</span>
            </summary>
            <Table rows={row.vouchers.map(voucher => ({
              date: voucher.date, voucher: voucher.voucher, type: voucher.kind,
              party: voucher.party, notes: voucher.notes, amount: money(voucher.amount),
            }))} />
          </details>)}
        </details>)}
        {!groups.size && <p className="p-3 text-sm text-gray-500">No posted {direction}.</p>}
      </div>
      <div className="pnl-line pnl-balance"><strong>Total</strong><strong>{money(totals[direction])}</strong></div>
    </section>;
  });
  const net = totals.inflow - totals.outflow;
  return <section className="pnl-sheet mb-4" aria-label="Cash Flow Summary">
    <div className="pnl-columns">{columns}</div>
    <p className="pnl-caption text-center font-semibold">Net {net < 0 ? 'outflow' : net > 0 ? 'inflow' : 'cash flow'} · {report.currency} {money(Math.abs(net))}</p>
  </section>;
}

function CashFlowView({ report, start, end }: { report: Report; start: string; end: string }) {
  const flow = report.cashFlowDetails ?? Object.entries(report.cashFlow).map(([category, net]) => ({ category, net }));
  const groups = cashFlowGroups.flatMap(name => {
    const matching = (report.groupSummary ?? []).filter(row =>
      String(row.name).trim().toLowerCase().replace(/incomes$/, 'income') === name.toLowerCase());
    return matching.length ? matching : [{ name, status: 'Group not configured' }];
  });

  return <div className="space-y-4">
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Cash Flow Summary</h2>
          <p className="text-sm text-gray-500">{formatDisplayDate(start)} to {formatDisplayDate(end)} · {report.currency}</p>
        </div>
        <button type="button" className={button} onClick={() => exportCsv('cash-flow', flow)}>Export cash flow CSV</button>
      </div>
      <CashFlowSummary report={report}/>
      <Table rows={flow} columns={report.cashFlowDetails ? ['category','inflows','outflows','net'] : ['category','net']} />
    </Card>
    <Card>
      <h3 className="font-semibold">Account group balances</h3>
      <p className="mb-3 text-sm text-gray-500">Group balances include credit activity and use debit-positive signs. Parent balances include their subgroups.</p>
      <Table rows={groups} columns={['name','opening','debit','credit','balance','status']} />
    </Card>
    {report.cashFlowGroupMapping?.length ? <Card>
      <h3 className="font-semibold">Tally group classification</h3>
      <p className="mb-3 text-sm text-gray-500">Use these classifications when reviewing posted cash movements. Cash flow totals use the activity recorded on each voucher.</p>
      <Table rows={report.cashFlowGroupMapping} columns={['group','classification','statement','activity','nature','treatment']} />
    </Card> : null}
  </div>;
}

function exportCsv(name: string, rows: Row[]) {
  const keys=Object.keys(rows[0] ?? {}).filter(k=>!rows.some(r=>typeof r[k]==='object' && r[k]!==null));
  const cell=(v:unknown)=>'"'+String(v??'').replace(/^[=+@\-]/,"'$&").replaceAll('"','""')+'"';
  const csv=[keys.map(cell).join(','),...rows.map(r=>keys.map(k=>cell(r[k])).join(','))].join('\r\n');
  const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})); const a=document.createElement('a');a.href=url;a.download=name+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export function AccountingPage() {
  const sequence=useRef(0);
  const { finishedProducts, finishedMovements, finishedLoading, finishedError, reloadFinished,
    rawMaterials, rawLoading, rawError, reloadRaw } = useInventory();
  const [boot,setBoot]=useState<Bootstrap|null>(null), [report,setReport]=useState<Report|null>(null), [queue,setQueue]=useState<Queue[]>([]);
  const [tab,setTab]=useState('Overview'), [error,setError]=useState(''), [notice,setNotice]=useState(''), [busy,setBusy]=useState(false);
  const [start,setStart]=useState(today().slice(0,7)+'-01'), [end,setEnd]=useState(today()), [party,setParty]=useState(''), [ledgerAccount,setLedgerAccount]=useState('');
  const [analysisView,setAnalysisView]=useState('home');
  const [reportType,setReportType]=useState('Profit & Loss');
  const [kind,setKind]=useState('receipt'), [command,setCommand]=useState('');
  const [salePayment,setSalePayment]=useState('credit'), [saleCashAccount,setSaleCashAccount]=useState('');
  const [purchasePayment,setPurchasePayment]=useState('credit'), [purchaseCashAccount,setPurchaseCashAccount]=useState('');
  const [purchaseMethod,setPurchaseMethod]=useState('');
  const [addingSupplier,setAddingSupplier]=useState(false), [supplierName,setSupplierName]=useState('');
  const [fields,setFields]=useState<Record<string,string>>({date:today(),number:'',currency:'',fx:'1',party:'',cashAccount:'1100',amount:'',notes:'',cashClass:'operating',fromAccount:'1100',toAccount:'1200',document:'',item:'',unit:'kg',quantity:'',value:'',contra:'2300'});
  const [salesItems,setSalesItems]=useState<Item[]>([emptyItem()]);
  const [purchaseItems,setPurchaseItems]=useState<Item[]>([emptyItem()]);
  const [expenseItems,setExpenseItems]=useState<Item[]>([emptyItem()]);
  const [allocations,setAllocations]=useState<Allocation[]>([]);
  const [receiptMode,setReceiptMode]=useState('advance');
  const [receiptLookup,setReceiptLookup]=useState<{key:string; invoices:ReceiptInvoice[]; error:string}|null>(null);
  const [receiptLookupRevision,setReceiptLookupRevision]=useState(0);
  const [items,setItems] = kind === 'invoice'
    ? [salesItems,setSalesItems] as const
    : kind === 'bill' ? [purchaseItems,setPurchaseItems] as const : [expenseItems,setExpenseItems] as const;
  const rawPurchaseChoices = !rawLoading && !rawError ? rawMaterials : [];
  const saleStock = tab === 'Transactions' && kind === 'invoice' && !finishedLoading && !finishedError
    ? finishedProducts.map(product => ({ product, onHand: finishedBalance(product, finishedMovements).currentStock }))
        .filter(({ onHand }) => onHand !== null && onHand > 0)
    : [];
  const [openLines,setOpenLines]=useState([{account:'1100',debit:'',credit:'',party:''},{account:'3100',debit:'',credit:'',party:''}]);
  const [setup,setSetup]=useState({company:'',currency:'',startDate:today(),fiscalMonth:'1'});
  const [queueInputs,setQueueInputs]=useState<Record<string,{value:string;fx:string;party:string}>>({});
  const [purchases,setPurchases]=useState<Purchase[]>([]),[selectedPurchase,setSelectedPurchase]=useState(''),[billQty,setBillQty]=useState<Record<string,string>>({});
  const [billTaxes,setBillTaxes]=useState<Record<string,string>>({});
  const [search,setSearch]=useState('');
  const update=(k:string,v:string)=>setFields(p=>({...p,[k]:v}));
  const load=useCallback(async()=>{
    const seq=++sequence.current;setError('');setReport(null);
    try {
      const b=(await api.get<Bootstrap>('/accounting/setup/')).data; if(seq!==sequence.current)return;setBoot(b);
      if (b.book) {
        const [r,q,p]=await Promise.all([api.get<Report>('/accounting/reports/',{params:{start,end,party,account:ledgerAccount}}),api.get<Queue[]>('/accounting/posting-queue/'),api.get<Purchase[]>('/accounting/purchase-bills/')]);
        if(seq!==sequence.current)return;setReport(r.data);setQueue(q.data);setPurchases(p.data);
      }
    } catch(e) {if(seq===sequence.current)setError(msg(e));}
  },[start,end,party,ledgerAccount]);
  useEffect(()=>{void load();},[load]);
  const run=async(action:()=>Promise<unknown>,success:string)=>{
    if(busy)return false;setBusy(true);setError('');setNotice('');
    try {await action();setNotice(success);await load();return true;}catch(e){setError(msg(e));return false;}finally{setBusy(false);}
  };
  const changeKind=(value:string)=>{setAddingSupplier(false);setSupplierName('');setReceiptMode('advance');setKind(value);setFields(p=>({...p,voucherType:'',...(['journal','opening','transfer'].includes(value)?{currency:'',fx:'1'}:{})}));setCommand('');setAllocations([]);setNotice('');};
  const saveSupplier = async () => {
    const name = supplierName.trim();
    if (!name) return;
    await run(async()=>{
      const {data:saved} = await api.post<{id:number;name?:string}>('/accounting/masters/parties/',{
        kind:'supplier', name, reuseSupplier:true,
      });
      setBoot(current=>current && (current.parties.some(p=>p.id===saved.id) ? current : {
        ...current, parties:[...current.parties,{id:saved.id,name:saved.name??name,kind:'supplier'}],
      }));
      update('party',String(saved.id));
      setCommand('');
      setAddingSupplier(false);
      setSupplierName('');
    },'Supplier ledger ready and selected.');
  };
  const cashSale = boot?.supportsManualCashSales && kind === 'invoice' && salePayment === 'cash';
  const paidPurchase = boot?.supportsPaidPurchases && kind === 'bill' && purchasePayment === 'cash';
  const voucherDate = kind === 'opening' ? boot?.book?.startDate : fields.date;
  const partyChoices=boot?.parties.filter(p=>p.kind===(['invoice','receipt'].includes(kind)?'customer':'supplier'))??[];
  const voucherParty=partyChoices.some(p=>String(p.id)===fields.party)?fields.party:'';
  const voucherCurrency=fields.currency || boot?.book?.currency;
  const hasReceiptModes=kind==='receipt'&&!!boot?.receiptModes?.length;
  const againstReceipt=hasReceiptModes&&receiptMode==='against-ref';
  const receiptDate=fields.date;
  const receiptLookupKey=tab==='Transactions'&&boot?.canWrite&&againstReceipt&&voucherParty&&voucherCurrency&&receiptDate
    ? JSON.stringify([voucherParty,voucherCurrency,receiptDate,receiptLookupRevision]) : '';
  const receiptInvoices=receiptLookupKey&&receiptLookup?.key===receiptLookupKey ? receiptLookup : null;
  const allocatableInvoices=receiptInvoices?.invoices.filter(invoice=>invoice.currency===voucherCurrency&&Number(invoice.outstanding)>0)??[];
  useEffect(()=>{
    if(!receiptLookupKey)return;
    const controller=new AbortController();
    void api.get<ReceiptInvoice[]>('/accounting/receipt-invoices/', {
      params:{customer:voucherParty,currency:voucherCurrency,date:receiptDate,history:true},signal:controller.signal,
    }).then(({data})=>{
      if(!controller.signal.aborted)setReceiptLookup({key:receiptLookupKey,invoices:data,error:''});
    }).catch(cause=>{
      if(!controller.signal.aborted)setReceiptLookup({key:receiptLookupKey,invoices:[],error:msg(cause)});
    });
    return ()=>controller.abort();
  },[receiptLookupKey,voucherParty,voucherCurrency,receiptDate]);
  const submit=async(e:FormEvent)=>{
    e.preventDefault();
    if(kind==='bill' && addingSupplier)return;
    if(againstReceipt&&(!allocations.length||allocations.some(line=>!allocatableInvoices.some(invoice=>String(invoice.id)===line.bill)))) {
      setError('Select an outstanding invoice for each Against Ref allocation.');
      return;
    }
    if(kind==='invoice' && items.some(line => !saleStock.some(({ product }) => product.id === line.item))) {
      setError('Select a finished-stock item with stock on hand for each sales line.');
      return;
    }
    if(kind==='bill' && items.some(line => line.item && !rawPurchaseChoices.some(material => 'raw:'+material.id === line.item))) {
      setError('Reload the raw material list or select a current raw material for the purchase line.');
      return;
    }
    const id=command || crypto.randomUUID();setCommand(id);
    const p:Row={...fields,date:voucherDate,voucherType:fields.voucherType?Number(fields.voucherType):undefined,costCategory:fields.costCategory?Number(fields.costCategory):undefined,customer:['expense','bill'].includes(kind)&&fields.customer?Number(fields.customer):undefined,commandId:id,kind,currency:fields.currency || boot?.book?.currency,party:voucherParty?Number(voucherParty):undefined};
    if(kind==='invoice'&&boot?.supportsManualCashSales)p.salePayment=salePayment;
    if(kind==='bill'&&boot?.supportsPaidPurchases)p.purchasePayment=purchasePayment;
    if(cashSale)p.cashAccount=saleCashAccount;
    if(paidPurchase) {
      p.cashAccount=purchaseCashAccount;
      if(boot?.purchaseMethods?.length)p.purchaseMethod=purchaseMethod;
    }
    if(['invoice','bill','expense'].includes(kind))p.items=items;
    if(hasReceiptModes)p.receiptMode=receiptMode;
    if(kind==='payment'||(kind==='receipt'&&(!hasReceiptModes||againstReceipt)))p.allocations=allocations.map(a=>({bill:Number(a.bill),itemLine:a.itemLine?Number(a.itemLine):undefined,amount:a.amount}));
    if(['opening','journal'].includes(kind))p.lines=openLines.map(l=>({...l,debit:l.debit||'0',credit:l.credit||'0',party:l.party?Number(l.party):undefined}));
    if(kind==='reverse')p.document=Number(fields.document);
    await run(async()=>{await api.post('/accounting/commands/',p);setCommand('');update('number','');update('notes','');setAllocations([]);if(againstReceipt)setReceiptLookupRevision(n=>n+1);},`Voucher posted for ${voucherDate}.`);
  };
  const deleteVoucher = (id: number) => {
    void run(() => api.delete('/accounting/vouchers/' + id + '/'), 'Voucher deleted.');
  };
  const periods=(mode:string,value:string)=>{
    if(!value)return;
    if(mode==='month'){setStart(value+'-01');const [y,m]=value.split('-').map(Number);setEnd(`${value}-${new Date(y,m,0).getDate()}`);}
    else {const y=Number(value),m=boot?.book?.fiscalMonth??1;setStart(`${y}-${String(m).padStart(2,'0')}-01`);const d=new Date(m===1?y:y+1,m-1,0);setEnd(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);}
  };
  const label=(name:string,key:string,type='text',required=true)=><label className="text-sm" key={key}>{name}<input className={input} type={type} required={required} value={fields[key]??''} step={type==='number'?'any':undefined} onChange={e=>update(key,e.target.value)} /></label>;
  const accountSelect=(name:string,key:string,choices:Account[])=><label className="text-sm">{name}<select className={input} required value={fields[key]} onChange={e=>update(key,e.target.value)}><option value="">Select account</option>{choices.map(a=><option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}</select></label>;
  const cash=boot?.accounts.filter(a=>a.cash)??[];
  const expenseAccounts=boot?.accounts.filter(a=>(!a.control&&!a.cash&&['asset','expense'].includes(a.kind))||(kind==='bill'&&a.code==='2300'))??[];
  let reportRows:Row[]=[];
  if(report){
    const maps:Record<string,Row[]>={'Group Summary':report.groupSummary??[],'Party Group Summary':report.partyGroupSummary??[],'Cost Category Summary':report.costCategorySummary??[],'Profit & Loss':report.profitLoss.accounts,'Balance Sheet':report.balanceSheet.accounts,'Trial Balance':report.trialBalance,'Cash Flow':Object.entries(report.cashFlow).map(([category,net])=>({category,net})),'Customer Ledger':report.partyBalances.filter(r=>r.kind==='customer'),'Supplier Ledger':report.partyBalances.filter(r=>r.kind==='supplier'),'Sales Report':report.transactions.filter(r=>r.kind==='invoice'),'Purchase Report':report.transactions.filter(r=>r.kind==='bill'),'Expense Report':report.transactions.filter(r=>r.kind==='expense'),'Cash & Bank':report.cashBank,'Inventory Valuation':report.inventory};
    reportRows=maps[reportType]??[];
    if(reportType==='Cash Flow')reportRows=report.cashFlowDetails??reportRows;
    if(search)reportRows=reportRows.filter(r=>Object.values(r).some(v=>String(v??'').toLowerCase().includes(search.toLowerCase())));
  }
  return <div id="finance-workspace" className="finance-workspace space-y-5">
    <header className="finance-hero"><div><span className="finance-eyebrow">NAVAPACK / FINANCE</span><h1>Finance & Accounting</h1><p>{boot?.book ? `${boot.book.company} · ${boot.book.currency} reporting currency` : 'Your financial operations, connected.'}</p></div><div className="finance-hero-actions"><span className="finance-book-status"><span/> {boot?.book?'Accounting book active':'Awaiting setup'}</span>{boot?.book&&<button className="finance-primary" disabled={!boot.canWrite||busy} onClick={()=>{changeKind('receipt');setTab('Transactions');}}><Plus size={17}/> New voucher</button>}</div></header>
    {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}{notice&&<p role="status" className="rounded-lg bg-green-50 p-3 text-green-800">{notice}</p>}
    {!boot&&!error&&<p role="status">Loading accounting…</p>}
    {boot&&!boot.book&&<Card><h2 className="font-semibold">Accounting setup</h2><p className="mt-2 text-sm">Choose the reporting currency and reconciled opening date. These settings are fixed after activation. No old transactions are imported automatically.</p>{boot.canConfigure?<form className="mt-4 space-y-4" onSubmit={e=>{e.preventDefault();void run(()=>api.post('/accounting/setup/',{...setup,fiscalMonth:Number(setup.fiscalMonth),valuation:'weighted-average'}),'Accounting book configured. Enter reconciled opening balances.');}}><fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">{[['Company','company','text'],['Reporting currency (e.g. UGX)','currency','text'],['Accounting cutover date','startDate','date'],['Fiscal year starts in month (1–12)','fiscalMonth','number']].map(([n,k,t])=><label className="text-sm" key={k}>{n}<input required className={input} type={t} min={k==='fiscalMonth'?1:undefined} max={k==='fiscalMonth'?12:undefined} value={setup[k as keyof typeof setup]} onChange={e=>setSetup({...setup,[k]:k==='currency'?e.target.value.toUpperCase():e.target.value})} /></label>)}</fieldset><button disabled={busy} className={button}>Activate accounting book</button></form>:<p className="mt-3">An Admin must configure the book.</p>}</Card>}
    {boot?.book&&<>
      <nav className="finance-navigation" aria-label="Accounting sections">{[
        ['Overview','Dashboard',ChartNoAxesCombined],['Analysis','Day book',Layers],['Transactions','Vouchers',FileText],
        ['Profitability','Customer profit',CircleDollarSign],['Orders','Uninvoiced orders',Clock3],['Ledgers','Ledgers',BookOpen],
        ['Reports','Reports',ChartNoAxesCombined],['Apply Advances','Advances',Wallet],['Purchase Bills','Supplier bills',FileText],
        ['Inventory','Valuation',Layers],['Posting Queue','Posting queue',Clock3],['Masters','Masters',BookOpen],['Setup','Settings',Settings2]
      ].map(([key,label,Icon])=>{const SectionIcon=Icon as typeof Wallet;const value=String(key);return <button key={value} aria-current={tab===value?'page':undefined} onClick={()=>{setTab(value);if(value==='Analysis')setAnalysisView('registers');if(value==='Transactions'&&!voucherCategories.some(([category])=>category===kind))changeKind('receipt');setCommand('');}}><SectionIcon size={16}/>{String(label)}{value==='Posting Queue'&&queue.length>0&&<span className="finance-count">{queue.length}</span>}</button>;})}</nav>
      <Card className="finance-period"><div className="finance-filter-row"><label className="text-sm">From<input className={input} type="date" value={start} onChange={e=>setStart(e.target.value)} /></label><label className="text-sm">Through<input className={input} type="date" value={end} onChange={e=>setEnd(e.target.value)} /></label><label className="text-sm">Month<input className={input} type="month" onChange={e=>periods('month',e.target.value)} /></label><label className="text-sm">Fiscal year starting<input className={input} type="number" min="1900" max="9998" placeholder="Year" onChange={e=>periods('year',e.target.value)} /></label><button className={button} disabled={busy} onClick={()=>void load()}><RefreshCw size={14}/> Refresh</button></div><p className="mt-3 text-xs text-gray-500">Statements use posted records in {boot.book.currency}. Ledgers include the opening balance before the selected range. {boot.book.closedThrough&&`Closed through ${formatDisplayDate(boot.book.closedThrough)}.`}</p></Card>
      {!!queue.length&&<div className="flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        <p role="status">{queue.length} operational {queue.length===1?'record still needs':'records still need'} accounting review. Financial statements exclude unposted records.</p>
        {tab!=='Posting Queue'&&<button type="button" className="font-semibold underline" onClick={()=>setTab('Posting Queue')}>Open Posting Queue</button>}
      </div>}
      {tab==='Reports'&&reportType!=='Profit & Loss'&&<label className="block max-w-md text-sm">Filter report by customer, supplier, product or category<input className={input} value={search} onChange={e=>setSearch(e.target.value)}/></label>}
      {tab==='Purchase Bills'&&selectedPurchase&&<Card><h3 className="font-semibold">Recoverable supplier tax per billed line</h3><p className="mt-2 text-sm">Enter actual recoverable input tax from the supplier bill. Leave zero for untaxed lines; nonrecoverable taxes must be classified as cost rather than input tax.</p><div className="mt-3 grid gap-3 sm:grid-cols-3">{purchases.find(p=>String(p.id)===selectedPurchase)?.lines.map(l=><label className="text-sm" key={l.id}>{l.description}<input className={input} type="number" min="0" step="0.01" value={billTaxes[String(l.id)]??'0'} onChange={e=>setBillTaxes({...billTaxes,[String(l.id)]:e.target.value})}/></label>)}</div></Card>}
      {tab==='Posting Queue'&&<button className={button} disabled={busy||!boot.canWrite} onClick={()=>void run(()=>api.post('/accounting/capture-sources/'),'Saved operational records captured; review the queue for missing inputs.')}>Capture existing operational records since cutover</button>}
      {tab==='Apply Advances'&&<Card><h2 className="font-semibold">Apply an existing receipt / payment to a bill</h2><p className="mt-2 text-sm">Use this when an advance was received or paid before the invoice. No cash is recorded a second time. Select a date range containing the original payment and bill.</p><form className="mt-4 space-y-4" onSubmit={e=>{e.preventDefault();const payment=report?.documents.find(d=>String(d.id)===fields.paymentDocument);if(!payment)return;const id=command||crypto.randomUUID();setCommand(id);void run(async()=>{await api.post('/accounting/commands/',{commandId:id,kind:'allocate',number:fields.number,date:fields.date,currency:payment.currency,fx:String(payment.fx),party:payment.party,paymentDocument:payment.id,allocations:[{bill:Number(fields.bill),itemLine:fields.itemLine?Number(fields.itemLine):undefined,amount:fields.allocationAmount}]});setCommand('');},'Advance allocated; bill and party balances updated.');}}><fieldset disabled={busy||!boot.canWrite} className="grid gap-4 sm:grid-cols-3">{label('Allocation reference','number')}{label('Allocation date','date','date')}<label className="text-sm">Original payment<select className={input} required value={fields.paymentDocument??''} onChange={e=>{update('paymentDocument',e.target.value);update('bill','');}}><option value="">Select unapplied payment</option>{report?.documents.filter(d=>['receipt','payment'].includes(d.kind)&&!d.reversed&&Number(d.unallocated)>0).map(d=><option key={d.id} value={d.id}>{d.number} · {String(d.partyName)} · {d.currency} {String(d.unallocated)}</option>)}</select></label><label className="text-sm">Bill / invoice<select className={input} required value={fields.bill??''} onChange={e=>update('bill',e.target.value)}><option value="">Select bill</option>{report?.documents.filter(d=>{const p=report.documents.find(p=>String(p.id)===fields.paymentDocument);return p&&d.kind===(p.kind==='receipt'?'invoice':'bill')&&d.party===p.party&&d.currency===p.currency&&!d.reversed&&Number(d.outstanding)>0;}).map(d=><option key={d.id} value={d.id}>{d.number} · {d.outstanding}</option>)}</select></label><label className="text-sm">Specific purchased item (optional)<select className={input} value={fields.itemLine??''} onChange={e=>update('itemLine',e.target.value)}><option value="">Whole bill</option>{report?.documents.find(d=>String(d.id)===fields.bill)?.items.map(i=><option key={i.id} value={i.id}>{i.description}</option>)}</select></label>{label('Amount applied','allocationAmount','number')}<button className={button}>Apply advance</button></fieldset></form></Card>}
      {tab==='Setup'&&<Card><h2 className="font-semibold">LED account mapping</h2><p className="mt-2 text-sm">Confirm the liability account for the existing commercial LED calculation. This mapping does not set a tax rate or infer statutory treatment.</p><form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();void run(()=>api.post('/accounting/tax-mapping/',{ledAccount:fields.ledAccount}),'LED liability mapping saved. Retry affected source invoices in Posting Queue.');}}><label className="text-sm">LED liability account<select className={input} required value={fields.ledAccount??''} onChange={e=>update('ledAccount',e.target.value)}><option value="">Select liability account</option>{boot.accounts.filter(a=>a.kind==='liability').map(a=><option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}</select></label><button className={button} disabled={busy||!boot.canConfigure}>Save mapping</button></form></Card>}
      {tab==='Analysis'&&report&&<><nav className="flex flex-wrap gap-3" aria-label="Analysis views">{[['home','Analysis home'],['registers','Day book & registers'],['cash-flow','Cash Flow']].map(([value,label])=><button className={button+(analysisView===value?' bg-navy text-white':'')} key={value} aria-pressed={analysisView===value} onClick={()=>setAnalysisView(value)}>{label}</button>)}</nav>{analysisView==='home'?<FinanceAnalysisHome report={report} start={start} end={end} onReport={name=>{setReportType(name);setSearch('');setTab('Reports');}} onAccount={code=>{setLedgerAccount(code);setParty('');setTab('Ledgers');}} />:analysisView==='cash-flow'?<CashFlowView report={report} start={start} end={end}/>:<FinanceAnalysis asOf={end} voucherTypes={boot.voucherTypes??[]} onAccount={code=>{setLedgerAccount(code);setParty('');setTab('Ledgers');}} documents={report.documents} parties={boot.parties} currency={report.currency} onCreate={value=>{changeKind(value);setTab('Transactions');}} onLedger={value=>{setParty(value);setLedgerAccount('');setTab('Ledgers');}} onExport={rows=>exportCsv('voucher-register',rows)} />}</>}
      {tab==='Overview'&&report&&<FinanceAnalysisHome report={report} start={start} end={end} onReport={name=>{setReportType(name);setSearch('');setTab('Reports');}} onAccount={code=>{setLedgerAccount(code);setParty('');setTab('Ledgers');}} />}
      {tab==='Profitability'&&report&&<CustomerProfitability data={report.customerProfit} costs={report.assignableCosts??[]} parties={boot.parties} currency={report.currency} canWrite={boot.canWrite} busy={busy} onLedger={value=>{setParty(value);setLedgerAccount('');setTab('Ledgers');}} onExport={rows=>exportCsv('customer-profit',rows)} onAssign={async values=>{const id=command||crypto.randomUUID();setCommand(id);return run(async()=>{await api.post('/accounting/commands/',{...values,kind:'assign-cost',customer:Number(values.customer),sourceLine:Number(values.sourceLine),currency:report.currency,fx:'1',commandId:id});setCommand('');},'Cost assigned. Customer profitability updated.');}}/>}
      {tab==='Masters'&&<FinanceMasters data={boot} accounts={boot.accounts} parties={boot.parties} canWrite={boot.canWrite} canConfigure={boot.canConfigure} busy={busy} onSave={async(kind,payload)=>run(()=>api.post('/accounting/masters/'+kind+'/',payload),'Accounting master saved.')} onImport={()=>void run(()=>api.post('/accounting/import-parties/'),'Canonical parties linked to accounting.')} />}
      {tab==='Orders'&&report&&<UninvoicedOrders data={report.orderCommitments} onExport={rows=>exportCsv('uninvoiced-orders',rows)}/>}
      {tab==='Transactions'&&<>
        <Card>
          <h2 className="font-semibold">Create voucher</h2>
          <p className="mt-2 text-xs text-gray-500">Use this form for manual vouchers. Existing operational invoices and receipts post through their source events. Enter purchase tax explicitly after confirming recoverability.</p>
          <form onSubmit={e=>void submit(e)} className="mt-4 space-y-4">
            <fieldset disabled={busy||!boot.canWrite} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-sm">Company<input className={input} value={boot.book.company} readOnly /></label>
                <label className="text-sm">Voucher category
                  <select className={input} value={kind} onChange={e=>changeKind(e.target.value)}>
                    {voucherCategories.map(([value, name])=><option key={value} value={value}>{name}</option>)}
                  </select>
                </label>
                <label className="text-sm">Voucher date
                  <input className={input} type="date" required min={boot.book.startDate}
                    value={voucherDate} readOnly={kind==='opening'} onChange={e=>update('date',e.target.value)} />
                </label>
              </div>
              <p className="text-xs text-gray-500">
                {kind==='opening' ? 'Opening balances use the accounting cutover date.' : `Choose a date on or after ${boot.book.startDate} in an open accounting period.`}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><label className="text-sm">Voucher type<select className={input} value={fields.voucherType??''} onChange={e=>update('voucherType',e.target.value)}><option value="">Standard {kind}</option>{(boot.voucherTypes??[]).filter(v=>v.base_kind===kind).map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label><label className="text-sm">Cost category<select className={input} value={fields.costCategory??''} onChange={e=>update('costCategory',e.target.value)}><option value="">Uncategorised</option>{(boot.costCategories??[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>{label(kind==='bill'?'Supplier invoice or receipt number':hasReceiptModes&&receiptMode==='new-ref'?'New receipt reference':'Document number','number')}<label className="text-sm">Currency<select className={input} disabled={['journal','opening','transfer'].includes(kind)} value={fields.currency} onChange={e=>{update('currency',e.target.value);update('fx',e.target.value?'':'1');setCommand('');}}><option value="">{boot.book.currency} · Reporting currency</option>{[...new Set([...(boot.currencies??[]).map(c=>c.code),...(report?.documents??[]).map(d=>d.currency),...(fields.currency?[fields.currency]:[])])].filter(c=>c!==boot.book?.currency).map(c=><option key={c} value={c}>{c} · {boot.currencies?.find(v=>v.code===c)?.name??c}</option>)}</select></label>{label('FX: reporting currency per 1 transaction currency','fx','number')}
          {hasReceiptModes&&<label className="text-sm">Receipt allocation
            <select className={input} value={receiptMode} onChange={e=>{
              setReceiptMode(e.target.value);
              setAllocations([]);
              setReceiptLookupRevision(n=>n+1);
            }}>
              {boot.receiptModes?.map(mode=><option key={mode.value} value={mode.value}>{mode.label}</option>)}
            </select>
            <span className="mt-1 block text-xs text-gray-500">{receiptModeHelp[receiptMode]}</span>
          </label>}
          {kind==='invoice'&&boot.supportsManualCashSales&&<label className="text-sm">Sale payment
            <select className={input} value={salePayment} onChange={e=>setSalePayment(e.target.value)}>
              <option value="credit">Credit sale</option>
              <option value="cash">Cash sale (paid in full)</option>
            </select>
          </label>}
          {kind==='bill'&&boot.supportsPaidPurchases&&<label className="text-sm">Purchase payment
            <select className={input} value={purchasePayment} onChange={e=>setPurchasePayment(e.target.value)}>
              <option value="credit">Credit purchase</option>
              <option value="cash">Paid in full</option>
            </select>
          </label>}
          {['invoice','bill','receipt','payment'].includes(kind)&&<label className="text-sm">{kind==='invoice'?'Customer ledger':kind==='receipt'?'Customer':'Supplier'}<select className={input} required={!cashSale} value={voucherParty} onChange={e=>{update('party',e.target.value);setAllocations([]);}}><option value="">{cashSale?'Walk-in customer':kind==='invoice'?(partyChoices.length?'Select customer ledger':'No customer ledgers in Finance Masters'):kind==='bill'?(partyChoices.length?'Select supplier ledger':'No supplier ledgers yet'):'Select party'}</option>{partyChoices.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>}
          {kind==='bill'&&<div className="text-sm">
            {addingSupplier ? <>
              <label className="block">New supplier name
                <input className={input} maxLength={200} value={supplierName}
                  onChange={e=>setSupplierName(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void saveSupplier();}}} />
              </label>
              <div className="mt-2 flex gap-2">
                <button type="button" className={button} disabled={!supplierName.trim()||busy} onClick={()=>void saveSupplier()}>Save supplier</button>
                <button type="button" className={button} onClick={()=>{setAddingSupplier(false);setSupplierName('');}}>Cancel</button>
              </div>
            </> : <button type="button" className={button} onClick={()=>setAddingSupplier(true)}>Add supplier</button>}
          </div>}
          {paidPurchase&&!!boot.purchaseMethods?.length&&<label className="text-sm">Payment method
            <select className={input} required value={purchaseMethod} onChange={e=>setPurchaseMethod(e.target.value)}>
              <option value="">Select payment method</option>
              {boot.purchaseMethods.map(method=><option key={method.value} value={method.value}>{method.label}</option>)}
            </select>
          </label>}
          {(cashSale||paidPurchase)&&<label className="text-sm">{paidPurchase?'Pay from':'Deposit into'} cash / bank / mobile-money account
            <select className={input} required value={paidPurchase?purchaseCashAccount:saleCashAccount}
              onChange={e=>(paidPurchase?setPurchaseCashAccount:setSaleCashAccount)(e.target.value)}>
              <option value="">Select account</option>
              {cash.map(a=><option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
            </select>
          </label>}
          {['expense','bill'].includes(kind)&&<label className="text-sm">Attribute expense to customer (optional)<select className={input} value={fields.customer??''} onChange={e=>update('customer',e.target.value)}><option value="">Company / unassigned</option>{boot.parties.filter(p=>p.kind==='customer').map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
          {['receipt','payment','expense'].includes(kind)&&accountSelect('Cash / bank / mobile-money account','cashAccount',cash)}
          {['receipt','payment','transfer'].includes(kind)&&label('Amount','amount','number')}
          {kind==='transfer'&&<>{accountSelect('From account','fromAccount',cash)}{accountSelect('To account','toAccount',cash)}</>}
          {kind==='reverse'&&<label className="text-sm">Original document<select className={input} required value={fields.document} onChange={e=>update('document',e.target.value)}><option value="">Select document from selected date range</option>{report?.documents.filter(d=>!d.reversed&&d.kind!=='reverse').map(d=><option key={d.id} value={d.id}>{d.number} · {d.kind}</option>)}</select></label>}
          {!cashSale&&!paidPurchase&&<label className="text-sm">Cash-flow category<select className={input} value={fields.cashClass} onChange={e=>update('cashClass',e.target.value)}>{['operating','investing','financing'].map(c=><option key={c}>{c}</option>)}</select></label>}{label(kind==='reverse'?'Reversal reason':paidPurchase?(purchaseMethod==='cheque'?'Cheque number or notes':'Payment reference or notes'):'Notes','notes','text',kind==='reverse')}
        </div>
        {kind==='bill'&&<p className="text-sm text-gray-600">
          Select a raw material or enter an item or service manually. Choose the ledger for each line. Record physical receipts through Raw Materials Stock IN.
        </p>}
        {kind==='bill'&&rawError&&<p role="alert" className="text-sm text-red-700">
          {rawError} <button type="button" className="underline" onClick={()=>void reloadRaw()}>Retry loading raw materials</button>
        </p>}
        {kind==='invoice'&&finishedError&&<p role="alert" className="text-sm text-red-700">
          {finishedError} <button type="button" className="underline" onClick={()=>void reloadFinished()}>Retry loading stock</button>
        </p>}
        {['invoice','bill','expense'].includes(kind)&&<div className="space-y-3">{items.map((i,index)=><Card key={index}><div className="grid gap-3 sm:grid-cols-3">{kind==='invoice'&&<label className="text-sm">Stock item
          <select className={input} required aria-busy={finishedLoading}
            value={saleStock.some(({ product })=>product.id===i.item)?i.item:''}
            onChange={e=>{
              const product=saleStock.find(row=>row.product.id===e.target.value)?.product;
              setItems(rows=>rows.map((row,x)=>x===index
                ? {...row,item:product?.id??'',description:product?finishedGoodLabel(product):'',unit:product?.unit??''}
                : row));
            }}>
            <option value="">{finishedLoading?'Loading stock items...':finishedError?'Stock could not be loaded':saleStock.length?'Select an in-stock item':'No finished goods with stock on hand'}</option>
            {saleStock.map(({product,onHand})=><option key={product.id} value={product.id}>
              {finishedGoodLabel(product)} ({onHand} {product.unit} on hand)
            </option>)}
          </select>
        </label>}
        {kind==='bill'&&<label className="text-sm">Raw material
          <select className={input} aria-busy={rawLoading} value={i.item}
            onChange={e=>{
              const material=rawPurchaseChoices.find(row=>'raw:'+row.id===e.target.value);
              setItems(rows=>rows.map((row,x)=>x===index
                ? {...row,item:material?'raw:'+material.id:'',description:material?.name??'',unit:material?.unit??'',account:material?'':'6100'}
                : row));
            }}>
            <option value="">Enter item or service manually</option>
            {i.item&&!rawPurchaseChoices.some(material=>'raw:'+material.id===i.item)&&
              <option value={i.item} disabled>{rawLoading?'Loading raw materials...':'Selected raw material unavailable'}</option>}
            {rawPurchaseChoices.map(material=><option key={material.id} value={'raw:'+material.id}>
              {material.name} ({RAW_CATEGORY_LABEL[material.category]}, {material.unit})
            </option>)}
          </select>
          {rawLoading&&<span className="block text-xs text-gray-500">Loading raw materials...</span>}
        </label>}
        {[['Item ID','item'],['Description','description'],['Quantity','quantity'],['Unit','unit'],['Price (net of tax)','price'],['Tax amount','tax']].filter(([,k])=>kind==='expense'||k!=='item').map(([n,k])=><label className="text-sm" key={k}>{kind==='bill'&&k==='description'?'Item or service':n}<input className={input} required={!['item','unit'].includes(k)} readOnly={k==='unit'&&(kind==='invoice'||(kind==='bill'&&!!i.item))} type={['quantity','price','tax'].includes(k)?'number':'text'} step="any" min="0" value={i[k as keyof Item]} onChange={e=>setItems(items.map((r,x)=>x===index?{...r,[k]:e.target.value}:r))} /></label>)}{kind!=='invoice'&&<label className="text-sm">Expense / asset category<select required className={input} value={i.account} onChange={e=>setItems(items.map((r,x)=>x===index?{...r,account:e.target.value}:r))}><option value="">Select ledger</option>{expenseAccounts.map(a=><option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}</select></label>}</div><button type="button" className={button+' mt-3'} disabled={items.length===1} onClick={()=>setItems(items.filter((_,x)=>x!==index))}>Remove line</button></Card>)}<button type="button" className={button} onClick={()=>setItems([...items,emptyItem()])}>Add item line</button></div>}
        {(kind==='payment'||(kind==='receipt'&&(!hasReceiptModes||againstReceipt)))&&<div className="space-y-3">
          <h3 className="font-semibold">{againstReceipt?'Outstanding customer invoices':'Allocate payment to bills / items'}</h3>
          {againstReceipt ? <>
            {!receiptLookupKey&&<p className="text-xs text-gray-500">Select a customer, voucher date and currency to see open invoices.</p>}
            {receiptLookupKey&&!receiptInvoices&&<p role="status" className="text-xs text-gray-500">Loading outstanding invoices...</p>}
            {receiptInvoices?.error&&<p role="alert" className="text-sm text-red-700">{receiptInvoices.error}{' '}
              <button type="button" className="underline" onClick={()=>setReceiptLookupRevision(n=>n+1)}>Retry</button>
            </p>}
            {!!receiptInvoices?.invoices.length&&<section aria-label="Customer purchase history" className="rounded-lg border p-3">
              <h4 className="font-semibold">Purchase history for {partyChoices.find(p=>String(p.id)===voucherParty)?.name}</h4>
              <p className="text-xs text-gray-500">Invoices dated through {receiptDate} with current payment balances. Allocations use {voucherCurrency} invoices.</p>
              {Array.from(new Set(receiptInvoices.invoices.map(invoice=>invoice.currency))).map(currency=>{
                const invoices=receiptInvoices.invoices.filter(invoice=>invoice.currency===currency);
                const outstanding=invoices.reduce((sum,invoice)=>sum+Number(invoice.outstanding),0);
                return <p key={currency} className="mt-2 text-sm"><strong>{currency} {money(outstanding)} outstanding</strong> across {invoices.length} invoice{invoices.length===1?'':'s'}</p>;
              })}
              <details open className="mt-2">
                <summary className="cursor-pointer text-sm font-medium">View all invoices and balances</summary>
                <Table columns={['invoice','date','items','payment type','currency','invoice total','paid','outstanding']} rows={receiptInvoices.invoices.map(invoice=>({
                  invoice:invoice.number,date:invoice.date,items:invoice.items.map(item=>item.description).join(', '),currency:invoice.currency,
                  'payment type':invoice.paymentType==='cash'?'Cash':invoice.paymentType==='credit'?'Credit':'Unrecorded',
                  'invoice total':invoice.total,paid:invoice.paid,outstanding:invoice.outstanding,
                }))} />
              </details>
            </section>}
            {receiptInvoices&&!receiptInvoices.error&&!allocatableInvoices.length&&<p className="text-xs text-gray-500">No outstanding invoices for this customer, currency and receipt date.</p>}
          </> : <p className="text-xs text-gray-500">Unallocated amounts remain visible as advances. The bill selector uses documents in the selected report range.</p>}
          {allocations.map((a,index)=>{
            const bills=againstReceipt ? allocatableInvoices : report?.documents.filter(d=>
              d.kind===(kind==='receipt'?'invoice':'bill')&&String(d.party)===fields.party&&!d.reversed&&Number(d.outstanding)>0)??[];
            const selected=bills.find(d=>String(d.id)===a.bill);
            return <div className="grid gap-3 sm:grid-cols-4" key={index}>
              <label className="text-sm">{againstReceipt?'Outstanding invoice':'Bill / invoice'}
                <select className={input} required value={selected?a.bill:''}
                  onChange={e=>setAllocations(rows=>rows.map((r,x)=>x===index?{...r,bill:e.target.value,itemLine:''}:r))}>
                  <option value="">Select {againstReceipt?'invoice':'bill'}</option>
                  {bills.map(d=><option key={d.id} value={d.id}>{d.number} ({d.date}) - {d.currency} {d.outstanding} outstanding</option>)}
                </select>
              </label>
              <label className="text-sm">Specific item (optional)
                <select className={input} value={a.itemLine}
                  onChange={e=>setAllocations(rows=>rows.map((r,x)=>x===index?{...r,itemLine:e.target.value}:r))}>
                  <option value="">Whole invoice / bill</option>
                  {selected?.items.map(i=><option key={i.id} value={i.id}>{i.description}</option>)}
                </select>
              </label>
              <label className="text-sm">Allocated amount
                <input className={input} type="number" step="0.01" min="0.01" required value={a.amount}
                  onChange={e=>setAllocations(rows=>rows.map((r,x)=>x===index?{...r,amount:e.target.value}:r))} />
              </label>
              <button type="button" className={button} onClick={()=>setAllocations(rows=>rows.filter((_,x)=>x!==index))}>Remove allocation</button>
            </div>;
          })}
          <button className={button} type="button" disabled={againstReceipt&&!allocatableInvoices.length}
            onClick={()=>setAllocations(rows=>[...rows,{bill:'',itemLine:'',amount:''}])}>
            {againstReceipt?'Add invoice allocation':'Add allocation'}
          </button>
        </div>}
        {['opening','journal'].includes(kind)&&<div className="space-y-3"><p className="text-sm">{kind==='opening'?'Enter balanced opening values on the accounting cutover date.':'Enter balanced debit and credit lines in reporting currency. Assign a customer on income/expense lines when applicable.'} Inventory uses the valuation workflow. Receivable/payable control lines require the correct party.</p>{openLines.map((l,index)=><div key={index} className="grid gap-3 sm:grid-cols-4"><label className="text-sm">Account<select className={input} value={l.account} onChange={e=>setOpenLines(openLines.map((r,x)=>x===index?{...r,account:e.target.value}:r))}>{boot.accounts.filter(a=>(kind==='journal'||['asset','liability','equity'].includes(a.kind))&&a.code!=='1400').map(a=><option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}</select></label>{['debit','credit'].map(k=><label className="text-sm" key={k}>{k}<input type="number" step="0.01" min="0" className={input} value={l[k as 'debit'|'credit']} onChange={e=>setOpenLines(openLines.map((r,x)=>x===index?{...r,[k]:e.target.value}:r))}/></label>)}<label className="text-sm">Party<select className={input} value={l.party} onChange={e=>setOpenLines(openLines.map((r,x)=>x===index?{...r,party:e.target.value}:r))}><option value="">No party</option>{boot.parties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>)}<button className={button} type="button" onClick={()=>setOpenLines([...openLines,{account:'3100',debit:'',credit:'',party:''}])}>{kind==='journal'?'Add journal line':'Add opening line'}</button></div>}
        <button className={button+' bg-navy text-white'} disabled={kind==='bill'&&addingSupplier}>{busy?'Posting…':'Post voucher'}</button></fieldset>{command&&<p className="text-xs text-gray-500">A stable request ID is retained for safe retry. If details were changed after a successful but interrupted response, start a new transaction.</p>}</form></Card>
        {report&&<Card><h2 className="mb-3 font-semibold">Posted documents</h2><Table rows={report.documents} columns={['number','date','kind','salePayment','purchaseMethod','receiptMode','partyName','currency','total','outstanding','unallocated','reversed','notes']}/>{report.documents.filter(d=>Array.isArray(d.allocations)&&d.allocations.length>0).map(d=><details key={d.id} className="mt-3"><summary>{d.number} · payment allocations and purchased items</summary><pre className="overflow-auto p-3 text-xs">{JSON.stringify(d.allocations,null,2)}</pre></details>)}</Card>}
      </>}
      {tab==='Purchase Bills'&&<Card><h2 className="font-semibold">Supplier bill from saved purchase</h2><p className="mt-2 text-sm">Prices and items come from the saved PO. Choose the actual supplier account, invoice number, date and billed quantities. Partial bills are supported; previously billed quantities cannot be billed again. This action does not receive stock again. Source matching uses net PO prices plus the explicitly entered recoverable supplier tax amounts.</p><form className="mt-4 space-y-4" onSubmit={e=>{e.preventDefault();const id=command||crypto.randomUUID();setCommand(id);void run(async()=>{await api.post('/accounting/purchase-bills/',{commandId:id,purchaseOrder:Number(selectedPurchase),number:fields.number,date:fields.date,party:Number(fields.party),fx:fields.fx,quantities:billQty,taxes:billTaxes});setCommand('');setSelectedPurchase('');setBillQty({});},'Supplier bill posted from saved purchase items.');}}><fieldset disabled={busy||!boot.canWrite} className="space-y-4"><div className="grid gap-4 sm:grid-cols-3"><label className="text-sm">Saved purchase<select required className={input} value={selectedPurchase} onChange={e=>{setSelectedPurchase(e.target.value);setBillTaxes({});setCommand('');const p=purchases.find(p=>String(p.id)===e.target.value);setBillQty(Object.fromEntries(p?.lines.map(l=>[String(l.id),l.remaining])??[]));}}><option value="">Select PO</option>{purchases.map(p=><option key={p.id} value={p.id}>{p.number} · {p.supplier} · {p.currency}</option>)}</select></label><label className="text-sm">Supplier account<select required className={input} value={fields.party} onChange={e=>update('party',e.target.value)}><option value="">Select supplier</option>{boot.parties.filter(p=>p.kind==='supplier').map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>{label('Supplier invoice number','number')}{label('Invoice date','date','date')}{label('Exchange rate to reporting currency','fx','number')}</div>{purchases.find(p=>String(p.id)===selectedPurchase)?.lines.map(l=><div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2" key={l.id}><p className="text-sm">{l.description} · {l.price}/{l.unit} · Unbilled {l.remaining} {l.unit}</p><label className="text-sm">Quantity billed<input className={input} required type="number" min="0" max={l.remaining} step="0.000001" value={billQty[String(l.id)]??'0'} onChange={e=>setBillQty({...billQty,[String(l.id)]:e.target.value})}/></label></div>)}<button className={button}>Post supplier bill</button></fieldset></form></Card>}
      {tab==='Ledgers'&&<Card><div className="mb-4 grid gap-4 sm:grid-cols-2"><label className="text-sm">Customer / supplier<select className={input} value={party} onChange={e=>{setParty(e.target.value);setLedgerAccount('');}}><option value="">Select a party</option>{boot.parties.map(p=><option key={p.id} value={p.id}>{p.name} · {p.kind}</option>)}</select></label><label className="text-sm">Or account<select className={input} value={ledgerAccount} onChange={e=>{setLedgerAccount(e.target.value);setParty('');}}><option value="">Select an account</option>{boot.accounts.map(a=><option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}</select></label></div>{report ? <>
        {(party || ledgerAccount) && <dl className="mb-4 grid gap-3 sm:grid-cols-2">
          {[
            { label: 'Opening balance', value: report.ledgerOpening, date: 'Before ' + formatDisplayDate(start) },
            { label: 'Closing balance', value: report.ledgerClosing, date: 'Through ' + formatDisplayDate(end) },
          ].map(({ label, value, date }) => <div key={label} className="finance-metric">
            <dt>{label}</dt>
            <dd className="font-semibold tabular-nums">{value == null ? 'Unavailable' : money(Math.abs(Number(value))) + ' ' + report.currency + (Number(value) < 0 ? ' Cr' : Number(value) > 0 ? ' Dr' : '')}</dd>
            <dd className="text-xs text-gray-500">{date}</dd>
          </div>)}
        </dl>}
        <Table rows={report.ledger}/><button className={button+' mt-3'} onClick={()=>exportCsv('ledger',report.ledger)}>Export ledger CSV</button><h3 className="mt-5 font-semibold">Party balances</h3><Table rows={report.partyBalances}/>{party && <PartyLedgerDetails report={report} party={party} />}</> : !error && <p role="status" className="text-sm text-gray-500">Loading ledger…</p>}</Card>}
      {tab==='Reports'&&report&&<Card><div className="mb-4 flex flex-wrap items-end gap-3"><label className="text-sm">Report<select className={input} value={reportType} onChange={e=>setReportType(e.target.value)}>{['Profit & Loss','Group Summary','Party Group Summary','Cost Category Summary','Cash Flow','Balance Sheet','Trial Balance','Customer Ledger','Supplier Ledger','Sales Report','Purchase Report','Expense Report','Cash & Bank','Inventory Valuation'].map(r=><option key={r}>{r}</option>)}</select></label>{reportType!=='Profit & Loss'&&<button className={button} onClick={()=>exportCsv(reportType,reportRows)}>Export report CSV</button>}</div>{reportType==='Profit & Loss'&&<FinanceProfitLoss onDelete={boot.canWrite && !busy ? deleteVoucher : undefined} documents={report.documents} start={start} end={end} refreshToken={report}/>}{reportType==='Balance Sheet'&&<p className="mb-4">Assets {money(report.balanceSheet.assets)} · Liabilities {money(report.balanceSheet.liabilities)} · Equity {money(report.balanceSheet.equity)} · Accumulated earnings {money(report.balanceSheet.retainedEarnings)} · Difference {money(report.balanceSheet.difference)}</p>}{['Group Summary','Party Group Summary'].includes(reportType)&&<p className="mb-3 text-sm text-gray-500">Parent groups include descendants; do not add parent and child totals together. Group Summary covers general ledgers; Party Group Summary covers customer/supplier subledgers separately. Debit balances are positive and credit balances negative.</p>}{reportType==='Cash Flow'?<CashFlowView report={report} start={start} end={end}/>:reportType!=='Profit & Loss'&&<Table rows={reportRows}/>}{['Customer Ledger','Supplier Ledger'].includes(reportType)&&<p className="mt-3 text-sm">Open Ledgers to inspect a party’s dated sales/purchases, payments and running balance.</p>}</Card>}
      {tab==='Inventory'&&<Card><h2 className="font-semibold">Inventory valuation</h2><p className="mt-2 text-sm">Record reconciled opening values or approved valuation corrections. Operational receipts/issues arrive through Posting Queue and do not change physical quantities a second time. Select the stock item; its exact ID and unit are filled automatically. No quantity conversion is performed. Backdated costs are blocked after later movements.</p><form className="mt-4 space-y-4" onSubmit={e=>{e.preventDefault();const id=command||crypto.randomUUID();setCommand(id);void run(async()=>{await api.post('/accounting/commands/',{...fields,kind,commandId:id,currency:boot.book!.currency,fx:'1'});setCommand('');},'Inventory value and accounting updated.');}}><fieldset disabled={!boot.canWrite||busy} className="space-y-4"><label className="text-sm">Valuation action<select className={input} value={['stock-receipt','stock-issue'].includes(kind)?kind:''} required onChange={e=>{changeKind(e.target.value);update('contra',e.target.value==='stock-receipt'?'3100':'5100');}}><option value="">Select action</option><option value="stock-receipt">Opening / valued receipt</option><option value="stock-issue">Valued issue</option></select></label><div className="grid gap-4 sm:grid-cols-3">{label('Document number','number')}{label('Date','date','date')}<FinanceValuationItem value={fields.item} inputClass={input} onChange={(item,unit)=>{setFields(p=>({...p,item,unit}));setCommand('');}}/>{label('Quantity','quantity','number')}{kind==='stock-receipt'&&label('Total receipt value','value','number')}{accountSelect('Contra account','contra',boot.accounts.filter(a=>(kind==='stock-receipt'?['3100','2300','1600']:['5100','1600','6100']).includes(a.code)))}</div><button className={button}>Post valuation</button></fieldset></form>{report&&<Table rows={report.inventory}/>}</Card>}
      {tab==='Posting Queue'&&<Card>
        <h2 className="font-semibold">Operational records awaiting accounting</h2>
        <p className="mt-2 text-sm">Use the source invoice or other approved cost record when supplying a receipt value. Posting the value updates the accounts for the existing movement.</p>
        {!queue.length&&<p className="mt-4">No queued events.</p>}
        {queue.map(q=>{
          const p=q.payload;
          const v=queueInputs[q.source]??{value:'',fx:'',party:''};
          const item=String(p.item??'');
          const stockName=item.startsWith('raw:') ? rawMaterials.find(m=>m.id===item.slice(4))?.name
            : finishedProducts.find(m=>m.id===item.slice(9))?.itemDetails;
          const currency=String(p.currency||boot.book!.currency);
          const needsCost=p.kind==='stock-receipt'&&(p.value==null||p.value==='');
          const foreign=currency!==boot.book!.currency;
          const needsCustomer=p.kind==='invoice'&&!p.party;
          const changeInput=(key:'value'|'fx'|'party',value:string)=>
            setQueueInputs(current=>({...current,[q.source]:{...v,[key]:value}}));
          return <div className="mt-4 space-y-3 rounded-lg border p-4" key={q.source}>
            <h3 className="font-semibold">{stockName||item||String(p.number??q.source)}</h3>
            <p className="text-sm text-gray-600">{[p.date,p.quantity,p.unit].filter(Boolean).join(' ')}</p>
            <p className="text-sm text-red-700">{needsCost?'Enter the total receipt cost to post this stock receipt.':q.error}</p>
            <details className="text-xs"><summary>Source details</summary><p>{q.source}</p><pre className="overflow-auto">{JSON.stringify(p,null,2)}</pre></details>
            <div className="grid gap-3 sm:grid-cols-3">
              {needsCost&&<label className="text-sm">Total receipt cost ({currency})
                <input className={input} type="number" min="0.01" step="0.01" value={v.value} onChange={e=>changeInput('value',e.target.value)} />
              </label>}
              {foreign&&<label className="text-sm">Exchange rate ({boot.book!.currency} per {currency})
                <input className={input} type="number" step="any" value={v.fx||String(p.fx??'')} onChange={e=>changeInput('fx',e.target.value)} />
              </label>}
              {needsCustomer&&<label className="text-sm">Customer ledger
                <select className={input} value={v.party} onChange={e=>changeInput('party',e.target.value)}>
                  <option value="">Select customer</option>
                  {boot.parties.filter(p=>p.kind==='customer').map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>}
            </div>
            <button className={button} disabled={busy||!boot.canWrite||(needsCost&&!(Number(v.value)>0))||(foreign&&!(Number(v.fx||p.fx)>0))||(needsCustomer&&!v.party)}
              onClick={()=>void run(()=>api.post('/accounting/posting-queue/',{source:q.source,...v,party:v.party?Number(v.party):undefined}),'Source posted to accounting.')}>Retry posting</button>
          </div>;
        })}
      </Card>}
      {tab==='Setup'&&<div className="space-y-4"><Card><h2 className="font-semibold">Accounting masters</h2><p className="mt-2 text-sm text-gray-500">Manage groups, ledgers, cost categories, currencies and voucher types in Masters.</p><button className={button+' mt-3'} onClick={()=>setTab('Masters')}>Open accounting masters</button></Card>
        <Card><h2 className="font-semibold">Close accounting period</h2><p className="mt-2 text-sm">Closing blocks all posting through the selected date. Only Admin can advance this lock.</p><form className="mt-3 flex items-end gap-3" onSubmit={e=>{e.preventDefault();void run(()=>api.post('/accounting/close-period/',{date:fields.date}),'Period closed.');}}>{label('Close through','date','date')}<button className={button} disabled={busy||!boot.canConfigure}>Close period</button></form></Card></div>}
    </>}
  </div>;
}



