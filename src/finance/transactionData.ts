export const transactionKinds = ['sales-invoice', 'purchase-invoice', 'receipt', 'payment', 'journal', 'credit-note', 'debit-note'] as const;
export type DocumentKind = typeof transactionKinds[number];
export const documentTitles: Record<DocumentKind, string> = {
  'sales-invoice': 'Sales Invoice Accounting', 'purchase-invoice': 'Purchase Invoice Accounting',
  receipt: 'Receipt Entry', payment: 'Payment Entry', journal: 'Journal Entry',
  'credit-note': 'Credit Notes', 'debit-note': 'Debit Notes',
};
export interface DocumentBase { id: string; kind: DocumentKind; reference: string; date: string; currency: string; memo: string; state: 'Draft' | 'Reference snapshot' }
export interface AmountLine { description: string; quantity: string; unitPrice: string; taxRate: string }
export interface InvoiceDocument extends DocumentBase { kind: 'sales-invoice' | 'purchase-invoice'; party: string; source: string; lines: AmountLine[]; settled: number }
export interface Allocation { invoice: string; amount: string }
export interface PaymentDocument extends DocumentBase { kind: 'receipt' | 'payment'; party: string; bank: string; amount: string; allocations: Allocation[] }
export interface JournalLine { account: string; description: string; debit: string; credit: string }
export interface JournalDocument extends DocumentBase { kind: 'journal'; lines: JournalLine[] }
export interface NoteDocument extends DocumentBase { kind: 'credit-note' | 'debit-note'; party: string; invoice: string; lines: AmountLine[] }
export type FinanceDocument = InvoiceDocument | PaymentDocument | JournalDocument | NoteDocument;
export interface HistoryEvent { document: string; sequence: number; action: string; reference: string }
export interface TransactionSnapshot { documents: FinanceDocument[]; history: HistoryEvent[] }
export const isInvoice = (d: FinanceDocument): d is InvoiceDocument => d.kind === 'sales-invoice' || d.kind === 'purchase-invoice';
export const isPayment = (d: FinanceDocument): d is PaymentDocument => d.kind === 'receipt' || d.kind === 'payment';
export const isNote = (d: FinanceDocument): d is NoteDocument => d.kind === 'credit-note' || d.kind === 'debit-note';
export const operationalReferences = [
  { id: 'DEMO-OP-SALES-01', label: 'Fictional sales/dispatch document 01', kind: 'sales-invoice', party: 'DEMO-P1', currency: 'UGX' },
  { id: 'DEMO-OP-PURCHASE-01', label: 'Fictional purchase receipt document 01', kind: 'purchase-invoice', party: 'DEMO-P2', currency: 'UGX' },
] as const;
export const blankAmountLine = (): AmountLine => ({ description: '', quantity: '1', unitPrice: '0', taxRate: '0' });
export const blankJournalLine = (): JournalLine => ({ account: '', description: '', debit: '0', credit: '0' });
export function newDocument(kind: DocumentKind): FinanceDocument {
  const base = { id: '', reference: '', date: '2026-11-06', currency: 'UGX', memo: '', state: 'Draft' as const };
  if (kind === 'sales-invoice' || kind === 'purchase-invoice') return { ...base, kind, party: '', source: '', lines: [blankAmountLine()], settled: 0 };
  if (kind === 'receipt' || kind === 'payment') return { ...base, kind, party: '', bank: '', amount: '0', allocations: [{ invoice: '', amount: '0' }] };
  if (kind === 'journal') return { ...base, kind, lines: [blankJournalLine(), blankJournalLine()] };
  return { ...base, kind, party: '', invoice: '', lines: [blankAmountLine()] };
}
export function createTransactionFixtures(): TransactionSnapshot {
  const sales: InvoiceDocument = { ...newDocument('sales-invoice') as InvoiceDocument, id: 'DEMO-FINV-S1', reference: 'DEMO-SALES-REF-01', date: '2026-11-01', party: 'DEMO-P1', source: 'DEMO-OP-SALES-01', state: 'Reference snapshot', settled: 2000, lines: [{ description: 'Fictional packaging accounting line', quantity: '10', unitPrice: '1000', taxRate: '0' }] };
  const purchase: InvoiceDocument = { ...newDocument('purchase-invoice') as InvoiceDocument, id: 'DEMO-FINV-P1', reference: 'DEMO-PURCHASE-REF-01', date: '2026-11-02', party: 'DEMO-P2', source: 'DEMO-OP-PURCHASE-01', state: 'Reference snapshot', settled: 1000, lines: [{ description: 'Fictional materials accounting line', quantity: '5', unitPrice: '1200', taxRate: '0' }] };
  return { documents: [sales, purchase], history: [sales, purchase].map((d, i) => ({ document: d.id, sequence: i + 1, action: 'Fictional reference snapshot loaded; no posting', reference: d.reference })) };
}
