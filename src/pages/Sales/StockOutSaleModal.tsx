import { api } from '@/lib/api';

import { useRefreshSharedEntry, useConfirmSharedSave } from '@/context/SharedEntriesContext';

import { useNavigate } from 'react-router-dom';



import type { Quotation } from '@/lib/quotations';



import { useEffect, useRef, useState, type FormEvent } from 'react';



import { Plus, Trash2, X } from 'lucide-react';



import { useAuth } from '@/context/AuthContext';



import { useCommercial } from '@/context/CommercialContext';



import { useInventory } from '@/context/InventoryContext';



import { useSalesOrders } from '@/context/SalesOrdersContext';



import { useQuotations } from '@/context/QuotationsContext';



import { ENTRY_INPUT, SearchSelect, type SearchOption } from '@/components/ui/SearchSelect';



import { LEDFields } from '@/components/LEDFields';



import { workflowRequest } from '@/lib/productionWorkflowApi';



import { calculateCommercialTotals } from '@/lib/commercialPricing';



import { finishedGoodLabel } from '@/lib/finishedGoodsData';



import { batchPhysical, physical, reserved, type DispatchBatchEntry } from '@/lib/fulfillment';



import { lineTotal, today, validateOrder, type SalesOrderDraft } from '@/lib/salesOrders';



import type { SalesOrder, SalesOrderItem } from '@/types';



import { stockSalePricing, type StockSaleSnapshot } from '@/lib/stockSale';







type Row = { item: SalesOrderItem; batch: string };



const blank = (): Row => ({ item: { id: crypto.randomUUID(), itemName: '', quantity: NaN, unit: '', unitPrice: NaN, totalPrice: 0, fulfillmentSource: 'stock' }, batch: 'reference-stock' });



const money = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });



const BUTTON = 'rounded-card border px-3 py-2 text-sm text-navy disabled:opacity-50';



export function StockOutSaleModal({ onClose, onRecorded }: { onClose: () => void; onRecorded: (order: SalesOrder) => void }) {

  const confirmSave = useConfirmSharedSave();

  const refreshSharedEntry = useRefreshSharedEntry();

  const [settlement,setSettlement]=useState<{partyName:string;balance:string;reportingCurrency:string;asOf:string;pendingPostings:number;cashAccounts:{code:string;name:string}[]}>();

  const [settlementError,setSettlementError]=useState(''),[settlementLoading,setSettlementLoading]=useState(false),[settlementRevision,setSettlementRevision]=useState(0);

  const [paymentKind,setPaymentKind]=useState<''|'cash'|'credit'>(''),[cashAccount,setCashAccount]=useState(''),[fx,setFx]=useState(''),[billingAddress,setBillingAddress]=useState('');



  const { user } = useAuth(), { company } = useCommercial();



  const { orders, loading: ordersLoading, loadError, reloadOrders } = useSalesOrders();



  const quotations = useQuotations(); const navigate = useNavigate(); const quotationDraft = useRef<Quotation>();



  const { finishedProducts, finishedLoading, finishedError, reloadFinished, ledger, previewDispatchBatch, dispatchBatch } = useInventory();



  const canSettle = ['admin','receptionist'].includes(user?.role??'');



  const canCreate = ['admin', 'receptionist'].includes(user?.role ?? '');



  const [mode, setMode] = useState('existing'), [orderId, setOrderId] = useState('');



  const [draft, setDraft] = useState<SalesOrderDraft>(() => ({ date: today(), customerName: '', marketingPersonName: '', customerType: '', requisitionOrder: '', currency: company.currency, taxRate: company.taxRate, items: [], allocateJobCard: false, creationKey: crypto.randomUUID(), commercialPricing: { taxMode: 'exclusive', discount: 0, roundingPolicy: 'Line amounts, VAT and total rounded to 2 decimals.' } }));



  const [rows, setRows] = useState<Row[]>([blank()]);



  const [options, setOptions] = useState<{ customers: SearchOption[]; staff: SearchOption[] }>({ customers: [], staff: [] });



  const [optionsError, setOptionsError] = useState(''), [optionsLoading, setOptionsLoading] = useState(true), [attempt, setAttempt] = useState(0);



  const [challan, setChallan] = useState(''), [destination, setDestination] = useState(''), [vehicle, setVehicle] = useState(''), [remarks, setRemarks] = useState('');



  const [error, setError] = useState(''), [saving, setSaving] = useState(false);



  const locked = useRef(false), documentId = useRef(crypto.randomUUID());



  const dialog = useRef<HTMLDivElement>(null);



  const source = orders.find(o => o.id === orderId), existing = mode === 'existing';



  useEffect(() => { void reloadOrders(); }, [reloadOrders]);

  useEffect(()=>{

    let active=true;setSettlement(undefined);setSettlementError('');setFx('');setCashAccount('');

    if(!existing||!source||!canSettle){setSettlementLoading(false);return;}

    setSettlementLoading(true);

    void api.get('/accounting/dispatch-options/',{params:{orderId:source.id}}).then(({data})=>{if(active){setSettlement(data);if(data.reportingCurrency===source.currency)setFx('1');}}).catch(cause=>{if(active)setSettlementError(cause.response?.data?.detail?String(cause.response.data.detail):'Unable to load customer ledger balance. Check accounting setup and customer mapping.');}).finally(()=>{if(active)setSettlementLoading(false);});

    return()=>{active=false;};

  },[existing,source?.id,canSettle,settlementRevision]);





  useEffect(() => {



    let active = true; setOptionsLoading(true); setOptionsError('');



    workflowRequest<typeof options>('order-options/').then(data => { if (active) setOptions(data); }).catch(e => { if (active) setOptionsError(e.message); }).finally(() => { if (active) setOptionsLoading(false); });



    return () => { active = false; };



  }, [attempt]);



  useEffect(() => {



    const previous = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow;



    document.body.style.overflow = 'hidden'; dialog.current?.querySelector<HTMLElement>('button')?.focus();



    return () => { document.body.style.overflow = overflow; previous?.focus(); };



  }, []);



  const focus = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus());



  const add = () => { const row = blank(); setRows(current => [...current, row]); focus(`stock-sale-item-${row.item.id}`); };



  const update = (index: number, change: Partial<SalesOrderItem>) => setRows(current => current.map((row, i) => i === index ? { ...row, item: { ...row.item, ...change } } : row));



  const selectOrder = (id: string) => {



    setOrderId(id); setError(''); setPaymentKind(''); setBillingAddress(orders.find(o=>o.id===id)?.customerContact?.billingAddress??''); documentId.current = crypto.randomUUID();



    const order = orders.find(o => o.id === id);



    if (!order) { setRows([blank()]); return; }



    setDraft({ ...order, date: today(), marketingPersonName: order.marketingPersonName ?? '', customerType: order.customerType ?? '', requisitionOrder: order.requisitionOrder ?? '', items: order.items ?? [], taxRate: order.taxRate ?? 0, currency: order.currency ?? '' });



    setRows((order.items ?? []).flatMap(item => {



      const sent = ledger.dispatches.filter(d => d.orderId === id && d.itemId === item.id && d.status === 'Confirmed').reduce((sum, d) => sum + d.quantity, 0);



      return item.quantity > sent ? [{ item: { ...structuredClone(item), quantity: item.quantity - sent, ledSnapshot: sent ? undefined : item.ledSnapshot }, batch: 'reference-stock' }] : [];



    }));



    setDestination(order.customerContact?.deliveryAddress || order.customerName);



  };



  const activeRows = rows.filter(row => row.item.itemId || row.item.itemName.trim() || Number.isFinite(row.item.quantity) || Number.isFinite(row.item.unitPrice));



  const isB2B = draft.customerType === 'B2B';



  const pricing = stockSalePricing(draft.customerType, activeRows.map(row => row.item), draft.taxRate, draft.commercialPricing?.taxMode ?? 'exclusive');



  const selectedItems = pricing.items;



  const subtotal = selectedItems.reduce((sum, item) => sum + (Number.isFinite(item.quantity) && Number.isFinite(item.unitPrice) ? lineTotal(item.quantity, item.unitPrice) : 0), 0);



  const originalSubtotal = (source?.items ?? []).reduce((sum, item) => sum + lineTotal(item.quantity, item.unitPrice), 0);



  const discount = source && originalSubtotal > 0 ? Math.round((source.commercialPricing?.discount ?? 0) * subtotal / originalSubtotal * 100) / 100 : 0;



  const taxMode = pricing.taxMode;



  let totals: ReturnType<typeof calculateCommercialTotals> | undefined;



  try { if (selectedItems.every(i => Number.isFinite(i.quantity) && Number.isFinite(i.unitPrice) && (!i.led?.applies || i.ledSnapshot))) totals = calculateCommercialTotals(selectedItems, discount, pricing.taxRate, taxMode); } catch { /* Incomplete inputs are validated on confirmation. */ }



  const submit = async (event: FormEvent) => {



    event.preventDefault(); if (locked.current) return; setError('');



    if (existing && !source) { setError('Select a saved Sales Order.'); return; }



    const effective = { ...draft, taxRate: isB2B ? draft.taxRate : 0, items: selectedItems, commercialPricing: { taxMode, discount, roundingPolicy: 'Dispatch amounts rounded to 2 decimals; order discount apportioned by selected line value.' } };



    const errors = validateOrder(existing ? { ...effective, items: selectedItems.map(item => ({ ...item, fulfillmentSource: 'stock', modelId: undefined, modelRevision: undefined, jobRouting: undefined })) } : effective);



    if (Object.keys(errors).length || !totals) { setError(Object.values(errors).join(' ') || 'Complete quantities, rates and any applicable LED conversions.'); return; }



    if (existing && (!challan.trim() || !destination.trim())) { setError('Enter the delivery challan/reference and delivery destination.'); return; }



    if (existing && activeRows.some(row => { const line = source?.items?.find(i => i.id === row.item.id); return !line || line.itemId !== row.item.itemId || line.unit !== row.item.unit || line.unitPrice !== row.item.unitPrice; })) { setError('The selected order details changed. Select the order again before dispatch.'); return; }



    if(existing&&canSettle&&(!paymentKind||!settlement||settlementLoading||settlementError||!billingAddress.trim()||!Number.isFinite(Number(fx))||Number(fx)<=0||(paymentKind==='cash'&&!cashAccount))){setError('Load the customer balance, choose Cash/Credit, and complete billing address, exchange rate and payment account where required.');return;}



    locked.current = true; setSaving(true);



    try {



      if (!existing) {



        const quote = quotationDraft.current ?? quotations.create(); quotationDraft.current = quote;



        await quotations.edit({ ...quote, date: draft.date, currency: draft.currency!, taxRate: pricing.taxRate, taxMode, discount,



          customer: { ...quote.customer, customerId: draft.customerId, name: draft.customerName, customerType: draft.customerType as 'B2B' | 'B2C', deliveryAddress: destination }, salesRepresentative: draft.marketingPersonName,



          lines: selectedItems.map(item => ({ id: item.id, type: 'stock', productId: item.itemId, description: item.itemName, group: '', specifications: '', quantity: item.quantity, unit: item.unit, unitPrice: item.unitPrice, led: item.led, ledSnapshot: item.ledSnapshot })) });



        onClose(); navigate(`/quotations/${quote.id}`); return;



      }



      const order = source!;



      const makeEntries = (currentOrder: SalesOrder): DispatchBatchEntry[] => {



        const sale: StockSaleSnapshot = { ...(canSettle&&paymentKind?{payment:{kind:paymentKind,fx,cashAccount:paymentKind==='cash'?cashAccount:undefined,seller:company.legalName||company.tradingName,sellerAddress:company.address,sellerTax:company.tin,email:company.email,contact:company.telephone,billingAddress:billingAddress.trim(),buyerTax:''}}:{}), id: documentId.current, orderNumber: currentOrder.orderNumber, customerName: draft.customerName, customerType: draft.customerType, marketingPersonName: draft.marketingPersonName, requisitionOrder: draft.requisitionOrder, currency: draft.currency!, taxRate: pricing.taxRate, taxMode, subtotal: totals!.subtotal, discount, vat: totals!.tax, led: totals!.led ?? 0, total: totals!.total,



          lines: activeRows.map(row => ({ itemId: row.item.id, productId: row.item.itemId!, description: row.item.itemName, quantity: row.item.quantity, unit: row.item.unit, rate: row.item.unitPrice, amount: lineTotal(row.item.quantity, row.item.unitPrice), ledSnapshot: isB2B ? row.item.ledSnapshot : undefined })) };



        return activeRows.map(row => ({ itemId: row.item.id, batch: row.batch, draft: { id: `${documentId.current}-${row.item.id}`, quantity: row.item.quantity, date: draft.date, challan: challan.trim(), destination: destination.trim(), vehicle: vehicle.trim(), remarks: remarks.trim(), sale } }));



      };



      previewDispatchBatch(order, makeEntries(order));



      dispatchBatch(order.id, makeEntries(order));

      await confirmSave();

      // The backend creates the immutable invoice in the dispatch transaction.

      // Refresh its shared version before another invoice can be prepared.

      try { await refreshSharedEntry('invoices'); } catch { /* Dispatch is already committed; do not invite a second sale. */ }



      onRecorded(order); onClose();



    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to confirm Stock OUT.'); locked.current = false; setSaving(false); }



  };



  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/30 p-2 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="stock-sale-title" onKeyDown={event => {



    if (event.key === 'Escape' && !saving) { event.preventDefault(); event.stopPropagation(); onClose(); }



    if (event.key === 'Tab') { const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([readonly]), select:not(:disabled), textarea:not(:disabled), summary') ?? []); const first = controls[0], last = controls.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } }



  }}><div ref={dialog} className="max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-card bg-white p-4 shadow-xl sm:p-6">



    <header className="flex items-start justify-between"><div><h2 id="stock-sale-title" className="text-lg font-semibold text-navy">Stock OUT · Sales</h2><p className="mt-1 text-xs text-gray-500">Search to select · Tab to move · Enter on Rate for the next item</p></div><button data-button-icon type="button" disabled={saving} onClick={onClose} aria-label="Close Stock OUT" className={BUTTON}><X size={18} /></button></header>



    <p className="mt-3 rounded bg-amber-50 p-3 text-xs text-amber-900">Dispatch Stock OUT is saved to the shared database with retained history. New sales start with a saved quotation. Convert it to a Sales Order and obtain Production Manager/Admin approval before dispatch.</p>



    <div className="mt-4 flex flex-wrap gap-4"><label>Sale source<select disabled={saving} className={ENTRY_INPUT} value={mode} onChange={e => { setMode(e.target.value); setOrderId(''); setRows([blank()]); setError(''); setDraft(current => ({ ...current, customerName: '', customerId: undefined, marketingPersonName: '', customerType: '', requisitionOrder: '', date: today(), creationKey: crypto.randomUUID() })); }}>{canCreate && <option value="new">New sale · quotation first</option>}<option value="existing">Existing Sales Order</option></select></label>{mode === 'existing' && <label>Sales Order<select disabled={saving} className={ENTRY_INPUT} value={orderId} onChange={e => selectOrder(e.target.value)}><option value="">Select order</option>{orders.filter(o => o.salesOrderApproval && !['Cancelled', 'Completed', 'Dispatched'].includes(o.status)).map(o => <option key={o.id} value={o.id}>{o.orderNumber} · {o.customerName}</option>)}</select></label>}</div>



    {ordersLoading && existing && <p role="status">Loading orders…</p>}{loadError && existing && <p role="alert">{loadError} <button className={BUTTON} onClick={() => void reloadOrders()}>Reload orders</button></p>}



    {!existing && optionsLoading && <p role="status">Loading customers and staff…</p>}{!existing && optionsError && <p role="alert">{optionsError} <button className={BUTTON} onClick={() => setAttempt(n => n + 1)}>Retry options</button></p>}



    {finishedError && <p role="alert">{finishedError} <button className={BUTTON} onClick={() => void reloadFinished()}>Reload stock</button></p>}



    <form onSubmit={submit} noValidate className="mt-5 space-y-5"><fieldset disabled={saving} className="space-y-5">



      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><label>Order No (automatic)<input aria-label="Automatic order number" readOnly tabIndex={-1} value={source?.orderNumber ?? 'Auto-generated when confirmed'} className={`${ENTRY_INPUT} bg-gray-50`} /></label><label>Date<input type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} className={ENTRY_INPUT} /></label>



        <div><label className="mb-1 block">Customer *</label>{existing ? <input readOnly value={draft.customerName} className={ENTRY_INPUT} /> : <SearchSelect label="Customer" value={draft.customerName} options={options.customers} onChange={value => setDraft({ ...draft, customerName: value, customerId: undefined })} onSelect={option => { setDraft({ ...draft, customerName: option.name, customerId: option.id }); setDestination(current => !current || current === draft.customerName ? option.name : current); }} onAdvance={() => focus('stock-sale-marketing')} />}</div>



        <div><label className="mb-1 block">Marketing Person *</label>{existing ? <input readOnly value={draft.marketingPersonName} className={ENTRY_INPUT} /> : <SearchSelect inputId="stock-sale-marketing" label="Marketing Person" value={draft.marketingPersonName} options={options.staff} onChange={value => setDraft({ ...draft, marketingPersonName: value })} onSelect={option => setDraft({ ...draft, marketingPersonName: option.name })} />}</div>



        <fieldset disabled={existing}><legend>Customer Type *</legend><div className="mt-2 flex gap-5">{(['B2B', 'B2C'] as const).map(type => <label key={type}><input type="radio" name="stock-sale-customer-type" checked={draft.customerType === type} onChange={() => { setDraft({ ...draft, customerType: type, taxRate: type === 'B2B' ? company.taxRate : 0 }); if (type === 'B2C') setRows(current => current.map(row => ({ ...row, item: { ...row.item, led: undefined, ledSnapshot: undefined } }))); }} /> {type}</label>)}</div></fieldset>



        <label>Requisition Order<input readOnly={existing} value={draft.requisitionOrder} onChange={e => setDraft({ ...draft, requisitionOrder: e.target.value })} className={ENTRY_INPUT} /></label></div>



      <div className="flex flex-wrap gap-4"><label>Currency<input readOnly={existing} value={draft.currency ?? ''} onChange={e => setDraft({ ...draft, currency: e.target.value.toUpperCase() })} className={ENTRY_INPUT} /></label>{isB2B && <><label>Price basis<select disabled={existing} value={taxMode} onChange={e => setDraft({ ...draft, commercialPricing: { taxMode: e.target.value as 'inclusive' | 'exclusive', discount: 0, roundingPolicy: 'Round to 2 decimals.' } })} className={ENTRY_INPUT}><option value="exclusive">Rates exclude VAT</option><option value="inclusive">Rates include VAT</option></select></label><label>VAT %<input readOnly={existing} type="number" min="0" max="100" step="any" value={draft.taxRate ?? ''} onChange={e => setDraft({ ...draft, taxRate: e.target.value === '' ? undefined : e.target.valueAsNumber })} className={ENTRY_INPUT} /></label></>}</div>



      {existing&&canSettle&&<section className="space-y-3 rounded-card border p-4" aria-label="Customer balance and payment"><h3 className="font-semibold">Customer ledger &amp; payment</h3>{settlementLoading&&<p role="status">Loading current customer balance…</p>}{settlementError&&<p role="alert" className="text-red-700">{settlementError}</p>}{settlement&&<p>{settlement.partyName} · Current posted balance: <strong>{settlement.reportingCurrency} {money(Math.abs(Number(settlement.balance)))}</strong> {Number(settlement.balance)>0?'due from customer':Number(settlement.balance)<0?'customer credit':'— settled'} · As of {settlement.asOf}</p>}<button type="button" className={BUTTON} disabled={settlementLoading} onClick={()=>setSettlementRevision(n=>n+1)}>Refresh balance</button>{!!settlement?.pendingPostings&&<p className="text-sm text-amber-800">There are {settlement.pendingPostings} pending accounting postings in the company. This balance includes posted entries only.</p>}<div className="grid gap-4 sm:grid-cols-2"><label>Sale payment *<select value={paymentKind} onChange={e=>setPaymentKind(e.target.value as ''|'cash'|'credit')} className={ENTRY_INPUT}><option value="">Choose Cash or Credit</option><option value="cash">Cash sale · paid in full now</option><option value="credit">Credit sale · customer pays later</option></select></label>{paymentKind==='cash'&&<label>Receive into *<select className={ENTRY_INPUT} value={cashAccount} onChange={e=>setCashAccount(e.target.value)}><option value="">Choose cash / bank / mobile money</option>{settlement?.cashAccounts.map(a=><option key={a.code} value={a.code}>{a.name} · {a.code}</option>)}</select></label>}<label>Customer billing address *<input value={billingAddress} onChange={e=>setBillingAddress(e.target.value)} className={ENTRY_INPUT}/></label>{settlement&&<label>FX: {settlement.reportingCurrency} per 1 {draft.currency}<input type="number" min="0" step="any" readOnly={settlement.reportingCurrency===draft.currency} value={fx} onChange={e=>setFx(e.target.value)} className={ENTRY_INPUT}/></label>}</div><p className="text-sm text-gray-600">Confirming dispatch creates the invoice and reduces stock once. Cash sale also records a full receipt against that invoice; the previous customer balance stays unchanged. Credit sale adds the invoice amount to the balance. Rates stay fixed to the approved order. Final invoice rounding and remaining quotation discounts are calculated by the server.</p></section>}

      {existing&&!canSettle&&<p className="text-sm text-gray-600">This role can dispatch stock. Admin or Sales reception must handle cash/credit invoicing; customer financial balances are restricted.</p>}

      <section className="rounded-card border"><h3 className="border-b bg-gray-50 px-3 py-2 font-semibold">Items</h3><div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm"><thead><tr>{['Item', 'Quantity', 'Unit', 'Rate', 'Amount', 'Batch', ''].map((h, i) => <th key={i} className="p-3">{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => {



        const item = row.item, balance = item.itemId ? physical(ledger, item.itemId) : null;



        const options = existing ? (source?.items ?? []).filter(line => line.id === item.id || !rows.some(r => r.item.id === line.id)).map(line => ({ id: line.id, name: line.itemName, detail: line.unit })) : finishedProducts.map(p => ({ id: p.id, name: finishedGoodLabel(p), detail: `Available: ${physical(ledger, p.id) === null ? 'Not recorded' : physical(ledger, p.id)! - reserved(ledger, p.id)} ${p.unit}` }));



        return <tr key={item.id} className="border-t align-top"><td className="w-[35%] p-3"><SearchSelect inputId={`stock-sale-item-${item.id}`} label={`Item ${i + 1}`} value={item.itemName} options={options} onChange={value => update(i, { itemName: value, itemId: undefined, unit: '', unitPrice: NaN, led: undefined, ledSnapshot: undefined })} onSelect={option => {



          if (existing) { const line = source!.items!.find(line => line.id === option.id)!; setRows(current => current.map((r, index) => index === i ? { item: { ...structuredClone(line), quantity: line.quantity - ledger.dispatches.filter(d => d.orderId === source!.id && d.itemId === line.id && d.status === 'Confirmed').reduce((sum, d) => sum + d.quantity, 0), ledSnapshot: undefined }, batch: 'reference-stock' } : r)); }



          else { const p = finishedProducts.find(p => p.id === option.id)!; update(i, { itemId: p.id, itemName: option.name, unit: p.unit, led: undefined, ledSnapshot: undefined }); }



        }} onAdvance={() => focus(`stock-sale-quantity-${item.id}`)} /><p className="mt-1 text-xs text-gray-500">Available overall: {balance === null || !item.itemId ? 'Not recorded' : balance - reserved(ledger, item.itemId)} {item.unit} · Selected batch: {!item.itemId || batchPhysical(ledger,item.itemId,row.batch)===null ? 'Not recorded' : batchPhysical(ledger,item.itemId,row.batch)!-reserved(ledger,item.itemId,row.batch)} {item.unit}</p></td>



          <td className="p-3"><input id={`stock-sale-quantity-${item.id}`} aria-label={`Quantity ${i + 1}`} type="number" min="0" step="any" value={Number.isFinite(item.quantity) ? item.quantity : ''} onChange={e => update(i, { quantity: e.target.valueAsNumber, ledSnapshot: undefined })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); focus(`stock-sale-rate-${item.id}`); } }} className={ENTRY_INPUT} /></td><td className="p-3"><input readOnly aria-label={`Unit ${i + 1}`} value={item.unit} className={`${ENTRY_INPUT} bg-gray-50`} /></td>



          <td className="p-3"><input id={`stock-sale-rate-${item.id}`} readOnly={existing} aria-label={`Rate ${i + 1}`} type="number" min="0" step="any" value={Number.isFinite(item.unitPrice) ? item.unitPrice : ''} onChange={e => update(i, { unitPrice: e.target.valueAsNumber, ledSnapshot: undefined })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (rows[i + 1]) focus(`stock-sale-item-${rows[i + 1].item.id}`); else if (!existing) add(); } }} className={ENTRY_INPUT} /></td><td className="p-3 tabular-nums">{money(lineTotal(item.quantity, item.unitPrice) || 0)}</td>



          <td className="p-3"><select aria-label={`Batch ${i + 1}`} value={row.batch} onChange={e => setRows(current => current.map((r, index) => index === i ? { ...r, batch: e.target.value } : r))} className={ENTRY_INPUT}><option value="reference-stock">Reference stock</option>{[...new Set(ledger.movements.filter(m => m.productId === item.itemId && m.batch && m.batch !== 'reference-stock').map(m => m.batch!))].map(batch => <option key={batch}>{batch}</option>)}</select></td><td className="p-3"><button data-button-icon type="button" aria-label={`Remove item ${i + 1}`} disabled={rows.length === 1} onClick={() => setRows(current => current.filter((_, index) => index !== i))} className={BUTTON}><Trash2 size={16} /></button></td></tr>;



      })}</tbody></table></div></section>



      {(!existing || source?.items?.some(line => !rows.some(row => row.item.id === line.id))) && <button type="button" onClick={add} className={BUTTON}><Plus size={16} className="mr-1 inline" />Add Item</button>}



      {isB2B && <details className="rounded-card border p-3"><summary>LED options</summary><p className="text-xs text-gray-500">Confirm applicability and weight conversion. LED uses the confirmed higher-of-the-two rule.</p>{rows.filter(row => row.item.itemId).map(row => <div key={row.item.id} className="mt-3"><h4>{row.item.itemName}</h4><LEDFields value={row.item.led} productId={row.item.itemId} modelId={row.item.modelId} quantity={row.item.quantity} unit={row.item.unit} date={draft.date} currency={draft.currency ?? ''} netSelling={row.item.quantity * row.item.unitPrice / (taxMode === 'inclusive' ? 1 + (draft.taxRate ?? 0) / 100 : 1)} onChange={(led, ledSnapshot) => update(rows.indexOf(row), { led, ledSnapshot })} /></div>)}</details>}



      <div className="flex justify-end"><dl className="w-full space-y-3 rounded-card bg-gray-50 p-4 sm:w-80">{[['Subtotal', subtotal], ...(discount ? [['Allocated order discount', discount]] : []), ...(isB2B ? [[`VAT ${pricing.taxRate}%${taxMode === 'inclusive' ? ' (included)' : ''}`, totals?.tax], ['LED', totals?.led ?? (totals ? 0 : undefined)]] : [])].map(([label, amount]) => <div key={String(label)} className="flex justify-between"><dt>{label}</dt><dd>{amount === undefined ? 'Complete items / LED' : money(Number(amount))}</dd></div>)}<div className="flex justify-between border-t pt-3 font-semibold text-navy"><dt>TOTAL AMOUNT</dt><dd>{draft.currency} {totals ? money(totals.total) : 'Pending'}</dd></div></dl></div>



      <div className="grid gap-4 sm:grid-cols-2"><label>Delivery challan / reference *<input value={challan} onChange={e => setChallan(e.target.value)} className={ENTRY_INPUT} /></label><label>Delivery destination *<input value={destination} onChange={e => setDestination(e.target.value)} className={ENTRY_INPUT} /></label><label>Vehicle / transporter<input value={vehicle} onChange={e => setVehicle(e.target.value)} className={ENTRY_INPUT} /></label><label>Remarks<input value={remarks} onChange={e => setRemarks(e.target.value)} className={ENTRY_INPUT} /></label></div>



    </fieldset>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-3 flex-wrap max-w-full"><button type="button" disabled={saving} onClick={onClose} className={BUTTON}>Cancel</button><button type="submit" disabled={saving || finishedLoading || !!finishedError || (existing&&canSettle&&(!settlement||settlementLoading||!!settlementError||!paymentKind)) || (existing ? ordersLoading || !!loadError : optionsLoading || !!optionsError)} className="rounded-card bg-navy px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? 'Confirming…' : existing ? (canSettle?'Confirm Dispatch, Invoice & Payment':'Confirm Dispatch & Stock OUT') : 'Save Quotation First'}</button></div></form>



  </div></div>;



}



