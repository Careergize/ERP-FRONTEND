import { createReportDataset, REPORT_START, REPORT_AS_OF } from './reportData';
import { ledgerRows } from './reportMath';
export const administrationPages = { reconciliation: 'Bank Reconciliation', 'opening-balances': 'Opening Balances', administration: 'Finance Administration' } as const;
export type AdministrationPage = keyof typeof administrationPages;
export const statementPeriod = { start: '2026-11-01', end: REPORT_AS_OF };
export const demoCompanies = [{ id: 'DEMO-COMPANY', name: 'Sample Packaging Co.' }, { id: 'DEMO-SANDBOX', name: 'Fictional Review Sandbox' }] as const;
export const demoYears = ['2026', '2027'] as const;
export type DemoRole = 'Maker' | 'Checker' | 'CA Reviewer' | 'Viewer';
export const adminUsers: { id: string; name: string; role: DemoRole; companies: string[] }[] = [
 { id: 'DEMO-MAKER', name: 'Sample finance preparer', role: 'Maker', companies: ['DEMO-COMPANY', 'DEMO-SANDBOX'] },
 { id: 'DEMO-CHECKER', name: 'Sample independent checker', role: 'Checker', companies: ['DEMO-COMPANY', 'DEMO-SANDBOX'] },
 { id: 'DEMO-CA', name: 'Sample CA reviewer', role: 'CA Reviewer', companies: ['DEMO-COMPANY'] },
 { id: 'DEMO-VIEWER', name: 'Sample read-only reviewer', role: 'Viewer', companies: ['DEMO-COMPANY'] },
];
export const demoPermissionRows = [
 { action: 'View demonstration screens', roles: ['Maker','Checker','CA Reviewer','Viewer'] },
 { action: 'Prepare opening scenario', roles: ['Maker'] },
 { action: 'Independent local review / correction', roles: ['Checker','CA Reviewer'] },
 { action: 'Configure local CA checklist', roles: ['CA Reviewer'] },
 { action: 'Real posting / permissions / activation', roles: [] },
];
export interface ReconciliationBank { id: string; name: string; ledgerAccount: string; currency: 'UGX'; statementOpening: number }
export interface BankRow { id: string; bank: string; reference: string; date: string; amount: number; description: string }
export interface BankMatch { statement: string; ledger: string }
export interface OpeningLine { account: string; debit: string; credit: string }
export interface PartyOpening { party: string; kind: 'Customer' | 'Supplier'; amount: string }
export interface OpeningDraft { key: string; company: string; year: string; maker: string; lines: OpeningLine[]; parties: PartyOpening[]; stage: 'Draft' | 'Awaiting demo review' | 'Correction requested'; reviewer: string; reason: string; revision: number }
export const caChecklist = ['Account classifications reviewed', 'Tax illustrations reviewed', 'Opening scenario reviewed', 'Reconciliation exceptions reviewed'] as const;
export interface CAConfiguration { reviewer: string; notes: string; checks: boolean[] }
export interface AdministrationEvent { sequence: number; subject: string; action: string }
export interface AdministrationSnapshot { matches: BankMatch[]; openings: Record<string, OpeningDraft>; ca: CAConfiguration; events: AdministrationEvent[] }
export function createAdministrationData() {
 const reports = createReportDataset();
 const bankOpening = ledgerRows(reports, statementPeriod, 'bank', 'All').opening;
 const banks: ReconciliationBank[] = [
  { id: 'DEMO-BANK-REPORT', name: 'Fictional Example Bank · report ledger', ledgerAccount: 'bank', currency: 'UGX', statementOpening: bankOpening },
  { id: 'DEMO-BANK-UNMAPPED', name: 'Fictional unmapped bank · empty example', ledgerAccount: '', currency: 'UGX', statementOpening: 0 },
 ];
 const statement: BankRow[] = [
  { id: 'DEMO-STMT-RECEIPT', bank: banks[0].id, reference: 'FICTIONAL-STMT-01', date: '2026-11-03', amount: 2000, description: 'Fictional customer receipt' },
  { id: 'DEMO-STMT-PAYMENT', bank: banks[0].id, reference: 'FICTIONAL-STMT-02', date: '2026-11-03', amount: -1000, description: 'Fictional supplier payment' },
  { id: 'DEMO-STMT-CHARGE', bank: banks[0].id, reference: 'FICTIONAL-STMT-03', date: '2026-11-05', amount: -100, description: 'Fictional statement-only charge exception' },
 ];
 const ledger: BankRow[] = ledgerRows(reports, statementPeriod, 'bank', 'All').rows.map(row => ({ id: row.id, bank: banks[0].id, reference: row.doc.reference, date: row.doc.date, amount: row.debit - row.credit, description: row.doc.description }));
 return { reports, banks, statement, ledger };
}
export function openingKey(company: string, year: string) { return `${company}-${year}`; }
export function newOpeningDraft(company = demoCompanies[0].id as string, year = '2026'): OpeningDraft {
 const data = createReportDataset();
 const source = company === demoCompanies[0].id && year === '2026' ? data.lines.filter(l => l.document === 'DEMO-R-OPEN') : [];
 return { key: openingKey(company,year), company, year, maker: 'DEMO-MAKER', stage: 'Draft', reviewer: '', reason: '', revision: 0,
  lines: source.length ? source.map(l => ({ account: l.account, debit: String(l.debit), credit: String(l.credit) })) : [{ account: 'bank', debit: '0', credit: '0' }, { account: 'capital', debit: '0', credit: '0' }],
  parties: [{ party: 'DEMO-P1', kind: 'Customer', amount: '0' }, { party: 'DEMO-P2', kind: 'Supplier', amount: '0' }],
 };
}
export const openingDate = (draft: OpeningDraft) => draft.year === '2026' ? REPORT_START : `${draft.year}-01-01`;
