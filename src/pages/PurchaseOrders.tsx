import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Search, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { useInventory } from '@/context/InventoryContext';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { finishedBalance, finishedGoodLabel, type FinishedCategory } from '@/lib/finishedGoodsData';

interface NewItem { category: FinishedCategory; subgroup: string; customer: string; size: string; brand: string; packing_size: string }
export interface Line { id?: number; description: string; unit: string; quantity: string; unit_price: string; stock_mode: 'existing' | 'manual'; stock_item: string | null; new_item?: NewItem; stock_posted?: boolean; quantity_received?: string; quantity_remaining?: string; stock_label?: string }
interface Draft {
  request_id: string; supplier_name: string; supplier_reference: string; supplier_contact: string;
  supplier_address: string; order_date: string; delivery_date: string; delivery_address: string;
  currency: string; payment_terms: string; notes: string; lines: Line[]; receipt_method: 'immediate' | 'grn';
}
export interface Order extends Draft { id: number; number: string; total: string; status: string; can_receive: boolean }
const input = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy';
const button = 'rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-50';
const emptyLine = (): Line => ({ description: '', unit: '', quantity: '', unit_price: '', stock_mode: 'existing', stock_item: null });
const newItem = (): NewItem => ({ category: 'carrier-bags', subgroup: '', customer: '', size: '', brand: '', packing_size: '' });
const today = () => new Date().toLocaleDateString('en-CA');
function newDraft(): Draft {
  return { request_id: crypto.randomUUID(), supplier_name: '', supplier_reference: '', supplier_contact: '', supplier_address: '', order_date: today(), delivery_date: '', delivery_address: '', currency: '', payment_terms: '', notes: '', lines: [emptyLine()], receipt_method: 'grn' };
}
function message(error: unknown): string {
  const data = (error as { response?: { data?: unknown } }).response?.data;
  if (!data) return 'Unable to reach the purchase order server. Check your connection and retry.';
  function flatten(value: unknown): string {
    if (Array.isArray(value)) return value.map(flatten).join(' ');
    if (value && typeof value === 'object') return Object.entries(value).map(([key, item]) => `${key}: ${flatten(item)}`).join(' ');
    return String(value);
  }
  return flatten(data);
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1 text-sm font-medium text-slate-600"><span>{label}</span>{children}</label>;
}

export function PurchaseOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [canCreate, setCanCreate] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const demo = user?.id.startsWith('demo-');
  async function load(more = false) {
    setLoading(true); setError('');
    try {
      const { data } = await api.get<{ results: Order[]; next: string | null; can_create: boolean }>(more && next ? next : '/purchase-orders/', { timeout: 15000 });
      setOrders(previous => more ? [...previous, ...data.results] : data.results);
      setNext(data.next); setCanCreate(data.can_create);
    } catch (cause) { setError(message(cause)); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (!demo) void load(); else setLoading(false); }, [user?.id]);
  const filtered = orders.filter(order => `${order.number} ${order.supplier_name} ${order.supplier_reference}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold text-navy">Purchase Orders</h1><p className="mt-1 text-sm text-slate-500">Supplier orders and expected deliveries.</p></div>{canCreate && <Link className={button} to="/purchase-orders/new"><Plus className="mr-1 inline" size={16} />New Purchase Order</Link>}</div>
    {demo ? <Card><p>Sign in with a Django account to enter and save purchase orders.</p></Card> : <>
      <Card><div className="flex flex-wrap items-center gap-3"><Search size={18} /><input aria-label="Search loaded purchase orders" className={`${input} max-w-md`} placeholder="Search loaded orders by number or supplier" value={query} onChange={event => setQuery(event.target.value)} /><button className="text-sm underline" disabled={loading} onClick={() => void load()}>Reload</button></div></Card>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      <Card><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-slate-500"><tr>{['PO number', 'Supplier', 'Order date', 'Expected delivery', 'Total before tax', 'Status'].map(label => <th className="p-3" key={label}>{label}</th>)}</tr></thead><tbody>{filtered.map(order => <tr className="border-b" key={order.id}><td className="p-3"><Link className="font-medium text-teal underline" to={`/purchase-orders/${order.id}`}>{order.number}</Link></td><td className="p-3">{order.supplier_name}</td><td className="p-3">{order.order_date}</td><td className="p-3">{order.delivery_date || '—'}</td><td className="p-3">{order.currency} {order.total}</td><td className="p-3 capitalize">{order.status.replaceAll('_', ' ')}</td></tr>)}</tbody></table></div>{loading ? <p role="status" className="p-4">Loading purchase orders…</p> : !error && filtered.length === 0 ? <p className="p-6 text-center text-slate-500">{query ? 'No matching loaded orders.' : 'No purchase orders yet.'}</p> : null}{next && <button className="mt-4 underline" disabled={loading} onClick={() => void load(true)}>Load more</button>}</Card>
    </>}
  </div>;
}

export function PurchaseOrderEditor() {
  const { user } = useAuth();
  const { finishedProducts, finishedMovements, finishedLoading, finishedError, reloadFinished } = useInventory();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(newDraft);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const update = (key: keyof Omit<Draft, 'lines'>, value: string) => setDraft(previous => ({ ...previous, [key]: value }));
  const patchLine = (index: number, changes: Partial<Line>) => setDraft(previous => ({ ...previous, lines: previous.lines.map((line, i) => i === index ? { ...line, ...changes } : line) }));
  const updateLine = (index: number, key: keyof Line, value: string) => patchLine(index, { [key]: value });
  async function save(event: FormEvent) {
    event.preventDefault(); if (saving) return;
    if (draft.lines.some(line => line.stock_mode === 'existing' && !line.stock_item)) { setError('Choose an existing stock item for each From stock line, or select Manual entry.'); return; }
    setError(''); setSaving(true); setAttempted(true);
    try {
      const { data } = await api.post<Order>('/purchase-orders/', { ...draft, delivery_date: draft.delivery_date || null }, { timeout: 20000 });
      await reloadFinished();
      navigate(`/purchase-orders/${data.id}`);
    } catch (cause) { setError(message(cause)); }
    finally { setSaving(false); }
  }
  if (user?.id.startsWith('demo-')) return <Card><p>Sign in with a Django account to save purchase orders.</p><Link to="/purchase-orders" className="underline">Back to Purchase Orders</Link></Card>;
  return <form onSubmit={save} className="space-y-6">
    <div><Link className="text-sm text-teal underline" to="/purchase-orders">← Purchase Orders</Link><h1 className="mt-3 text-2xl font-semibold text-navy">New Purchase Order</h1><p className="mt-1 text-sm text-slate-500">Create the supplier order, then record delivery with a Goods Received Note. Totals exclude tax and freight.</p></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    {finishedLoading && <p role="status">Loading stock items…</p>}
    {finishedError && <div role="alert" className="rounded-lg bg-red-50 p-3 text-red-700"><p>{finishedError}</p><button type="button" className="underline" onClick={() => void reloadFinished()}>Reload stock</button></div>}
    <fieldset disabled={saving || attempted} className="space-y-6 disabled:opacity-70">
    <Card><h2 className="mb-4 font-semibold text-navy">Supplier & delivery</h2><div className="grid gap-4 md:grid-cols-2">
      <Field label="Supplier name *"><input className={input} required maxLength={200} value={draft.supplier_name} onChange={e => update('supplier_name', e.target.value)} /></Field>
      <Field label="Supplier quotation / reference"><input className={input} maxLength={100} value={draft.supplier_reference} onChange={e => update('supplier_reference', e.target.value)} /></Field>
      <Field label="Contact person / phone / email"><input className={input} maxLength={200} value={draft.supplier_contact} onChange={e => update('supplier_contact', e.target.value)} /></Field>
      <Field label="Purchase order date *"><input type="date" max={draft.receipt_method === 'immediate' ? today() : undefined} className={input} required value={draft.order_date} onChange={e => update('order_date', e.target.value)} /></Field>
      <Field label="How will goods be received?"><select className={input} value={draft.receipt_method} onChange={e => update('receipt_method', e.target.value)}><option value="grn">Receive later through a GRN</option><option value="immediate">Receive immediately — add all to Stock now</option></select><span className="text-xs text-slate-500">Immediate receipts cannot be added to Stock again through a GRN.</span></Field>
      <Field label="Expected delivery date"><input type="date" min={draft.order_date} className={input} value={draft.delivery_date} onChange={e => update('delivery_date', e.target.value)} /></Field>
      <Field label="Currency code *"><input className={input} required pattern="[A-Za-z]{3}" maxLength={3} placeholder="e.g. INR, USD, GHS" value={draft.currency} onChange={e => update('currency', e.target.value.toUpperCase())} /></Field>
      <Field label="Supplier address"><textarea className={input} value={draft.supplier_address} onChange={e => update('supplier_address', e.target.value)} /></Field>
      <Field label="Delivery address"><textarea className={input} value={draft.delivery_address} onChange={e => update('delivery_address', e.target.value)} /></Field>
    </div></Card>
    <Card><h2 className="mb-4 font-semibold text-navy">Order items</h2><p className="mb-3 text-sm text-slate-500">Choose an exact stock variant, or add a new one manually. New items will be available in From stock on your next purchase.</p><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr>{['Finished-goods item *', 'Unit *', 'Quantity *', 'Unit price *', 'Amount', ''].map((label, i) => <th className="p-2" key={i}>{label}</th>)}</tr></thead><tbody>{draft.lines.map((line, index) => <tr className="align-top" key={index}>
      <td className="min-w-[340px] space-y-3 p-2">
        <select aria-label={`Item ${index + 1} entry mode`} className={input} value={line.stock_mode} onChange={e => patchLine(index, { stock_mode: e.target.value as Line['stock_mode'], stock_item: null, description: '', unit: '', new_item: e.target.value === 'manual' ? newItem() : undefined })}><option value="existing">From stock</option><option value="manual">Manual entry — new item</option></select>
        {line.stock_mode === 'existing' ? <>
          <SearchSelect label={`Item ${index + 1} stock item`} value={line.stock_item ? finishedGoodLabel(finishedProducts.find(product => product.id === line.stock_item)!) : line.description} options={finishedProducts.map(product => ({ id: product.id, name: finishedGoodLabel(product), detail: `Stock: ${finishedBalance(product, finishedMovements).currentStock ?? 'Not recorded'} ${product.unit}` }))} onChange={value => patchLine(index, { description: value, stock_item: null, unit: '' })} onSelect={option => { const product = finishedProducts.find(item => item.id === option.id)!; patchLine(index, { description: product.itemDetails || product.subgroup, stock_item: product.id, unit: product.unit }); }} />
          {line.stock_item && <p className="text-xs text-slate-500">Receipts will add quantity to this exact variant.</p>}
        </> : <>
          <input aria-label={`Item ${index + 1} description`} placeholder="New stock item name" className={input} required maxLength={250} value={line.description} onChange={e => updateLine(index, 'description', e.target.value)} />
          <select aria-label={`Item ${index + 1} category`} className={input} value={line.new_item!.category} onChange={e => patchLine(index, { new_item: { ...line.new_item!, category: e.target.value as FinishedCategory } })}><option value="carrier-bags">Carrier Bags</option><option value="flat-bags">Flat Bags</option><option value="packing">Packing</option></select>
          <div className="grid grid-cols-2 gap-2">{([['subgroup', 'Subgroup', 200], ['size', 'Size', 100], ['brand', 'Brand', 100], ['packing_size', 'Packing size', 100], ['customer', 'Customer / variant', 200]] as const).map(([key, label, max]) => <label key={key} className="space-y-1 text-xs text-slate-500"><span>{label}</span><input aria-label={`Item ${index + 1} ${label}`} placeholder={label} maxLength={max} className={input} value={line.new_item![key]} onChange={e => patchLine(index, { new_item: { ...line.new_item!, [key]: e.target.value } })} /></label>)}</div>
        </>}
      </td>
      <td className="w-24 p-2"><input aria-label={`Item ${index + 1} unit`} className={input} required readOnly={line.stock_mode === 'existing'} maxLength={30} placeholder="ctn" value={line.unit} onChange={e => updateLine(index, 'unit', e.target.value)} /></td>
      <td className="w-32 p-2"><input aria-label={`Item ${index + 1} quantity`} type="number" min="0.001" max="99999999999.999" step="0.001" className={input} required value={line.quantity} onChange={e => updateLine(index, 'quantity', e.target.value)} /></td>
      <td className="w-32 p-2"><input aria-label={`Item ${index + 1} unit price`} type="number" min="0" max="999999999999.99" step="0.01" className={input} required value={line.unit_price} onChange={e => updateLine(index, 'unit_price', e.target.value)} /></td>
      <td className="p-2">{(Number(line.quantity) * Number(line.unit_price)).toFixed(2)}</td><td><button data-button-icon type="button" aria-label={`Remove item ${index + 1}`} disabled={draft.lines.length === 1} onClick={() => setDraft(previous => ({ ...previous, lines: previous.lines.filter((_, i) => i !== index) }))}><Trash2 size={18} /></button></td>
    </tr>)}</tbody></table></div><div className="mt-4 flex flex-wrap justify-between gap-3"><button type="button" className="text-sm text-teal underline" disabled={draft.lines.length >= 100} onClick={() => setDraft(previous => ({ ...previous, lines: [...previous.lines, emptyLine()] }))}>+ Add item</button><p className="font-semibold text-navy">Estimated total: {draft.currency} {draft.lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.unit_price), 0).toFixed(2)}</p></div></Card>
    <Card><div className="grid gap-4 md:grid-cols-2"><Field label="Payment terms"><textarea className={input} maxLength={300} placeholder="e.g. 30 days from invoice" value={draft.payment_terms} onChange={e => update('payment_terms', e.target.value)} /></Field><Field label="Notes / specifications"><textarea className={input} value={draft.notes} onChange={e => update('notes', e.target.value)} /></Field></div></Card>
    </fieldset>
    {attempted && !saving && <p className="text-sm text-slate-600">The save may have reached the server. Retry the same details safely, or return to the list and reload to check before entering another order.</p>}
    <div className="flex gap-3 flex-wrap max-w-full"><button className={button} disabled={saving || finishedLoading || !!finishedError}>{saving ? 'Saving…' : attempted ? 'Retry save' : draft.receipt_method === 'immediate' ? 'Save Purchase & Add to Stock' : 'Save Purchase Order'}</button><Link className="rounded-lg border px-4 py-2 text-sm" to="/purchase-orders">Cancel</Link>{attempted && !saving && <button type="button" className="text-sm underline" onClick={() => setAttempted(false)}>Edit details</button>}</div>
  </form>;
}

export function PurchaseOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { let active = true; setOrder(null); setError(''); api.get<Order>(`/purchase-orders/${id}/`, { timeout: 15000 }).then(({ data }) => { if (active) setOrder(data); }).catch(cause => { if (active) setError(message(cause)); }); return () => { active = false; }; }, [id, attempt]);
  return <div className="space-y-6"><Link className="text-sm text-teal underline" to="/purchase-orders">← Purchase Orders</Link>{error ? <Card><p role="alert">{error}</p><button className="underline" onClick={() => setAttempt(value => value + 1)}>Retry</button></Card> : !order ? <p role="status">Loading purchase order…</p> : <>
    <div><h1 className="break-all text-2xl font-semibold text-navy">{order.number}</h1><p className="mt-1 text-sm capitalize text-slate-500">{order.status.replaceAll('_', ' ')} · {order.order_date}</p>{order.can_receive && <Link className={`${button} mt-3 inline-block`} to={`/goods-received-notes/new?po=${order.id}`}>Create Goods Received Note</Link>}</div>
    <Card><dl className="grid gap-4 text-sm md:grid-cols-2">{[['Supplier', order.supplier_name], ['Supplier reference', order.supplier_reference], ['Supplier contact', order.supplier_contact], ['Expected delivery', order.delivery_date], ['Supplier address', order.supplier_address], ['Delivery address', order.delivery_address], ['Payment terms', order.payment_terms], ['Notes', order.notes]].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap font-medium text-navy">{value || '—'}</dd></div>)}</dl></Card>
    <Card><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Description', 'Quantity', 'Unit', 'Unit price', 'Amount', 'Stock'].map(label => <th className="p-3" key={label}>{label}</th>)}</tr></thead><tbody>{order.lines.map((line, index) => <tr className="border-t" key={index}><td className="p-3">{line.description}</td><td className="p-3">{line.quantity}</td><td className="p-3">{line.unit}</td><td className="p-3">{line.unit_price}</td><td className="p-3">{(Number(line.quantity) * Number(line.unit_price)).toFixed(2)}</td><td className="p-3">{line.stock_posted ? 'Added by immediate receipt' : line.stock_item ? `${line.quantity_received ?? '0'} received · ${line.quantity_remaining ?? line.quantity} outstanding` : 'Earlier entry without stock link'}</td></tr>)}</tbody></table></div><p className="mt-5 text-right font-semibold text-navy">Total before tax: {order.currency} {order.total}</p><p className="mt-2 text-sm text-slate-500">{order.receipt_method === 'grn' ? 'Stock is added from accepted GRN quantities. Damaged or missing goods do not add to usable stock.' : order.lines.every(line => line.stock_posted) ? 'Immediate purchase receipt has already added these goods to Stock.' : 'Earlier entries are retained without automatically changing stock.'} <Link className="underline" to="/stock">View Stock</Link></p></Card>
  </>}</div>;
}
