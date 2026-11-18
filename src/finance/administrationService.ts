import { scaled, MAX_DEMO_AMOUNT } from './transactionMath';
import { ledgerRows, validDate } from './reportMath';
import { adminUsers, caChecklist, createAdministrationData, demoCompanies, demoYears, newOpeningDraft, openingKey, statementPeriod, type AdministrationSnapshot, type BankMatch, type CAConfiguration, type OpeningDraft } from './administrationData';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
export function openingTotals(draft: OpeningDraft) {
 const debit = draft.lines.reduce((s,l) => s + (scaled(l.debit) ?? 0),0), credit = draft.lines.reduce((s,l) => s + (scaled(l.credit) ?? 0),0);
 const customer = draft.parties.filter(p => p.kind === 'Customer').reduce((s,p) => s + (scaled(p.amount) ?? 0),0), supplier = draft.parties.filter(p => p.kind === 'Supplier').reduce((s,p) => s + (scaled(p.amount) ?? 0),0);
 return { debit, credit, difference: debit - credit, customer, supplier };
}
export function validateOpening(draft: OpeningDraft): string[] {
 const data = createAdministrationData(); const errors: string[] = [];
 if (!demoCompanies.some(c => c.id === draft.company) || !demoYears.some(y => y === draft.year) || draft.key !== openingKey(draft.company,draft.year)) errors.push('Select a supported fictional company and fiscal year.');
 const maker = adminUsers.find(u => u.id === draft.maker);
 if (!maker || maker.role !== 'Maker' || !maker.companies.includes(draft.company)) errors.push('A demo maker with company access is required.');
 if (!draft.lines.length || new Set(draft.lines.map(l => l.account)).size !== draft.lines.length) errors.push('Use one row per account, with at least one account row.');
 for (const line of draft.lines) {
  const account = data.reports.accounts.find(a => a.id === line.account);
  const debit = scaled(line.debit), credit = scaled(line.credit);
  if (!account || account.group || !['Assets','Liabilities','Equity'].includes(account.category)) errors.push('Select a non-group balance-sheet account for every row.');
  if (debit === null || credit === null || (debit > 0 && credit > 0)) errors.push('Use whole-unit nonnegative debit or credit values, never both on one row.');
  if (line.account === 'ar' && credit !== 0 || line.account === 'ap' && debit !== 0) errors.push('This scenario supports customer debit and supplier credit opening balances only.');
 }
 if (new Set(draft.parties.map(p => p.party)).size !== draft.parties.length || draft.parties.some(p => p.party !== (p.kind === 'Customer' ? 'DEMO-P1' : 'DEMO-P2') || scaled(p.amount) === null)) errors.push('Use the fictional customer/supplier once each with whole-unit nonnegative balances.');
 const totals = openingTotals(draft);
 if (!Number.isSafeInteger(totals.debit) || !Number.isSafeInteger(totals.credit) || totals.debit <= 0 || totals.debit > MAX_DEMO_AMOUNT || totals.credit > MAX_DEMO_AMOUNT || totals.debit !== totals.credit) errors.push('Opening debit and credit totals must balance, be positive and remain within demo limits.');
 const ar = draft.lines.filter(l => l.account === 'ar').reduce((s,l) => s + (scaled(l.debit) ?? 0),0), ap = draft.lines.filter(l => l.account === 'ap').reduce((s,l) => s + (scaled(l.credit) ?? 0),0);
 if (ar !== totals.customer || ap !== totals.supplier) errors.push('Customer/supplier totals must reconcile exactly to the receivable/payable control rows.');
 return [...new Set(errors)];
}
export function reviewErrors(draft: OpeningDraft, reviewer: string): string[] {
 const user = adminUsers.find(u => u.id === reviewer);
 if (reviewer === draft.maker) return ['Independent review required: maker cannot review their own draft.'];
 if (!user || !['Checker','CA Reviewer'].includes(user.role) || !user.companies.includes(draft.company)) return ['Choose an eligible independent demo reviewer with company access.'];
 return [];
}
export function reconciliationSummary(bankId: string, matches: BankMatch[]) {
 const data = createAdministrationData(), bank = data.banks.find(b => b.id === bankId)!;
 const statement = data.statement.filter(r => r.bank === bankId), ledger = data.ledger.filter(r => r.bank === bankId);
 const pairs = matches.filter(m => statement.some(s => s.id === m.statement) && ledger.some(l => l.id === m.ledger));
 const unmatchedStatement = statement.filter(r => !pairs.some(m => m.statement === r.id)), unmatchedLedger = ledger.filter(r => !pairs.some(m => m.ledger === r.id));
 const sum = (rows: typeof statement) => rows.reduce((s,r) => s + r.amount,0);
 const opening = bank.statementOpening, statementClosing = opening + sum(statement), ledgerOpening = bank.ledgerAccount ? ledgerRows(data.reports, statementPeriod, bank.ledgerAccount, 'All').opening : 0, ledgerClosing = ledgerOpening + sum(ledger);
 const difference = statementClosing - ledgerClosing;
 return { opening, statementClosing, ledgerOpening, ledgerClosing, difference, matchedCount: pairs.length, matchedNet: sum(statement.filter(r => pairs.some(m => m.statement === r.id))), matchedGross: statement.filter(r => pairs.some(m => m.statement === r.id)).reduce((s,r) => s + Math.abs(r.amount),0), unmatchedStatement, unmatchedLedger, statementUnmatchedNet: sum(unmatchedStatement), ledgerUnmatchedNet: sum(unmatchedLedger), explainedDifference: difference - sum(unmatchedStatement) + sum(unmatchedLedger), complete: !!bank.ledgerAccount && !unmatchedStatement.length && !unmatchedLedger.length && difference === 0 };
}
export function suggestedMatches(matches: BankMatch[], bank: string) {
 const data = createAdministrationData();
 return data.statement.filter(s => s.bank === bank && !matches.some(m => m.statement === s.id)).flatMap(s => data.ledger.filter(l => l.bank === bank && !matches.some(m => m.ledger === l.id) && l.amount === s.amount && Math.abs(Date.parse(l.date)-Date.parse(s.date)) <= 3*86400000).map(l => ({ statement: s.id, ledger: l.id })));
}
export function createAdministrationService() {
 const data = createAdministrationData(); const initial = newOpeningDraft();
 let state: AdministrationSnapshot = { matches: [], openings: { [initial.key]: initial }, ca: { reviewer: 'DEMO-CA', notes: '', checks: caChecklist.map(() => false) }, events: [{ sequence: 1, subject: 'DEMO-ADMIN-PREVIEW', action: 'Fictional local preview initialized; no permissions or records changed.' }] };
 const event = (subject: string, action: string) => { state.events.push({ sequence: state.events.length+1, subject, action }); };
 return {
  read: () => clone(state),
  match(statement: string, ledger: string): string[] {
   const s = data.statement.find(r => r.id === statement), l = data.ledger.find(r => r.id === ledger);
   if (!s || !l || s.bank !== l.bank || s.amount !== l.amount || Math.abs(Date.parse(s.date)-Date.parse(l.date)) > 3*86400000) return ['Select same-bank rows with equal signed amounts and dates within the illustrative three-day window.'];
   if (state.matches.some(m => m.statement === statement || m.ledger === ledger)) return ['Each statement and ledger row can belong to only one local match.'];
   state.matches.push({ statement, ledger }); event(s.reference, `Local match to ${l.reference}; ledger unchanged.`); return [];
  },
  unmatch(statement: string): string[] {
   if (!state.matches.some(m => m.statement === statement)) return ['Local match not found.'];
   state.matches = state.matches.filter(m => m.statement !== statement); event(statement,'Local match removed; ledger unchanged.'); return [];
  },
  saveOpening(input: OpeningDraft): string[] {
   const value = clone(input), previous = state.openings[value.key];
   if (previous?.stage === 'Awaiting demo review') return ['Request a local correction before editing a draft under independent review.'];
   if (previous && value.revision !== previous.revision) return ['Draft changed since this editor opened. Reload the saved draft.'];
   const errors = validateOpening(value); if (errors.length) return errors;
   value.stage = 'Draft'; value.reviewer = ''; value.reason = ''; value.revision = (previous?.revision ?? 0)+1;
   state.openings[value.key] = value; event(value.key,`Opening scenario revision ${value.revision} saved locally; no journal created.`); return [];
  },
  prepareReview(key: string, reviewer: string): string[] {
   const draft = state.openings[key]; if (!draft || draft.revision === 0 || draft.stage !== 'Draft') return ['Save a balanced draft before preparing an independent review.'];
   const errors = [...validateOpening(draft), ...reviewErrors(draft,reviewer)]; if (errors.length) return errors;
   draft.stage = 'Awaiting demo review'; draft.reviewer = reviewer; event(key,`Independent review presentation assigned to ${reviewer}; no request sent or approval granted.`); return [];
  },
  requestCorrection(key: string, actor: string, reason: string): string[] {
   const draft = state.openings[key]; if (!draft || draft.stage !== 'Awaiting demo review') return ['Only a saved draft awaiting demo review can receive a correction request.'];
   const errors = reviewErrors(draft,actor); if (actor !== draft.reviewer) errors.push('Only the assigned independent demo reviewer may request correction.'); if (!reason.trim()) errors.push('A correction reason is required.'); if (errors.length) return errors;
   draft.stage = 'Correction requested'; draft.reason = reason.trim(); event(key,`Local correction requested by ${actor}: ${reason.trim()}`); return [];
  },
  saveCA(value: CAConfiguration): string[] {
   if (!adminUsers.some(u => u.id === value.reviewer && u.role === 'CA Reviewer') || value.checks.length !== caChecklist.length || value.checks.some(c => typeof c !== 'boolean')) return ['Choose the fictional CA reviewer and complete valid checklist fields.'];
   state.ca = clone(value); event('DEMO-CA-CONFIG','Local CA configuration/checklist updated; approval and activation remain blocked.'); return [];
  },
 };
}
export function validateBankFilters(start: string,end: string,min: string,max: string) { return validDate(start) && validDate(end) && start >= statementPeriod.start && end <= statementPeriod.end && start <= end && (min === '' || scaled(min) !== null) && (max === '' || scaled(max) !== null) && (min === '' || max === '' || Number(min) <= Number(max)); }
