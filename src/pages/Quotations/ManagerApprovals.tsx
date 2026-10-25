import { useSalesOrders } from '@/context/SalesOrdersContext';
import { useQuotations } from '@/context/QuotationsContext';
import { Link } from 'react-router-dom';
import { today } from '@/lib/salesOrders';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { QUOTE_BUTTON } from './QuotationPrint';

interface PendingQuote { fulfillment?: { requires_delivery_date: boolean; sales_order: { id: string; number: string; job_card_ids: string[] } | null }; id: string; approved: boolean; rejected_at: string | null; rejection_reason: string; reviewed_by: string | null; document: { number: string; revision: number; customer: { name: string; contactPerson: string; email: string; telephone: string; billingAddress: string }; currency: string; taxRate: string; taxMode: string; totals: { taxableAmount: string; tax: string; total: string }; validUntil: string; lines: { description: string; quantity: string; unit: string; unitPrice: string; lineTotal?: string }[]; terms: Record<string, string | number> } }

function approvalError(error: unknown) {
  if (axios.isAxiosError(error)) return error.response?.data?.detail ?? 'Unable to reach the approval service. Check your backend connection and quotation permissions.';
  return error instanceof Error ? error.message : 'Unable to process approval.';
}

export function ManagerApprovals() {
  const { user } = useAuth();
  const { reloadOrders } = useSalesOrders();
  const { reload: reloadQuotations } = useQuotations();
  const [rows, setRows] = useState<PendingQuote[]>([]), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'), [selected, setSelected] = useState<string | null>(null);
  const [deliveryDates, setDeliveryDates] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({}), [notice, setNotice] = useState('');
  const isManager = user?.role === 'project_manager' || user?.role === 'production_manager';
  const reload = async () => {
    setBusy(true); setError('');
    try {
      const records: PendingQuote[] = [];
      for (let page = 1; ; page++) {
        const { data } = await api.get('/quotations/', { params: { submitted: 'true', page } });
        records.push(...data.results);
        if (!data.next) break;
      }
      setRows(records.filter(q => statusFilter === 'all' || (statusFilter === 'approved' ? q.approved && !q.rejected_at : statusFilter === 'rejected' ? !!q.rejected_at : !q.approved && !q.rejected_at)));
    } catch(e) { setError(approvalError(e)); } finally { setBusy(false); }
  };
  useEffect(() => { if (isManager && user && !user.id.startsWith('demo-')) void reload(); }, [user?.id, statusFilter]);
  if (!isManager || !user) return null;
  const approve = async (id: string) => {
    setBusy(true); setError('');
    try { const { data } = await api.post<PendingQuote>(`/quotations/${id}/approve/`, { required_date: deliveryDates[id] || undefined }); const order = data.fulfillment?.sales_order; setNotice(order ? `Quotation approved. Sales Order ${order.number} created. ${order.job_card_ids.length ? 'Manufacturing Job Card created for production review.' : 'Existing stock can be dispatched against the Sales Order; no Job Card is needed.'}` : 'Quotation approved.'); await Promise.all([reload(), reloadOrders(), reloadQuotations()]); }
    catch(e) { setError(approvalError(e)); } finally { setBusy(false); }
  };
  const reject = async (id: string) => {
    setBusy(true); setError(''); setNotice('');
    try { await api.post(`/quotations/${id}/reject/`, { reason: reasons[id] ?? '' }); setNotice('Quotation rejected. Email and WhatsApp sending are blocked until a revised quotation is approved.'); await reload(); }
    catch(e) { setError(approvalError(e)); } finally { setBusy(false); }
  };
  const preview = async (id: string) => {
    setBusy(true); setError('');
    try {
      const { data } = await api.get(`/quotations/${id}/pdf/`, { responseType: 'blob' });
      const url = URL.createObjectURL(data); const link = document.createElement('a');
      link.href = url; link.download = 'quotation-review.pdf'; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch(e) { setError(approvalError(e)); } finally { setBusy(false); }
  };
  return <Card className="space-y-3"><h2 className="text-lg font-semibold">Manager Quotations</h2>
    <p className="text-sm">Review submitted PDFs before approving. Approval creates the Sales Order and a Job Card for manufacturing items only. Existing stock items need no Job Card. Email/WhatsApp delivery remains a separate action.</p>
    {user.id.startsWith('demo-') ? <p className="text-sm">Sign in with a real manager account to review saved submissions.</p> : <>
      <div className="flex flex-wrap gap-3"><label>Show<select value={statusFilter} disabled={busy} onChange={e => { setStatusFilter(e.target.value); setSelected(null); }} className="ml-2 rounded border p-2"><option value="pending">Pending approval</option><option value="approved">Approved quotations</option><option value="rejected">Rejected quotations</option><option value="all">All submitted quotations</option></select></label><button disabled={busy} className={QUOTE_BUTTON} onClick={() => void reload()}>Refresh Quotations</button></div>
      {!busy && !rows.length && <p>No quotations match the selected status.</p>}
      {rows.map(q => <div key={q.id} className="space-y-3 border-t pt-3"><p className="font-medium">{q.document.number} · Revision {q.document.revision} · {q.document.customer.name}</p><p>{q.document.currency} {q.document.totals.total} · Valid until {q.document.validUntil} · {q.rejected_at ? 'Rejected' : q.approved ? 'Approved' : 'Pending approval'}</p><div className="flex gap-2 flex-wrap max-w-full"><button className={QUOTE_BUTTON} onClick={() => setSelected(selected === q.id ? null : q.id)}>{selected === q.id ? 'Close Details' : 'View Quotation'}</button><button disabled={busy} className={QUOTE_BUTTON} onClick={() => void preview(q.id)}>Review PDF</button></div>
        {selected === q.id && <section className="space-y-3 rounded border bg-gray-50 p-4"><p>{q.document.customer.contactPerson} · {q.document.customer.telephone} · {q.document.customer.email}</p><p className="whitespace-pre-wrap">{q.document.customer.billingAddress}</p><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Item', 'Quantity', 'Unit', 'Unit price', 'Line total'].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{q.document.lines.map((l, i) => <tr key={i}><td className="p-2">{l.description}</td><td className="p-2">{l.quantity}</td><td className="p-2">{l.unit}</td><td className="p-2">{l.unitPrice}</td><td className="p-2">{l.lineTotal ?? (Number(l.quantity) * Number(l.unitPrice)).toFixed(2)}</td></tr>)}</tbody></table></div><p>VAT {q.document.taxRate}% · {q.document.taxMode} pricing · VAT amount {q.document.totals.tax}</p><p className="font-semibold">Total: {q.document.currency} {q.document.totals.total}</p>{Object.entries(q.document.terms).filter(([, v]) => v !== '').map(([k, v]) => <p key={k} className="whitespace-pre-wrap text-sm">{k}: {v}</p>)}
          {q.fulfillment?.sales_order && <p><Link className="underline text-navy" to={`/sales-orders/${q.fulfillment.sales_order.id}`}>Sales Order {q.fulfillment.sales_order.number}</Link> · {q.fulfillment.sales_order.job_card_ids.length ? 'Manufacturing Job Card created' : 'Fulfill from existing stock — no Job Card'}</p>}{q.rejected_at ? <p>Rejected by {q.reviewed_by}: {q.rejection_reason}</p> : q.approved ? <p>Approved by {q.reviewed_by}</p> : <>{q.fulfillment?.requires_delivery_date && <label className="block">Manufacturing delivery date<input type="date" min={today()} required value={deliveryDates[q.id] ?? ''} onChange={e => setDeliveryDates(dates => ({ ...dates, [q.id]: e.target.value }))} className="ml-2 rounded border p-2" /></label>}<button disabled={busy || (!!q.fulfillment?.requires_delivery_date && !deliveryDates[q.id])} className="rounded-card border border-green-700 bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 focus-visible:outline-green-700 disabled:cursor-not-allowed disabled:opacity-40" onClick={() => void approve(q.id)}>Approve Quotation</button><form className="space-y-2" onSubmit={e => { e.preventDefault(); void reject(q.id); }}><label className="block">Rejection reason<textarea required maxLength={2000} disabled={busy} value={reasons[q.id] ?? ''} onChange={e => setReasons({ ...reasons, [q.id]: e.target.value })} className="mt-1 block w-full rounded border p-2" /></label><button disabled={busy || !reasons[q.id]?.trim()} className={QUOTE_BUTTON}>Reject Quotation</button></form></>}
        </section>}
      </div>)}
    </>}{notice && <p role="status" className="text-green-800">{notice}</p>}{error && <p role="alert" className="text-red-700">{error}</p>}</Card>;
}
