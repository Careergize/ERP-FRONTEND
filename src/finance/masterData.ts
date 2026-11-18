import { createReportDataset, REPORT_AS_OF } from './reportData';
import { agingRows } from './reportMath';
export type MasterKind = 'accounts' | 'taxes' | 'parties' | 'banks';
export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
export type MasterRecord = { id: string; name: string; code: string; type: string; parent: string; group: boolean; currency: string; ledger: string; rate: string; days: string; balance: string; reference: string; template: string };
export type SetupDraft = { company: string; country: string; currency: string; start: string; end: string; ca: string };
export const masterTitles: Record<MasterKind, string> = { accounts: 'Chart of Accounts', taxes: 'Tax Configuration', parties: 'Customer and Supplier Accounting', banks: 'Banking Masters' };
export const accountTypes: AccountType[] = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];
export const blankMaster = (): MasterRecord => ({ id: '', name: '', code: '', type: 'Asset', parent: '', group: false, currency: 'UGX', ledger: '', rate: '0', days: '30', balance: '0', reference: '', template: '' });
const row = (id: string, name: string, values: Partial<MasterRecord>): MasterRecord => ({ ...blankMaster(), id: `DEMO-${id}`, name, ...values });
export const createMasters = (): Record<MasterKind, MasterRecord[]> => {
 const report = createReportDataset();
 const balance = (side: 'receivables'|'payables') => String(agingRows(report,REPORT_AS_OF,side).reduce((sum,row)=>sum+row.outstanding,0));
 return ({
 accounts: [row('A1', 'Assets', { code: '1000', group: true }), row('A2', 'Sample receivables', { code: '1100', parent: 'DEMO-A1' }), row('A3', 'Sample bank ledger', { code: '1200', parent: 'DEMO-A1' }), row('A4', 'Liabilities', { code: '2000', type: 'Liability', group: true }), row('A5', 'Sample payables', { code: '2100', type: 'Liability', parent: 'DEMO-A4' }), row('A6', 'Sample tax liability', { code: '2200', type: 'Liability', parent: 'DEMO-A4' })],
 taxes: [row('T1', 'Illustrative standard tax', { type: 'Rate', rate: '10', ledger: 'DEMO-A6', template: 'Sample domestic template' }), row('T2', 'Illustrative zero tax', { type: 'Template', rate: '0', ledger: 'DEMO-A6', template: 'Sample zero template' })],
 parties: [row('P1', 'Sample customer Alpha', { type: 'Customer', ledger: 'DEMO-A2', balance: balance('receivables'), reference: 'Sample net terms' }), row('P2', 'Sample supplier Beta', { type: 'Supplier', ledger: 'DEMO-A5', days: '14', balance: balance('payables'), reference: 'Sample fortnight terms' })],
 banks: [row('B1', 'Fictional Example Bank', { type: 'Operating', ledger: 'DEMO-A3', reference: 'FICTIONAL-0001' })]
});
};
export const createSetup = (): SetupDraft => ({ company: 'Sample Packaging Co.', country: 'Illustrative jurisdiction', currency: 'UGX', start: '2026-01-01', end: '2026-12-31', ca: '' });
export function validateSetup(value: SetupDraft): string[] {
 const errors: string[] = [];
 if (!value.company.trim() || !value.country.trim()) errors.push('Company and jurisdiction are required.');
 if (!/^[A-Z]{3}$/.test(value.currency)) errors.push('Currency must be three uppercase letters.');
 if (!value.start || !value.end || value.start >= value.end) errors.push('Fiscal year end must follow its start.');
 return errors;
}
export function validateMaster(kind: MasterKind, value: MasterRecord, data: Record<MasterKind, MasterRecord[]>): string[] {
 const errors: string[] = [];
 if (!value.name.trim()) errors.push('Name is required.');
 if (kind === 'accounts') {
  if (!value.code.trim()) errors.push('Account code is required.');
  if (data.accounts.some(a => a.id !== value.id && a.code.toLowerCase() === value.code.trim().toLowerCase())) errors.push('Account code must be unique.');
  const parent = data.accounts.find(a => a.id === value.parent);
  if (value.parent && (!parent || !parent.group || parent.type !== value.type)) errors.push('Parent must be a group with the same account type.');
  const seen = new Set([value.id]); let next = parent;
  while (next) { if (seen.has(next.id)) { errors.push('Parent cannot be this account or a descendant.'); break; } seen.add(next.id); next = data.accounts.find(a => a.id === next?.parent); }
  const children = data.accounts.filter(a => !!value.id && a.parent === value.id);
  if (children.length && (!value.group || children.some(a => a.type !== value.type))) errors.push('Keep a compatible group for existing children.');
  if (value.group && [...data.taxes, ...data.parties, ...data.banks].some(a => a.ledger === value.id)) errors.push('A mapped ledger cannot become a group.');
  const references = [...data.taxes, ...data.parties, ...data.banks].filter(a => a.ledger === value.id);
  if (references.some(a => (data.taxes.includes(a) || a.type === 'Supplier') ? value.type !== 'Liability' : value.type !== 'Asset')) errors.push('Account type conflicts with an existing mapping.');
 } else {
  const ledger = data.accounts.find(a => a.id === value.ledger);
  const requiredType = kind === 'taxes' || (kind === 'parties' && value.type === 'Supplier') ? 'Liability' : 'Asset';
  if (!ledger || ledger.group || ledger.type !== requiredType) errors.push(`Select a non-group ${requiredType} ledger.`);
 }
 if ((kind === 'banks' || kind === 'parties') && !/^[A-Z]{3}$/.test(value.currency)) errors.push('Currency must be three uppercase letters.');
 if (kind === 'taxes' && (!value.rate.trim() || !Number.isFinite(Number(value.rate)) || Number(value.rate) < 0 || Number(value.rate) > 100)) errors.push('Tax rate must be between 0 and 100.');
 if (kind === 'taxes' && !value.template.trim()) errors.push('A template name is required.');
 if (kind === 'parties' && (!/^\d+$/.test(value.days) || Number(value.days) > 365)) errors.push('Credit days must be a whole number from 0 to 365.');
 if (kind === 'banks' && !/^FICTIONAL-[A-Z0-9-]+$/.test(value.reference)) errors.push('Use a fictional reference beginning FICTIONAL-.');
 return errors;
}
