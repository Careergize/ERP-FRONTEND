import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useInventory } from '@/context/InventoryContext';
import { Card } from '@/components/ui/Card';
import { today } from '@/lib/salesOrders';
import type { Order } from './PurchaseOrders';

interface ReceiptLine {
  purchase_line: number; description: string; stock_label: string; unit: string; quantity_ordered: string;
  previously_received: string; quantity_received: string; damaged_quantity: string;
  missing_quantity: string; quantity_accepted: string; remarks: string;
}
interface GRN {
  id: number; number: string; purchase_order: number; po_number: string; supplier_name: string;
  receipt_date: string; received_by: number; receiver_name: string; authorized_person: string;
  notes: string; lines: ReceiptLine[];
}
interface Entry { purchase_line: number; quantity_received: string; damaged_quantity: string; missing_quantity: string; remarks: string }
interface Page<T> { results: T[]; next: string | null; can_create: boolean }
const field = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm';
const button = 'rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-50';
function errorText(error: unknown): string {
  const data = (error as { response?: { data?: unknown } }).response?.data;
  const flatten = (value: unknown): string => Array.isArray(value) ? value.map(flatten).join(' ') : value && typeof value === 'object' ? Object.entries(value).map(([key, child]) => `${key}: ${flatten(child)}`).join(' ') : String(value);
  return data ? flatten(data) : 'Unable to reach the receiving server. Your entries are kept; check the connection and retry.';
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1 text-sm text-slate-600"><span>{label}</span>{children}</label>;
}

export function GoodsReceivedNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<GRN[]>([]), [next, setNext] = useState<string | null>(null);
  const [canCreate, setCanCreate] = useState(false), [loading, setLoading] = useState(false);
  const [error, setError] = useState(''), [query, setQuery] = useState('');
  const demo = user?.id.startsWith('demo-');
  async function load(more = false) {
    setLoading(true); setError('');
    try {
      const { data } = await api.get<Page<GRN>>(more && next ? next : '/goods-received-notes/', { timeout: 15000 });
      setNotes(previous => more ? [...previous, ...data.results] : data.results); setNext(data.next); setCanCreate(data.can_create);
    } catch (cause) { setError(errorText(cause)); } finally { setLoading(false); }
  }
  useEffect(() => { if (!demo) void load(); }, [user?.id]);
  const filtered = notes.filter(note => `${note.number} ${note.po_number} ${note.supplier_name}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold text-navy">Goods Received Notes</h1><p className="mt-1 text-sm text-slate-500">Confirm supplier deliveries and add accepted goods to finished-goods Stock.</p></div>{canCreate && <Link className={button} to="/goods-received-notes/new">New GRN</Link>}</div>
    {demo ? <Card>Sign in with a Django account to record goods received.</Card> : <>
      <Card><div className="flex gap-3"><input className={`${field} max-w-md`} aria-label="Search loaded GRNs" placeholder="Find loaded GRNs by number, PO or supplier" value={query} onChange={e => setQuery(e.target.value)} /><button className="text-sm underline" disabled={loading} onClick={() => void load()}>Reload</button></div></Card>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      <Card><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-slate-500"><tr>{['GRN number', 'Receipt date', 'Supplier', 'Purchase order', 'Received by'].map(label => <th className="p-3" key={label}>{label}</th>)}</tr></thead><tbody>{filtered.map(note => <tr className="border-b" key={note.id}><td className="p-3"><Link className="font-medium text-teal underline" to={`/goods-received-notes/${note.id}`}>{note.number}</Link></td><td className="p-3">{note.receipt_date}</td><td className="p-3">{note.supplier_name}</td><td className="p-3"><Link className="underline" to={`/purchase-orders/${note.purchase_order}`}>{note.po_number}</Link></td><td className="p-3">{note.receiver_name}</td></tr>)}</tbody></table></div>{loading ? <p role="status" className="p-4">Loading GRNs…</p> : !filtered.length && !error ? <p className="p-5 text-slate-500">No matching goods received notes.</p> : null}{next && <button className="mt-3 underline" disabled={loading} onClick={() => void load(true)}>Load more</button>}</Card>
    </>}
  </div>;
}

export function GoodsReceivedNoteEditor() {
  const { user } = useAuth();
  const { reloadFinished } = useInventory();
  const navigate = useNavigate(); const [params] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]), [next, setNext] = useState<string | null>(null);
  const [selected, setSelected] = useState(params.get('po') ?? ''), [order, setOrder] = useState<Order | null>(null);
  const [rows, setRows] = useState<Entry[]>([]), [date, setDate] = useState(today);
  const [authorized, setAuthorized] = useState(''), [notes, setNotes] = useState('');
  const [requestId] = useState(() => crypto.randomUUID());
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [error, setError] = useState(''), [attempted, setAttempted] = useState(false), [retryLoad, setRetryLoad] = useState(0);
  const demo = user?.id.startsWith('demo-');
  async function loadOptions(url = '/purchase-orders/', more = false) {
    setLoading(true); setError('');
    try {
      const { data } = await api.get<Page<Order>>(url, { timeout: 15000 });
      setOrders(previous => {
        const keep = more ? previous : previous.filter(item => String(item.id) === selected);
        return [...keep.filter(item => !data.results.some(result => result.id === item.id)), ...data.results];
      }); setNext(data.next);
    } catch (cause) { setError(errorText(cause)); } finally { setLoading(false); }
  }
  useEffect(() => { if (!demo) void loadOptions(); }, [user?.id]);
  useEffect(() => {
    if (!selected || demo) { setOrder(null); setRows([]); return; }
    let active = true; setLoading(true); setError(''); setOrder(null); setRows([]);
    api.get<Order>(`/purchase-orders/${selected}/`, { timeout: 15000 }).then(({ data }) => {
      if (!active) return;
      setOrder(data); setOrders(previous => previous.some(item => item.id === data.id) ? previous : [data, ...previous]);
      setRows(data.lines.filter(line => line.stock_item && !line.stock_posted && Number(line.quantity_remaining) > 0).map(line => ({ purchase_line: line.id!, quantity_received: '0', damaged_quantity: '0', missing_quantity: '0', remarks: '' })));
    }).catch(cause => { if (active) setError(errorText(cause)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selected, retryLoad, demo]);
  const patch = (index: number, key: keyof Omit<Entry, 'purchase_line'>, value: string) => setRows(previous => previous.map((row, i) => i === index ? { ...row, [key]: value } : row));
  async function save(event: FormEvent) {
    event.preventDefault(); if (saving || !order) return;
    const entries = rows.filter(row => Number(row.quantity_received) > 0 || Number(row.missing_quantity) > 0 || Number(row.damaged_quantity) > 0);
    if (!entries.length) { setError('Enter a received or missing quantity for at least one PO item.'); return; }
    setError(''); setSaving(true); setAttempted(true);
    try {
      const { data } = await api.post<GRN>('/goods-received-notes/', { request_id: requestId, purchase_order: order.id, receipt_date: date, authorized_person: authorized, notes, lines: entries }, { timeout: 20000 });
      await reloadFinished(); navigate(`/goods-received-notes/${data.id}`);
    } catch (cause) { setError(errorText(cause)); } finally { setSaving(false); }
  }
  if (demo) return <Card>Sign in with a Django account to record a GRN.</Card>;
  return <form onSubmit={save} className="space-y-5">
    <div><Link className="text-sm text-teal underline" to="/goods-received-notes">← Goods Received Notes</Link><h1 className="mt-3 text-2xl font-semibold text-navy">New Goods Received Note</h1><p className="mt-1 text-sm text-slate-500">Received quantity includes damaged goods. Stock IN = received minus damaged; missing goods add no stock.</p></div>
    {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-red-700"><p>{error}</p>{!attempted && <button type="button" className="underline" onClick={() => { if (selected) setRetryLoad(value => value + 1); else void loadOptions(); }}>Reload PO details</button>}</div>}
    <fieldset disabled={saving || attempted} className="space-y-5 disabled:opacity-70">
      <Card><div className="grid gap-4 md:grid-cols-2">
        <Field label="Purchase Order *"><select required className={field} value={selected} onChange={e => setSelected(e.target.value)}><option value="">Choose a purchase order</option>{orders.map(po => <option key={po.id} value={po.id} disabled={!po.can_receive}>{po.number} · {po.supplier_name}{!po.can_receive ? ' · Already received / no linked stock' : ''}</option>)}</select>{next && <button type="button" className="text-xs underline" disabled={loading} onClick={() => void loadOptions(next, true)}>Load more purchase orders</button>}</Field>
        <Field label="Receipt date *"><input required className={field} type="date" min={order?.order_date} max={today()} value={date} onChange={e => setDate(e.target.value)} /></Field>
        <Field label="Supplier"><input className={`${field} bg-slate-50`} readOnly value={order?.supplier_name ?? ''} /></Field>
        <Field label="Received by"><input className={`${field} bg-slate-50`} readOnly value={user?.name ?? ''} /></Field>
        <Field label="Authorized person (optional)"><input className={field} maxLength={200} value={authorized} onChange={e => setAuthorized(e.target.value)} /></Field>
        <Field label="Receipt notes"><textarea className={field} value={notes} onChange={e => setNotes(e.target.value)} /></Field>
      </div></Card>
      {loading && <p role="status">Loading purchase orders…</p>}
      {order && !order.can_receive && <Card>This PO has already been received, or its earlier items have no stock links. Its quantities cannot be added to Stock again.</Card>}
      {!!rows.length && <Card><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold text-navy">Goods received against PO</h2><button type="button" className="text-sm text-teal underline" onClick={() => setRows(previous => previous.map(row => ({ ...row, quantity_received: order!.lines.find(line => line.id === row.purchase_line)!.quantity_remaining!, damaged_quantity: '0', missing_quantity: '0' })))}>Receive all outstanding</button></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="border-b text-slate-500"><tr>{['Item / unit', 'Ordered', 'Previously received', 'Outstanding', 'Received now', 'Damaged', 'Missing', 'Add to Stock', 'Remarks'].map(label => <th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((row, index) => {
          const line = order!.lines.find(item => item.id === row.purchase_line)!;
          return <tr key={row.purchase_line} className="border-b align-top"><td className="min-w-[180px] p-2"><strong>{line.stock_label || line.description}</strong><p className="text-xs text-slate-500">{line.unit}</p></td><td className="p-2">{line.quantity}</td><td className="p-2">{line.quantity_received}</td><td className="p-2">{line.quantity_remaining}</td>
            {(['quantity_received', 'damaged_quantity', 'missing_quantity'] as const).map(key => <td className="min-w-[115px] p-2" key={key}><input aria-label={`Item ${index + 1} ${key}`} className={field} type="number" required min="0" step="0.001" max={key === 'damaged_quantity' ? row.quantity_received : key === 'missing_quantity' ? Math.max(0, Number(line.quantity_remaining) - Number(row.quantity_received)) : line.quantity_remaining} value={row[key]} onChange={e => patch(index, key, e.target.value)} /></td>)}
            <td className="p-2 font-medium text-emerald-700">{Math.max(0, Number(row.quantity_received) - Number(row.damaged_quantity)).toLocaleString(undefined, { maximumFractionDigits: 3 })} {line.unit}</td><td className="min-w-[170px] p-2"><input aria-label={`Item ${index + 1} remarks`} className={field} value={row.remarks} onChange={e => patch(index, 'remarks', e.target.value)} /></td></tr>;
        })}</tbody></table></div><p className="mt-3 text-xs text-slate-500">Missing quantity reports a shortage in this delivery; it remains outstanding for a later receipt. Damaged goods are recorded as delivered but excluded from usable stock.</p>
      </Card>}
    </fieldset>
    {attempted && !saving && <p className="text-sm text-slate-600">Retrying the same GRN is safe. Check the GRN list before starting another note for this delivery.</p>}
    <div className="flex flex-wrap gap-3"><button className={button} disabled={saving || loading || !rows.length}>{saving ? 'Saving…' : attempted ? 'Retry GRN save' : 'Save GRN & Add Accepted Goods to Stock'}</button><Link className="rounded-lg border px-4 py-2 text-sm" to="/goods-received-notes">Cancel</Link>{attempted && !saving && <button type="button" className="text-sm underline" onClick={() => setAttempted(false)}>Edit entries</button>}</div>
  </form>;
}

export function GoodsReceivedNoteDetail() {
  const { id } = useParams(); const [note, setNote] = useState<GRN | null>(null);
  const [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  useEffect(() => { let active = true; setNote(null); setError(''); api.get<GRN>(`/goods-received-notes/${id}/`, { timeout: 15000 }).then(({ data }) => { if (active) setNote(data); }).catch(cause => { if (active) setError(errorText(cause)); }); return () => { active = false; }; }, [id, attempt]);
  return <div className="grn-document space-y-5">
    <div className="grn-no-print flex flex-wrap items-center justify-between gap-3"><Link className="text-sm text-teal underline" to="/goods-received-notes">← Goods Received Notes</Link>{note && <button className={button} onClick={() => window.print()}>Print GRN</button>}</div>
    {error ? <Card><p role="alert">{error}</p><button className="underline" onClick={() => setAttempt(value => value + 1)}>Retry</button></Card> : !note ? <p role="status">Loading GRN…</p> : <>
      <Card><p className="text-sm uppercase tracking-widest text-slate-500">Nava Pack · Goods Received Note</p><h1 className="mt-2 break-all text-2xl font-semibold text-navy">{note.number}</h1><dl className="mt-5 grid gap-4 text-sm md:grid-cols-2">{[['Date of receipt', note.receipt_date], ['Supplier', note.supplier_name], ['PO number', note.po_number], ['Received by', note.receiver_name], ['Authorized person', note.authorized_person || '—'], ['Notes', note.notes || '—']].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap font-medium">{value}</dd></div>)}</dl></Card>
      <Card><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b"><tr>{['Item / description', 'Unit', 'Ordered', 'Previously received', 'Received', 'Damaged', 'Missing', 'Added to Stock', 'Remarks'].map(label => <th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{note.lines.map(line => <tr className="border-b" key={line.purchase_line}>{[line.stock_label || line.description, line.unit, line.quantity_ordered, line.previously_received, line.quantity_received, line.damaged_quantity, line.missing_quantity, line.quantity_accepted, line.remarks || '—'].map((value, index) => <td className="p-2" key={index}>{value}</td>)}</tr>)}</tbody></table></div><p className="mt-4 text-sm text-slate-500">Stock IN includes received quantities minus damaged goods. Missing goods remain outstanding.</p></Card>
      <div className="grn-no-print flex gap-4 text-sm text-teal underline"><Link to={`/purchase-orders/${note.purchase_order}`}>View Purchase Order</Link><Link to="/stock">View Stock</Link></div>
      <style>{'@media print { @page { size: A4 landscape; margin: 12mm; } aside, header, nav, .grn-no-print { display: none !important; } main { width: 100% !important; padding: 0 !important; } body { background: white !important; } .overflow-hidden, .grn-document .overflow-x-auto { overflow: visible !important; } .grn-document table { width: 100%; table-layout: fixed; font-size: 10px; } .grn-document td, .grn-document th { overflow-wrap: anywhere; } .grn-document tr { break-inside: avoid; } }'}</style>
    </>}
  </div>;
}
