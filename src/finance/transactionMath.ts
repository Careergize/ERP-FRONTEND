import type { AmountLine, FinanceDocument, InvoiceDocument, JournalDocument } from './transactionData';
import { isNote, isPayment } from './transactionData';
export const MAX_DEMO_AMOUNT = 1_000_000_000_000;
// Zero-decimal UGX demo only. Decimal quantities (3 places) and rates (2 places)
// are scaled integers; round each line net and tax half-up. This is illustrative.
export function scaled(value: string, places = 0): number | null {
  const pattern = places === 0 ? /^\d+$/ : new RegExp(`^\\d+(?:\\.\\d{1,${places}})?$`);
  if (!pattern.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const result = Number(whole) * 10 ** places + Number(fraction.padEnd(places, '0'));
  return Number.isSafeInteger(result) && result <= MAX_DEMO_AMOUNT ? result : null;
}
export function amountTotals(lines: AmountLine[]) {
  let subtotal = 0, tax = 0, valid = lines.length > 0;
  for (const line of lines) {
    const quantity = scaled(line.quantity, 3), price = scaled(line.unitPrice), rate = scaled(line.taxRate, 2);
    if (quantity === null || quantity <= 0 || price === null || rate === null || rate > 10000 || !Number.isSafeInteger(quantity * price + 500)) { valid = false; continue; }
    const net = Math.floor((quantity * price + 500) / 1000);
    if (!Number.isSafeInteger(net * rate + 5000)) { valid = false; continue; }
    subtotal += net; tax += Math.floor((net * rate + 5000) / 10000);
  }
  const total = subtotal + tax;
  valid = valid && Number.isSafeInteger(total) && total <= MAX_DEMO_AMOUNT;
  return { subtotal, tax, total, valid };
}
export function journalTotals(doc: JournalDocument) {
  const debit = doc.lines.reduce((sum, line) => sum + (scaled(line.debit) ?? 0), 0);
  const credit = doc.lines.reduce((sum, line) => sum + (scaled(line.credit) ?? 0), 0);
  return { debit, credit, difference: debit - credit };
}
export function invoiceBalance(invoice: InvoiceDocument, documents: FinanceDocument[], exclude = '') {
  const gross = amountTotals(invoice.lines).total;
  const adjustments = documents.filter(isNote).filter(d => d.id !== exclude && d.invoice === invoice.id).reduce((sum, d) => sum + amountTotals(d.lines).total, 0);
  const planned = documents.filter(isPayment).filter(d => d.id !== exclude).flatMap(d => d.allocations).filter(a => a.invoice === invoice.id).reduce((sum, a) => sum + (scaled(a.amount) ?? 0), 0);
  return { gross, settled: invoice.settled, outstanding: gross - invoice.settled, adjustments, planned, available: gross - invoice.settled - adjustments - planned };
}
export function documentTotal(doc: FinanceDocument) { return isPayment(doc) ? scaled(doc.amount) ?? 0 : doc.kind === 'journal' ? journalTotals(doc).debit : amountTotals(doc.lines).total; }
