import type { FinanceDocument, HistoryEvent } from '@/finance/transactionData';
export function FinanceDocumentReference({ id, documents, onOpen }: { id: string; documents: FinanceDocument[]; onOpen: (doc: FinanceDocument) => void }) {
  const document = documents.find(d => d.id === id);
  return document ? <button type="button" className="break-all text-left text-sm underline" onClick={() => onOpen(document)}>{document.reference}</button> : <span className="text-sm text-amber-800">No linked demo document</span>;
}
export function FinanceTransactionHistory({ events, document }: { events: HistoryEvent[]; document: string }) {
  return <section className="mt-6 border-t pt-4"><h3 className="font-semibold">Local transaction history</h3><ol className="mt-3 space-y-3 text-sm text-slate-600">{events.filter(e => e.document === document).map(e => <li key={e.sequence}><span className="text-xs text-slate-500">Local event {e.sequence} · {e.reference}</span><p>{e.action}</p></li>)}</ol><p className="mt-3 text-xs text-slate-500">In-memory preview events only; no production audit trail.</p></section>;
}
