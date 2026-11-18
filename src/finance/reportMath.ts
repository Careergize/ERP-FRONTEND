import { amountTotals } from './transactionMath';
import { REPORT_AS_OF, REPORT_START, type ReportAccount, type ReportDataset, type ReportDocument } from './reportData';
export interface ReportRange { start: string; end: string }
const day = (value: string) => Date.parse(`${value}T00:00:00Z`);
export function validDate(value: string) { const time = day(value); return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value; }
export function validateRange(range: ReportRange) { return validDate(range.start) && validDate(range.end) && range.start >= REPORT_START && range.end <= REPORT_AS_OF && range.start <= range.end; }
export function previousRange(range: ReportRange): ReportRange | null {
  const length = day(range.end) - day(range.start) + 86400000;
  const previous = { start: new Date(day(range.start) - length).toISOString().slice(0, 10), end: new Date(day(range.start) - 86400000).toISOString().slice(0, 10) };
  return validateRange(previous) ? previous : null;
}
export function accountRows(data: ReportDataset, range: ReportRange) {
  const docs = new Map(data.documents.map(d => [d.id, d]));
  const leaves = data.accounts.filter(a => !a.group).map(account => {
    let opening = 0, debit = 0, credit = 0;
    for (const line of data.lines.filter(l => l.account === account.id)) {
      const document = docs.get(line.document)!;
      if (document.date > range.end) continue;
      if (document.kind === 'opening' || document.date < range.start) opening += line.debit - line.credit;
      else { debit += line.debit; credit += line.credit; }
    }
    const closing = opening + debit - credit;
    return { ...account, opening, debit, credit, closing, closingDebit: Math.max(closing, 0), closingCredit: Math.max(-closing, 0) };
  });
  const contains = (account: ReportAccount, leaf: ReportAccount): boolean => { let next = leaf.parent; while (next) { if (next === account.id) return true; next = data.accounts.find(a => a.id === next)?.parent || ''; } return false; };
  return data.accounts.map(account => {
    const included = leaves.filter(a => a.id === account.id || contains(account, a));
    const sum = (key: 'opening' | 'debit' | 'credit' | 'closing' | 'closingDebit' | 'closingCredit') => included.reduce((total, a) => total + a[key], 0);
    return { ...account, opening: sum('opening'), debit: sum('debit'), credit: sum('credit'), closing: sum('closing'), closingDebit: sum('closingDebit'), closingCredit: sum('closingCredit') };
  });
}
export function accountDepth(data: ReportDataset, account: ReportAccount) { let depth = 0, parent = account.parent; while (parent) { depth++; parent = data.accounts.find(a => a.id === parent)?.parent || ''; } return depth; }
export function trialTotals(data: ReportDataset, range: ReportRange) {
  const rows = accountRows(data, range).filter(a => !a.group);
  return { opening: rows.reduce((s, a) => s + a.opening, 0), debit: rows.reduce((s, a) => s + a.debit, 0), credit: rows.reduce((s, a) => s + a.credit, 0), closingDebit: rows.reduce((s, a) => s + a.closingDebit, 0), closingCredit: rows.reduce((s, a) => s + a.closingCredit, 0) };
}
export function profitLoss(data: ReportDataset, range: ReportRange) {
  const rows = accountRows(data, range).filter(a => !a.group);
  const sum = (category: string) => rows.filter(a => a.category === category).reduce((s, a) => s + a.debit - a.credit, 0);
  const revenue = -sum('Revenue') || 0, cost = sum('Cost of sales'), expense = sum('Operating expenses');
  return { revenue, cost, expense, gross: revenue - cost, net: revenue - cost - expense };
}
export function balanceSheet(data: ReportDataset, end: string) {
  const rows = accountRows(data, { start: REPORT_START, end }).filter(a => !a.group);
  const sum = (category: string) => rows.filter(a => a.category === category).reduce((s, a) => s + a.closing, 0);
  const assets = sum('Assets'), liabilities = -sum('Liabilities') || 0, capital = -sum('Equity') || 0;
  const earnings = profitLoss(data, { start: REPORT_START, end }).net;
  return { assets, liabilities, capital, earnings, equity: capital + earnings, difference: assets - liabilities - capital - earnings };
}
export function ledgerRows(data: ReportDataset, range: ReportRange, account: string, kind: string) {
  const accountRow = accountRows(data, range).find(a => a.id === account)!;
  let balance = accountRow.opening;
  const rows = data.lines.filter(l => l.account === account).map(line => ({ ...line, doc: data.documents.find(d => d.id === line.document)! })).filter(l => l.doc.kind !== 'opening' && l.doc.date >= range.start && l.doc.date <= range.end).sort((a, b) => a.doc.date.localeCompare(b.doc.date) || a.doc.id.localeCompare(b.doc.id) || a.id.localeCompare(b.id)).map(line => { balance += line.debit - line.credit; return { ...line, balance }; });
  return { opening: accountRow.opening, closing: accountRow.closing, rows: rows.filter(l => kind === 'All' || l.doc.kind === kind), debit: accountRow.debit, credit: accountRow.credit };
}
export const agingBuckets = ['Current', '1–30', '31–60', '61–90', '90+'] as const;
export function agingBucket(due: string, asOf: string) { const days = Math.floor((day(asOf) - day(due)) / 86400000); return days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4; }
export function agingRows(data: ReportDataset, asOf: string, side: 'receivables' | 'payables') {
  return data.documents.filter(d => d.invoice && d.date <= asOf && d.kind === (side === 'receivables' ? 'sales-invoice' : 'purchase-invoice')).map(document => {
    const account = side === 'receivables' ? 'ar' : 'ap';
    const gross = data.lines.filter(l => l.document === document.id && l.account === account).reduce((s, l) => s + l.debit + l.credit, 0);
    const settled = data.documents.filter(d => d.settlement?.invoice === document.id && d.date <= asOf).reduce((s, d) => s + d.settlement!.amount, 0);
    const outstanding = gross - settled, bucket = agingBucket(document.due!, asOf);
    return { document, gross, settled, outstanding, bucket, days: Math.max(0, Math.floor((day(asOf) - day(document.due!)) / 86400000)) };
  });
}
export function validateReportDataset(data: ReportDataset): string[] {
  const errors: string[] = [];
  if (!data.accounts.some(a => a.id === 'ar' && !a.group && a.category === 'Assets') || !data.accounts.some(a => a.id === 'ap' && !a.group && a.category === 'Liabilities')) errors.push('Required receivable/payable control accounts are missing.');
  if (new Set(data.documents.map(d => d.id)).size !== data.documents.length || new Set(data.documents.map(d => d.reference)).size !== data.documents.length || new Set(data.lines.map(l => l.id)).size !== data.lines.length || new Set(data.accounts.map(a => a.id)).size !== data.accounts.length) errors.push('Duplicate dataset identities.');
  for (const account of data.accounts) {
    const seen = new Set([account.id]); let parent = account.parent;
    while (parent) { const next = data.accounts.find(a => a.id === parent); if (!next || !next.group || next.category !== account.category || seen.has(parent)) { errors.push('Invalid account hierarchy.'); break; } seen.add(parent); parent = next.parent; }
  }
  for (const line of data.lines) if (!data.documents.some(d => d.id === line.document) || !data.accounts.some(a => a.id === line.account && !a.group) || !Number.isSafeInteger(line.debit) || !Number.isSafeInteger(line.credit) || line.debit < 0 || line.credit < 0 || (line.debit > 0) === (line.credit > 0)) errors.push('Invalid ledger line.');
  for (const document of data.documents) {
    const lines = data.lines.filter(l => l.document === document.id);
    if (!validDate(document.date) || document.date < REPORT_START || document.date > REPORT_AS_OF || !lines.length || lines.reduce((s, l) => s + l.debit - l.credit, 0) !== 0) errors.push(`Unbalanced or invalid document ${document.reference}.`);
    if (document.kind === 'opening' && document.date !== REPORT_START) errors.push('Opening entry must use the explicit dataset opening date.');
    if (document.invoice && amountTotals(document.invoice.lines).tax !== 0) errors.push('Report fixtures support zero illustrative tax only.');
    if (document.invoice && (document.invoice.id !== document.id || document.invoice.reference !== document.reference || document.invoice.date !== document.date || document.invoice.kind !== document.kind || amountTotals(document.invoice.lines).total !== lines.filter(l => l.account === (document.kind === 'sales-invoice' ? 'ar' : 'ap')).reduce((s, l) => s + l.debit + l.credit, 0))) errors.push('Invoice and ledger values/references differ.');
    if (document.settlement) { const invoice = data.documents.find(d => d.id === document.settlement!.invoice); const receipt = document.kind === 'receipt'; if (!invoice?.invoice || invoice.kind !== (receipt ? 'sales-invoice' : 'purchase-invoice') || invoice.party !== document.party || document.date < invoice.date || document.settlement.amount <= 0 || lines.filter(l => l.account === (receipt ? 'ar' : 'ap')).reduce((s, l) => s + l.debit + l.credit, 0) !== document.settlement.amount) errors.push('Settlement reference or amount differs from ledger.'); }
    if (document.invoice && (!document.due || !validDate(document.due) || document.due < document.date || !document.party)) errors.push('Invalid invoice aging metadata.');
  }
  for (const document of data.documents.filter(d => d.invoice)) { const settled = data.documents.filter(d => d.settlement?.invoice === document.id).reduce((s, d) => s + d.settlement!.amount, 0); if (settled !== document.invoice!.settled || settled > amountTotals(document.invoice!.lines).total || document.invoice!.currency !== 'UGX') errors.push('Invoice snapshot settlement/currency reconciliation failed.'); }
  if (errors.length) return [...new Set(errors)];
  const totals = trialTotals(data, { start: REPORT_START, end: REPORT_AS_OF });
  if (totals.opening !== 0 || totals.debit !== totals.credit || totals.closingDebit !== totals.closingCredit || balanceSheet(data, REPORT_AS_OF).difference !== 0) errors.push('Financial statement reconciliation failed.');
  for (const side of ['receivables', 'payables'] as const) {
    const outstanding = agingRows(data, REPORT_AS_OF, side).reduce((s, row) => s + row.outstanding, 0);
    const control = accountRows(data, { start: REPORT_START, end: REPORT_AS_OF }).find(a => a.id === (side === 'receivables' ? 'ar' : 'ap'))!.closing;
    if (outstanding !== (side === 'receivables' ? control : -control)) errors.push('Aging does not reconcile to control ledger.');
  }
  return [...new Set(errors)];
}
export function documentLines(data: ReportDataset, document: ReportDocument) { return data.lines.filter(l => l.document === document.id); }
