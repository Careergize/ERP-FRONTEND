import type { MasterKind, MasterRecord } from './masterData';
import { createTransactionFixtures, isInvoice, isNote, isPayment, operationalReferences, type FinanceDocument, type TransactionSnapshot } from './transactionData';
import { amountTotals, invoiceBalance, journalTotals, MAX_DEMO_AMOUNT, scaled } from './transactionMath';
type Masters = Record<MasterKind, MasterRecord[]>;
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function validateDocument(doc: FinanceDocument, documents: FinanceDocument[], masters: Masters): string[] {
  const errors: string[] = [];
  if (!/^DEMO-[A-Z0-9-]+$/.test(doc.reference)) errors.push('Reference must begin DEMO- and use uppercase letters, digits or hyphens.');
  if (documents.some(d => d.id !== doc.id && d.reference === doc.reference)) errors.push('Document reference must be unique.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.date) || !Number.isFinite(Date.parse(doc.date)) || new Date(doc.date).toISOString().slice(0, 10) !== doc.date) errors.push('A valid document date is required.');
  if (doc.currency !== 'UGX') errors.push('Only zero-decimal UGX is supported in this illustration; no currency conversion is implied.');
  if (doc.kind !== 'journal') {
    const expected = doc.kind === 'sales-invoice' || doc.kind === 'receipt' || doc.kind === 'credit-note' ? 'Customer' : 'Supplier';
    const party = masters.parties.find(p => p.id === doc.party);
    if (!party || party.type !== expected || party.currency !== doc.currency) errors.push(`Select a ${expected} with matching currency.`);
  }
  if (isInvoice(doc) || isNote(doc)) {
    const totals = amountTotals(doc.lines);
    if (!totals.valid || totals.total <= 0) errors.push('Enter positive line quantities, whole-unit prices, rates from 0–100 (two decimals maximum) and a positive safe total.');
    if (doc.lines.some(l => !l.description.trim())) errors.push('Every line requires a description.');
    if (isInvoice(doc)) {
      const source = operationalReferences.find(s => s.id === doc.source);
      if (!source || source.kind !== doc.kind || source.party !== doc.party || source.currency !== doc.currency) errors.push('Operational reference must match invoice direction, party and currency.');
      if (!Number.isSafeInteger(doc.settled) || doc.settled < 0 || doc.settled > totals.total) errors.push('Snapshot settled amount exceeds invoice total.');
      if (invoiceBalance(doc, documents).available < 0) errors.push('Invoice total is below existing settlements, planned allocations or adjustments.');
    } else {
      const invoice = documents.find(d => d.id === doc.invoice);
      if (!invoice || !isInvoice(invoice) || invoice.kind !== (doc.kind === 'credit-note' ? 'sales-invoice' : 'purchase-invoice') || invoice.party !== doc.party || invoice.currency !== doc.currency) errors.push('Linked invoice must match note direction, party and currency.');
      else if (doc.date < invoice.date) errors.push('Adjustment date cannot precede its linked invoice.');
      if (!doc.memo.trim()) errors.push('An adjustment reason is required.');
    }
  }
  if (isPayment(doc)) {
    const amount = scaled(doc.amount);
    const bank = masters.banks.find(b => b.id === doc.bank);
    const account = masters.accounts.find(a => a.id === bank?.ledger);
    if (!bank || bank.currency !== doc.currency || !bank.reference.startsWith('FICTIONAL-') || !account || account.group || account.type !== 'Asset') errors.push('Select a fictional bank with matching currency and an asset ledger.');
    if (amount === null || amount <= 0) errors.push('Receipt/payment amount must be a positive whole-unit demo amount.');
    if (!doc.allocations.length) errors.push('At least one invoice allocation is required.');
    if (new Set(doc.allocations.map(a => a.invoice)).size !== doc.allocations.length) errors.push('An invoice may appear only once per entry.');
    let allocated = 0;
    for (const allocation of doc.allocations) {
      const invoice = documents.find(d => d.id === allocation.invoice);
      const value = scaled(allocation.amount);
      if (value === null || value <= 0) errors.push('Every allocation must be a positive whole-unit amount.');
      allocated += value ?? 0;
      if (!invoice || !isInvoice(invoice) || invoice.kind !== (doc.kind === 'receipt' ? 'sales-invoice' : 'purchase-invoice') || invoice.party !== doc.party || invoice.currency !== doc.currency) errors.push('Allocated invoice must match entry direction, party and currency.');
      else if (doc.date < invoice.date) errors.push('Entry date cannot precede an allocated invoice.');
    }
    if (!Number.isSafeInteger(allocated) || allocated !== amount) errors.push('Allocated total must equal the entry amount; unallocated advances are outside this preview.');
  }
  if (doc.kind === 'journal') {
    if (doc.lines.length < 2) errors.push('A journal requires at least two lines.');
    for (const line of doc.lines) {
      const account = masters.accounts.find(a => a.id === line.account);
      const debit = scaled(line.debit), credit = scaled(line.credit);
      if (!account || account.group) errors.push('Every journal line needs a non-group ledger.');
      if (!line.description.trim()) errors.push('Every journal line needs a description.');
      if (debit === null || credit === null || (debit > 0) === (credit > 0)) errors.push('Each journal line must have exactly one positive debit or credit.');
    }
    const totals = journalTotals(doc);
    if (!Number.isSafeInteger(totals.debit) || totals.debit <= 0 || totals.debit > MAX_DEMO_AMOUNT || totals.debit !== totals.credit) errors.push('Journal debit and credit totals must be equal, positive and within demo bounds.');
  }
  return [...new Set(errors)];
}
export function createTransactionService() {
  let snapshot: TransactionSnapshot = createTransactionFixtures();
  let sequence = snapshot.history.length;
  return {
    read: () => copy(snapshot),
    save(input: FinanceDocument, masters: Masters): { errors: string[]; id?: string } {
      const value = copy(input);
      const previous = snapshot.documents.find(d => d.id === value.id);
      if (value.id && !previous) return { errors: ['Cannot edit an unknown document.'] };
      if (previous && (previous.state !== 'Draft' || previous.kind !== value.kind)) return { errors: ['Reference snapshots are read-only and document direction cannot change.'] };
      if (value.state !== 'Draft') return { errors: ['Only local drafts may be saved.'] };
      if (isInvoice(value) && value.settled !== 0) return { errors: ['A local invoice draft cannot claim a real settlement.'] };
      if (!value.id) value.id = `DEMO-TX-${sequence + 1}`;
      const documents = previous ? snapshot.documents.map(d => d.id === value.id ? value : d) : [...snapshot.documents, value];
      // Revalidate the whole candidate graph atomically: editing a parent invoice
      // cannot invalidate existing note references or planned allocations.
      const errors = documents.flatMap(d => validateDocument(d, documents, masters).map(e => `${d.reference || 'Draft'}: ${e}`));
      for (const invoice of documents.filter(isInvoice)) {
        if (invoiceBalance(invoice, documents).available < 0) errors.push(`${invoice.reference}: Planned allocations and adjustments exceed available outstanding.`);
      }
      if (errors.length) return { errors: [...new Set(errors)] };
      snapshot = { documents, history: [...snapshot.history, { document: value.id, sequence: ++sequence, reference: value.reference, action: previous ? 'Local draft edited; no posting' : 'Local draft created; no posting' }] };
      return { errors: [], id: value.id };
    },
  };
}
