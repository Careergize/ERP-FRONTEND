import { createTransactionFixtures, isInvoice, type InvoiceDocument } from './transactionData';
import { amountTotals } from './transactionMath';
export const REPORT_START = '2026-01-01';
export const REPORT_AS_OF = '2026-11-06';
export const reportPages = { ledger: 'General Ledger', 'trial-balance': 'Trial Balance', 'profit-loss': 'Profit and Loss', 'balance-sheet': 'Balance Sheet', receivables: 'Receivables Aging', payables: 'Payables Aging' } as const;
export type ReportPage = keyof typeof reportPages;
export type ReportCategory = 'Assets' | 'Liabilities' | 'Equity' | 'Revenue' | 'Cost of sales' | 'Operating expenses';
export interface ReportAccount { id: string; code: string; name: string; parent: string; category: ReportCategory; group: boolean }
export type ReportKind = 'opening' | 'sales-invoice' | 'purchase-invoice' | 'receipt' | 'payment' | 'journal';
export interface ReportDocument { id: string; reference: string; date: string; kind: ReportKind; description: string; invoice?: InvoiceDocument; due?: string; settlement?: { invoice: string; amount: number }; party?: string }
export interface ReportLine { id: string; document: string; account: string; debit: number; credit: number }
export interface ReportDataset { accounts: ReportAccount[]; documents: ReportDocument[]; lines: ReportLine[] }
export const reportParties = [{ id: 'DEMO-P1', name: 'Sample customer Alpha' }, { id: 'DEMO-P2', name: 'Sample supplier Beta' }] as const;
export function createReportDataset(): ReportDataset {
  const accounts: ReportAccount[] = [];
  const account = (id: string, code: string, name: string, category: ReportCategory, parent = '', group = false) => accounts.push({ id, code, name, category, parent, group });
  account('assets', '1000', 'Assets', 'Assets', '', true);
  account('current-assets', '1100', 'Current assets', 'Assets', 'assets', true);
  account('bank', '1110', 'Fictional bank', 'Assets', 'current-assets');
  account('ar', '1120', 'Receivables control', 'Assets', 'current-assets');
  account('inventory', '1130', 'Sample inventory valuation', 'Assets', 'current-assets');
  account('liabilities', '2000', 'Liabilities', 'Liabilities', '', true);
  account('ap', '2100', 'Payables control', 'Liabilities', 'liabilities');
  account('equity', '3000', 'Equity', 'Equity', '', true);
  account('capital', '3100', 'Sample contributed capital', 'Equity', 'equity');
  account('income', '4000', 'Revenue', 'Revenue', '', true);
  account('sales', '4100', 'Sample sales revenue', 'Revenue', 'income');
  account('costs', '5000', 'Cost of sales', 'Cost of sales', '', true);
  account('cogs', '5100', 'Sample cost of sales', 'Cost of sales', 'costs');
  account('expenses', '6000', 'Operating expenses', 'Operating expenses', '', true);
  account('overheads', '6100', 'Sample operating expenses', 'Operating expenses', 'expenses');
  const documents: ReportDocument[] = [], lines: ReportLine[] = [];
  const entry = (document: ReportDocument, postings: { account: string; debit: number; credit: number }[]) => {
    documents.push(document); postings.forEach((p, i) => lines.push({ ...p, id: `${document.id}-L${i + 1}`, document: document.id }));
  };
  entry({ id: 'DEMO-R-OPEN', reference: 'DEMO-REPORT-OPENING', date: REPORT_START, kind: 'opening', description: 'Fictional opening balances' }, [
    { account: 'bank', debit: 100000, credit: 0 }, { account: 'inventory', debit: 20000, credit: 0 }, { account: 'capital', debit: 0, credit: 120000 },
  ]);
  const addInvoice = (invoice: InvoiceDocument, due: string) => {
    const total = amountTotals(invoice.lines).total;
    entry({ id: invoice.id, reference: invoice.reference, date: invoice.date, kind: invoice.kind, description: invoice.lines.map(l => l.description).join('; '), invoice, due, party: invoice.party }, invoice.kind === 'sales-invoice' ? [
      { account: 'ar', debit: total, credit: 0 }, { account: 'sales', debit: 0, credit: total },
    ] : [{ account: 'inventory', debit: total, credit: 0 }, { account: 'ap', debit: 0, credit: total }]);
  };
  // Reuse the exact immutable Batch 3 invoices; never include editable drafts.
  const originals = createTransactionFixtures().documents.filter(isInvoice);
  for (const invoice of originals) {
    addInvoice(invoice, invoice.kind === 'sales-invoice' ? '2026-11-15' : '2026-11-20');
    const receipt = invoice.kind === 'sales-invoice';
    entry({ id: `DEMO-R-SETTLE-${invoice.id}`, reference: receipt ? 'DEMO-REPORT-RECEIPT-01' : 'DEMO-REPORT-PAYMENT-01', date: '2026-11-03', kind: receipt ? 'receipt' : 'payment', description: 'Fictional historical settlement matching Batch 3 snapshot', settlement: { invoice: invoice.id, amount: invoice.settled }, party: invoice.party }, receipt ? [
      { account: 'bank', debit: invoice.settled, credit: 0 }, { account: 'ar', debit: 0, credit: invoice.settled },
    ] : [{ account: 'ap', debit: invoice.settled, credit: 0 }, { account: 'bank', debit: 0, credit: invoice.settled }]);
  }
  // Explicit due dates demonstrate every bucket, including the 90/91-day boundary.
  const ages = [
    ['2026-07-01', '2026-07-15', 900], ['2026-08-01', '2026-08-08', 800],
    ['2026-08-25', '2026-09-10', 700], ['2026-10-01', '2026-10-10', 600],
    ['2026-10-30', '2026-11-10', 500],
  ] as const;
  for (const [index, [date, due, amount]] of ages.entries()) {
    for (const original of originals) {
      const sale = original.kind === 'sales-invoice';
      const id = `DEMO-R-${sale ? 'S' : 'P'}-${index + 1}`;
      const invoice: InvoiceDocument = { ...original, id, reference: id, date, settled: 0, lines: [{ description: 'Fictional historical accounting line', quantity: '1', unitPrice: String(sale ? amount : amount / 2), taxRate: '0' }] };
      addInvoice(invoice, due);
    }
  }
  for (const [date, cost, expense] of [['2026-10-03', 1000, 250], ['2026-11-04', 4000, 500]] as const) {
    entry({ id: `DEMO-R-COST-${date}`, reference: `DEMO-COST-${date}`, date, kind: 'journal', description: 'Illustrative cost recognition; no operational stock movement' }, [{ account: 'cogs', debit: cost, credit: 0 }, { account: 'inventory', debit: 0, credit: cost }]);
    entry({ id: `DEMO-R-EXPENSE-${date}`, reference: `DEMO-EXPENSE-${date}`, date, kind: 'journal', description: 'Illustrative operating expense' }, [{ account: 'overheads', debit: expense, credit: 0 }, { account: 'bank', debit: 0, credit: expense }]);
  }
  return { accounts, documents, lines };
}
