import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { ENTRY_INPUT } from '@/components/ui/SearchSelect';
import { OrderDraftEditor } from '@/lib/orderDraftEditor';
import { editableDraft, isControlledDraft, type DraftItem } from '@/lib/orderDraftApi';

const button = 'rounded-card border border-gray-200 px-3 py-2 text-sm text-navy disabled:opacity-50';
export function ControlledDraftWorkspace({ orderId, onSaved }: { orderId?: string; onSaved: (id: string) => void }) {
  const { user } = useAuth();
  // New instance per authenticated actor. No legacy Context/local fulfillment mutations.
  const editor = useMemo(() => new OrderDraftEditor(user?.id ?? '', undefined, {
    getItem: key => sessionStorage.getItem(key), setItem: (key, value) => sessionStorage.setItem(key, value),
    removeItem: key => sessionStorage.removeItem(key),
  }), [user?.id]);
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot);
  const activeEditor = useRef<OrderDraftEditor | null>(editor);
  activeEditor.current = editor;
  useEffect(() => { activeEditor.current = editor; return () => { activeEditor.current = null; }; }, [editor]);
  const [openId, setOpenId] = useState(orderId ?? '');
  useEffect(() => { setOpenId(orderId === 'new' ? '' : orderId ?? ''); }, [orderId]);
  useEffect(() => {
    if (user && !user.id.startsWith('demo-') && orderId && orderId !== 'new' && state.order?.id !== orderId) void editor.open(orderId);
    // Fetch on route/actor changes; state updates must not trigger automatic retries.
  }, [editor, orderId]);
  const realUser = !!user && !user.id.startsWith('demo-');
  const readOnly = !realUser || state.busy || state.pending || state.conflict || !!state.order && !editableDraft(state.order);
  const content = state.content;
  const changeItem = (index: number, change: Partial<DraftItem>) => editor.change({ ...content,
    items: content.items.map((item, i) => i === index ? { ...item, ...change } : item) });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await editor.save();
    if (result && activeEditor.current === editor) onSaved(result.id);
  };
  const reopen = async () => {
    await editor.open(openId);
    const loaded = editor.getSnapshot();
    if (!loaded.error && loaded.order && activeEditor.current === editor) onSaved(loaded.order.id);
  };
  return <Card className="space-y-4">
    <div className="flex items-center justify-between"><h2 className="font-semibold text-navy">Controlled Draft test workspace</h2><Link to="/sales-orders" className="underline">Close</Link></div>
    <p className="text-sm text-amber-800">Isolated test API only. Saves Draft demand and revision evidence. No allocation, reservation or stock action is available here.</p>
    {!realUser && <p role="alert">Sign in with a Django test account. Demo accounts cannot persist Drafts.</p>}
    <div className="flex flex-wrap items-end gap-3"><label>Saved order ID<input className={ENTRY_INPUT} value={openId} placeholder="wf-order-123" onChange={e => setOpenId(e.target.value)} /></label>
      <button type="button" className={button} disabled={!realUser || state.busy || state.pending} onClick={() => void reopen()}>Reopen from backend (discard unsaved edits)</button>
      <Link className="underline" to="/sales-orders?draft=new" reloadDocument>New controlled Draft</Link></div>
    {state.busy && <p role="status">Waiting for backend…</p>}
    {state.error && <div role="alert" className="text-red-700"><p>{state.error}</p>{Boolean(state.fields) && Object.keys(state.fields as object).length > 0 && <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(state.fields, null, 2)}</pre>}</div>}
    {state.notice && <p role="status" className="text-emerald-800">{state.notice}</p>}
    {state.pending && <p className="text-amber-800">Unconfirmed save retained for this account in this tab. Editing and reopening are locked until an exact retry resolves it.</p>}
    {state.order && <p>{state.order.orderNumber} · {isControlledDraft(state.order) ? `Controlled · version ${state.order.controlVersion} · ${state.order.commercialStatus}` : 'Legacy · version unknown · read only'}</p>}
    <form onSubmit={e => void submit(e)} className="space-y-4">
      <fieldset disabled={readOnly} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label>Customer name<input required className={ENTRY_INPUT} value={content.customerName ?? ''} onChange={e => editor.change({ ...content, customerName: e.target.value })} /></label>
          <label>Order date<input type="date" required className={ENTRY_INPUT} value={content.date ?? ''} onChange={e => editor.change({ ...content, date: e.target.value })} /></label>
          <label>Marketing person<input required className={ENTRY_INPUT} value={content.marketingPersonName ?? ''} onChange={e => editor.change({ ...content, marketingPersonName: e.target.value })} /></label>
          <label>Customer type<select required className={ENTRY_INPUT} value={content.customerType ?? ''} onChange={e => editor.change({ ...content, customerType: e.target.value as 'B2B' | 'B2C' | '' })}><option value="">Select customer type</option><option value="B2B">B2B</option><option value="B2C">B2C</option></select></label>
          <label>Currency<input required className={ENTRY_INPUT} value={content.currency ?? ''} onChange={e => editor.change({ ...content, currency: e.target.value })} /></label>
          <label>Applicable tax %<input required className={ENTRY_INPUT} type="number" min="0" max="100" step="any" value={content.taxRate ?? ''} onChange={e => editor.change({ ...content, taxRate: e.target.value })} /></label>
        </div>
        {content.items.map((item, index) => <fieldset key={item.id} className="rounded-card border border-gray-200 p-3">
          <legend>Product {index + 1} · {item.id}</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <label>Product name<input required className={ENTRY_INPUT} value={item.itemName} onChange={e => changeItem(index, { itemName: e.target.value })} /></label>
            <label>Source<select className={ENTRY_INPUT} value={item.fulfillmentSource} onChange={e => changeItem(index, { fulfillmentSource: e.target.value as DraftItem['fulfillmentSource'] })}><option value="stock">Stock</option><option value="manufacturing">Manufacturing</option></select></label>
            {item.fulfillmentSource === 'stock' ? <label>Saved stock variant ID<input required className={ENTRY_INPUT} value={item.itemId ?? ''} onChange={e => changeItem(index, { itemId: e.target.value })} /></label> : <>
              <label>Saved model ID<input required className={ENTRY_INPUT} value={item.modelId ?? ''} onChange={e => changeItem(index, { modelId: e.target.value })} /></label>
              <label>Saved model revision<input required type="number" min="1" step="1" className={ENTRY_INPUT} value={item.modelRevision ?? ''} onChange={e => changeItem(index, { modelRevision: e.target.valueAsNumber })} /></label>
              <label>Required date<input required type="date" className={ENTRY_INPUT} value={item.requiredDate ?? ''} onChange={e => changeItem(index, { requiredDate: e.target.value })} /></label></>}
            <label>Exact unit<input required className={ENTRY_INPUT} value={item.unit} onChange={e => changeItem(index, { unit: e.target.value })} /></label>
            <label>Quantity<input required type="number" min="0" step="any" className={ENTRY_INPUT} value={item.quantity} onChange={e => changeItem(index, { quantity: e.target.value })} /></label>
            <label>Unit price<input required type="number" min="0" step="any" className={ENTRY_INPUT} value={item.unitPrice} onChange={e => changeItem(index, { unitPrice: e.target.value })} /></label>
          </div><button type="button" className={button} onClick={() => editor.change({ ...content, items: content.items.filter((_, i) => i !== index) })}>Remove product</button>
        </fieldset>)}
        <button type="button" className={button} onClick={() => editor.change({ ...content, items: [...content.items,
          { id: crypto.randomUUID(), itemName: '', fulfillmentSource: 'stock', quantity: '', unit: '', unitPrice: '' }] })}>Add product</button>
        <label className="block">Save reason<textarea required maxLength={2000} className={ENTRY_INPUT} value={state.reason} onChange={e => editor.change(content, e.target.value)} /></label>
      </fieldset>
      <button className={button} disabled={!realUser || state.busy || state.conflict || !!state.order && !editableDraft(state.order)}>{state.pending ? 'Retry exact pending save' : state.order ? 'Save Draft revision' : 'Create Draft'}</button>
    </form>
    {state.order && <section className="space-y-3"><p>Backend total: {state.order.currency} {state.order.orderTotal}</p>
      <button type="button" className={button} disabled={state.busy || state.pending} onClick={() => void editor.history()}>Load revision history</button>
      {state.history && <ol>{state.history.revisions.map(revision => <li key={revision.id} className="border-t py-2"><details><summary>Revision {revision.revision} · {revision.capturedAt} · {revision.reason}</summary><p className="break-all text-xs">Hash: {revision.contentHash}</p><pre className="overflow-auto text-xs">{JSON.stringify(revision.content, null, 2)}</pre></details></li>)}</ol>}
    </section>}
  </Card>;
}
