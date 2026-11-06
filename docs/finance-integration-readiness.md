# Module-by-module Finance integration readiness

6 November 2026 · Planning specification only. All 22 Preview destinations are covered. No API implementation is authorized by this document.

Machine-readable counterpart: [readiness matrix](finance-readiness-matrix.json). Current source exposes only the Finance status gateway; every `/api/finance/v1/...` URL below is a proposed contract, not an available endpoint. Capability names are proposed, not deployed permissions.

All modules require existing Django authentication + FinanceEntitlement + company/action checks, native target permissions, decimal-string/precision contracts and correlation/idempotency. Any submit/post action needs a separately approved contract and independent review. The browser must never call Frappe directly or receive service credentials.

## Dashboard

- React: `src/pages/FinancePreview/DashboardPage.tsx` · `/finance/preview/dashboard`.
- Current boundary: `src/finance/FinanceDemoContext.tsx`, `src/finance/mockService.ts`, `src/finance/mockData.ts -> reportData/reportMath`.
- Reused components: Card, FinancePageHeader, FinanceKpiCard, FinanceChart, FinanceFilters, FinanceDataTable, FinanceStatusBadge, FinanceDetailDrawer, FinanceRestrictedAction, FinanceViewState.
- Readiness: Implemented demonstration; QA evidence in Batch 6; Not implemented; proposed contract only.
- Proposed reads: GET `/api/finance/v1/dashboard/?company&start&end&as_of`.
- Proposed writes: none; overview/report remains read-only.
- Native DocType candidates: `GL Entry`, `Sales Invoice`, `Purchase Invoice`, `Payment Entry`, `Journal Entry`.
- Permissions: Existing Django login + FinanceEntitlement + company/action authorization; finance.dashboard.read; Native target document/report permissions and company restrictions; server must enforce both layers.
- Operations: Read authoritative server DTOs; no write operation.
- Validation: One snapshot_id across KPIs/trend/cash/aging; same company, currency and dates; No drafts in posted totals; decimal strings and precision metadata.
- Dependencies: Approved report contract; Company access; Reconciled authoritative ledger.
- Audit: Record query scope/snapshot/correlation ID and denied reads; no financial mutation.
- Implementation stage: 3 (see roadmap gates).
- Current UI coverage: Period selector, search/status/pagination, chart table, keyboard drawer, global states.

## Accounting Setup; Company, Currency and Fiscal Year

- React: `src/pages/FinancePreview/FinancialMastersPage.tsx` · `/finance/preview/setup`.
- Current boundary: `src/finance/FinanceMastersContext.tsx`, `src/finance/masterData.ts`.
- Reused components: Card, FinancePageHeader, FinanceRestrictedAction.
- Readiness: Implemented demonstration; QA evidence in Batch 6; Not implemented; proposed contract only.
- Proposed reads: GET `/api/finance/v1/setup/?company`; GET `/api/finance/v1/companies/`; GET `/api/finance/v1/currencies/`; GET `/api/finance/v1/fiscal-years/?company`.
- Proposed writes: POST `/api/finance/v1/setup/drafts/`; POST `/api/finance/v1/setup/drafts/{id}/review-requests/`.
- Native DocType candidates: `Company`, `Currency`, `Fiscal Year`, `Accounts Settings`.
- Permissions: Existing Django login + FinanceEntitlement + company/action authorization; finance.setup.read / finance.setup.draft / separate independent review; Native target document/report permissions and company restrictions; server must enforce both layers.
- Operations: Read authoritative server DTOs; save/version/review draft commands only after separate write approval.
- Validation: Company identity stable; supported base currency/precision; nonoverlapping fiscal bounds and locked-period rules approved by CA; CA readiness is not entitlement; no activate side effect.
- Dependencies: Company ownership policy; Existing auth; CA-approved defaults.
- Audit: Before/after setup revision, company, maker/reviewer identities, policy version; never log credentials.
- Implementation stage: 1 (see roadmap gates).
- Current UI coverage: Combined company/jurisdiction/currency/year form, validation, checklist and disabled approval.

## Chart of Accounts

- React: `src/pages/FinancePreview/FinancialMastersPage.tsx` · `/finance/preview/accounts`.
- Current boundary: `src/finance/FinanceMastersContext.tsx`, `src/finance/masterData.ts`.
- Reused components: Card, FinancePageHeader, FinanceRestrictedAction, FinanceDetailDrawer.
- Readiness: Implemented demonstration; QA evidence in Batch 6; Not implemented; proposed contract only.
- Proposed reads: GET `/api/finance/v1/accounts/?company&parent&type&query`.
- Proposed writes: POST `/api/finance/v1/accounts/drafts/`; PATCH `/api/finance/v1/accounts/drafts/{id}/`.
- Native DocType candidates: `Account`.
- Permissions: Existing Django login + FinanceEntitlement + company/action authorization; finance.accounts.read / finance.accounts.manage; Native target document/report permissions and company restrictions; server must enforce both layers.
- Operations: Read authoritative server DTOs; save/version/review draft commands only after separate write approval.
- Validation: Unique company/code; no cycles; parent group and root/report/account types compatible; Do not reclassify mapped/used ledgers or delete posted references without approved migration.
- Dependencies: Company; CA account classification; Stable native IDs.
- Audit: Hierarchy/version changes, dependencies, requested vs effective classifications and reviewer.
- Implementation stage: 1 (see roadmap gates).
- Current UI coverage: Hierarchy, search/type/groups, add/edit validation and drawer.

## Taxes and Templates

- React: `src/pages/FinancePreview/FinancialMastersPage.tsx` · `/finance/preview/taxes`.
- Current boundary: `src/finance/FinanceMastersContext.tsx`, `src/finance/masterData.ts`.
- Reused components: Card, FinancePageHeader, FinanceRestrictedAction, FinanceDetailDrawer.
- Readiness: Implemented demonstration; QA evidence in Batch 6; Not implemented; proposed contract only.
- Proposed reads: GET `/api/finance/v1/taxes/?company&side&effective_date`.
- Proposed writes: POST `/api/finance/v1/taxes/drafts/`; PATCH `/api/finance/v1/taxes/drafts/{id}/`.
- Native DocType candidates: `Sales Taxes and Charges Template`, `Purchase Taxes and Charges Template`, `Item Tax Template`, `Tax Category`, `Tax Rule`, `Account`.
- Permissions: Existing Django login + FinanceEntitlement + company/action authorization; finance.taxes.read / finance.taxes.manage + CA review; Native target document/report permissions and company restrictions; server must enforce both layers.
- Operations: Read authoritative server DTOs; save/version/review draft commands only after separate write approval.
- Validation: Separate input/output, inclusive/exclusive, valuation/recoverability and compound ordering; Effective-dated approved rates and correct account types; never copy illustrative rates or liability-only demo mapping as policy.
- Dependencies: Company/accounts; CA jurisdiction and tax decisions; Target-version schema.
- Audit: Tax policy/rate/template revisions, approvals, test examples and affected date ranges.
- Implementation stage: 2 (see roadmap gates).
- Current UI coverage: Illustrative rates/templates/mappings, invalid-rate rejection; no approved tax policy.

## Customer and Supplier Accounting

- React: `src/pages/FinancePreview/FinancialMastersPage.tsx` · `/finance/preview/parties`.
- Current boundary: `src/finance/FinanceMastersContext.tsx`, `src/finance/masterData.ts`.
- Reused components: Card, FinancePageHeader, FinanceRestrictedAction, FinanceDetailDrawer.
- Readiness: Implemented demonstration; QA evidence in Batch 6; Not implemented; proposed contract only.
- Proposed reads: GET `/api/finance/v1/party-profiles/?company&type&query`; GET `/api/finance/v1/party-profiles/{id}/balances/?as_of`.
- Proposed writes: POST `/api/finance/v1/party-profiles/{id}/accounting-drafts/`.
- Native DocType candidates: `Customer`, `Supplier`, `Payment Terms Template`, `Account`.
- Permissions: Existing Django login + FinanceEntitlement + company/action authorization; finance.parties.read / finance.parties.accounting.manage; Native target document/report permissions and company restrictions; server must enforce both layers.
- Operations: Read authoritative server DTOs; save/version/review draft commands only after separate write approval.
- Validation: Reuse operational customer/supplier identity; company-specific control mapping and approved credit terms; Read posted subledger/control reconciliation; no separate recreated party master.
- Dependencies: Existing operational party IDs; Accounts/currency; Approved credit policy.
- Audit: Party mapping, terms revision, external-ID linkage and balance snapshot scope.
- Implementation stage: 2 (see roadmap gates).
- Current UI coverage: Profile search/type/details, terms and mapping drafts; immutable balance summaries and seeded balances aligned to report aging.

## Banking Masters

- React: `src/pages/FinancePreview/FinancialMastersPage.tsx` · `/finance/preview/banks`.
- Current boundary: `src/finance/FinanceMastersContext.tsx`, `src/finance/masterData.ts`.
- Reused components: Card, FinancePageHeader, FinanceRestrictedAction, FinanceDetailDrawer.
- Readiness: Implemented demonstration; QA evidence in Batch 6; Not implemented; proposed contract only.
- Proposed reads: GET `/api/finance/v1/banks/?company&currency`.
- Proposed writes: POST `/api/finance/v1/banks/drafts/`; PATCH `/api/finance/v1/banks/drafts/{id}/`.
- Native DocType candidates: `Bank`, `Bank Account`, `Account`, `Mode of Payment`.
- Permissions: Existing Django login + FinanceEntitlement + company/action authorization; finance.banks.read / finance.banks.manage; Native target document/report permissions and company restrictions; server must enforce both layers.
- Operations: Read authoritative server DTOs; save/version/review draft commands only after separate write approval.
- Validation: Company/currency/ledger consistency; mask bank identifiers; validate real details only in approved secure workflow; No bank synchronization or payment initiation from master save.
- Dependencies: Company/accounts; Privacy and access decisions.
- Audit: Masked identifiers, ledger mapping and maker/checker changes; no full bank secrets in logs.
- Implementation stage: 2 (see roadmap gates).
- Current UI coverage: Fictional reference-only bank add/edit/mapping/details.

## Sales Invoice Accounting

- React: `src/pages/FinancePreview/FinanceTransactionsPage.tsx` · `/finance/preview/sales-invoice`.
- Current boundary: `src/finance/FinanceTransactionsContext.tsx`, `src/finance/transactionService.ts`, `src/finance/transactionMath.ts`.
- Reused components: Card, FinancePageHeader, FinanceDataTable, FinanceDetailDrawer, FinanceDocumentReference, FinanceTransactionHistory, FinanceRestrictedAction.
- Readiness: Implemented demonstration; QA evidence in Batch 6; Not implemented; proposed contract only.
- Proposed reads: GET `/api/finance/v1/invoices/?company&side=sales&state&query`; GET `/api/finance/v1/invoices/{id}/`.
- Proposed writes: POST `/api/finance/v1/invoices/from-operational-source/`; POST `/api/finance/v1/invoices/{id}/draft-revisions/`.
- Native DocType candidates: `Sales Invoice`, `Sales Invoice Item`, `Account`.
- Permissions: Existing Django login + FinanceEntitlement + company/action authorization; finance.invoices.read / finance.invoices.draft + separately approved submit; Native target document/report permissions and company restrictions; server must enforce both layers.
- Operations: Read authoritative server DTOs; save/version/review draft commands only after separate write approval.
- Validation: Unique company/source/type/revision mapping and idempotency; approved totals/taxes/period/currency; Existing operational source owns sales/dispatch/purchase receipt; financial representation must not create stock movements or duplicate an existing Django posting.
- Dependencies: Party/accounts/taxes; Single posting-owner and cutover decision; Operational event/outbox and source revision mapping.
- Audit: Operational ID/revision/hash, target native ID, actor, validated totals, idempotency/correlation, retry/outcome; immutable original and amendments.
- Implementation stage: 5 (see roadmap gates).
- Current UI coverage: Search/state/detail, line editors and calculations; immutable source invoices and local drafts.

## Purchase Invoice Accounting

- React: `src/pages/FinancePreview/FinanceTransactionsPage.tsx` · `/finance/preview/purchase-invoice`.
- Current boundary: `src/finance/FinanceTransactionsContext.tsx`, `src/finance/transactionService.ts`, `src/finance/transactionMath.ts`.
- Reused components: Card, FinancePageHeader, FinanceDataTable, FinanceDetailDrawer, FinanceDocumentReference, FinanceTransactionHistory, FinanceRestrictedAction.
- Readiness: Implemented demonstration; QA evidence in Batch 6; Not implemented; proposed contract only.
- Proposed reads: GET `/api/finance/v1/invoices/?company&side=purchase&state&query`; GET `/api/finance/v1/invoices/{id}/`.
- Proposed writes: POST `/api/finance/v1/invoices/from-operational-source/`; POST `/api/finance/v1/invoices/{id}/draft-revisions/`.
- Native DocType candidates: `Purchase Invoice`, `Purchase Invoice Item`, `Account`.
- Permissions: Existing Django login + FinanceEntitlement + company/action authorization; finance.invoices.read / finance.invoices.draft + separately approved submit; Native target document/report permissions and company restrictions; server must enforce both layers.
- Operations: Read authoritative server DTOs; save/version/review draft commands only after separate write approval.
- Validation: Unique company/source/type/revision mapping and idempotency; approved totals/taxes/period/currency; Existing operational source owns sales/dispatch/purchase receipt; financial representation must not create stock movements or duplicate an existing Django posting.
- Dependencies: Party/accounts/taxes; Single posting-owner and cutover decision; Operational event/outbox and source revision mapping.
- Audit: Operational ID/revision/hash, target native ID, actor, validated totals, idempotency/correlation, retry/outcome; immutable original and amendments.
- Implementation stage: 5 (see roadmap gates).
- Current UI coverage: Search/state/detail, line editors and calculations; immutable source invoices and local drafts.

## Receipt Entry and Allocations

- React: `src/pages/FinancePreview/FinanceTransactionsPage.tsx` · `/finance/preview/receipt`.
- Current boundary: `src/finance/FinanceTransactionsContext.tsx`, `src/finance/transactionService.ts`, `src/finance/transactionMath.ts`.
- Reused components: Card, FinancePageHeader, FinanceDataTable, FinanceDetailDrawer, FinanceDocumentReference, FinanceTransactionHistory, FinanceRestrictedAction.
- Readiness: Implemented demonstration; QA evidence in Batch 6; Not implemented; proposed contract only.
- Proposed reads: GET `/api/finance/v1/payments/?company&type=receive`; GET `/api/finance/v1/payments/{id}/`; GET `/api/finance/v1/invoices/{id}/outstanding/`.
- Proposed writes: POST `/api/finance/v1/payments/drafts/`; POST `/api/finance/v1/payments/{id}/allocations/`.
- Native DocType candidates: `Payment Entry`, `Payment Entry Reference`, `Sales Invoice`.
- Permissions: Existing Django login + FinanceEntitlement + company/action authorization; finance.payments.read / finance.payments.draft / separate approval+submit; Native target document/report permissions and company restrictions; server must enforce both layers.
- Operations: Read authoritative server DTOs; save/version/review draft commands only after separate write approval.
- Validation: Server locks/revalidates outstanding at command time; party/company/currency match; no duplicate allocations; Precision, advances, FX and write-off policy explicit; no actual bank execution from this module.
- Dependencies: Submitted invoice identity; Bank/account masters; Payment/allocation native behavior approved.
- Audit: Per-invoice before/after allocation, actor/reviewer, native references, idempotency and conflict/retry outcome.
- Implementation stage: 6 (see roadmap gates).
- Current UI coverage: Split allocations, available balances, aggregate caps, exact sums, details and history.

## Payment Entry and Allocations

- React: `src/pages/FinancePreview/FinanceTransactionsPage.tsx` · `/finance/preview/payment`.
- Current boundary: `src/finance/FinanceTransactionsContext.tsx`, `src/finance/transactionService.ts`, `src/finance/transactionMath.ts`.
- Reused components: Card, FinancePageHeader, FinanceDataTable, FinanceDetailDrawer, FinanceDocumentReference, FinanceTransactionHistory, FinanceRestrictedAction.
- Readiness: Implemented demonstration; QA evidence in Batch 6; Not implemented; proposed contract only.
- Proposed reads: GET `/api/finance/v1/payments/?company&type=pay`; GET `/api/finance/v1/payments/{id}/`; GET `/api/finance/v1/invoices/{id}/outstanding/`.
- Proposed writes: POST `/api/finance/v1/payments/drafts/`; POST `/api/finance/v1/payments/{id}/allocations/`.
- Native DocType candidates: `Payment Entry`, `Payment Entry Reference`, `Purchase Invoice`.
- Permissions: Existing Django login + FinanceEntitlement + company/action authorization; finance.payments.read / finance.payments.draft / separate approval+submit; Native target document/report permissions and company restrictions; server must enforce both layers.
- Operations: Read authoritative server DTOs; save/version/review draft commands only after separate write approval.
- Validation: Server locks/revalidates outstanding at command time; party/company/currency match; no duplicate allocations; Precision, advances, FX and write-off policy explicit; no actual bank execution from this module.
- Dependencies: Submitted invoice identity; Bank/account masters; Payment/allocation native behavior approved.
- Audit: Per-invoice before/after allocation, actor/reviewer, native references, idempotency and conflict/retry outcome.
- Implementation stage: 6 (see roadmap gates).
- Current UI coverage: Split allocations, available balances, aggregate caps, exact sums, details and history.

## Journal Entry

- React: `src/pages/FinancePreview/FinanceTransactionsPage.tsx` · `/finance/preview/journal`.
- Current boundary: `src/finance/FinanceTransactionsContext.tsx`, `src/finance/transactionService.ts`, `src/finance/transactionMath.ts`.
- Reused components: Card, FinancePageHeader, FinanceDataTable, FinanceDetailDrawer, FinanceDocumentReference, FinanceTransactionHistory, FinanceRestrictedAction.
- Readiness: Implemented demonstration; QA evidence in Batch 6; Not implemented; proposed contract only.
- Proposed reads: GET `/api/finance/v1/journals/?company&state`; GET `/api/finance/v1/journals/{id}/`.
- Proposed writes: POST `/api/finance/v1/journals/drafts/`; POST `/api/finance/v1/journals/{id}/review-requests/`.
- Native DocType candidates: `Journal Entry`, `Journal Entry Account`.
- Permissions: Existing Django login + FinanceEntitlement + company/action authorization; finance.journals.read / finance.journals.draft / independent review + separate submit; Native target document/report permissions and company restrictions; server must enforce both layers.
- Operations: Read authoritative server DTOs; save/version/review draft commands only after separate write approval.
- Validation: Exactly one side per line; balance at authoritative precision; account/company/currency/period and mandatory dimensions; Do not bypass native payment allocation or routine invoice workflows via journals.
- Dependencies: Accounts/period controls; CA journal purposes/dimensions; Single posting-owner policy.
- Audit: Line revisions, reason, supporting references, maker/checker, submission/amendment lineage.
- Implementation stage: 7 (see roadmap gates).
- Current UI coverage: Multi-line debit/credit, bounds, balanced validation, drafts and history.

## Credit Note

- React: `src/pages/FinancePreview/FinanceTransactionsPage.tsx` · `/finance/preview/credit-note`.
- Current boundary: `src/finance/FinanceTransactionsContext.tsx`, `src/finance/transactionService.ts`, `src/finance/transactionMath.ts`.
- Reused components: Card, FinancePageHeader, FinanceDataTable, FinanceDetailDrawer, FinanceDocumentReference, FinanceTransactionHistory, FinanceRestrictedAction.
- Readiness: Implemented demonstration; QA evidence in Batch 6; Not implemented; proposed contract only.
- Proposed reads: GET `/api/finance/v1/adjustments/?company&side=sales`; GET `/api/finance/v1/invoices/{id}/adjustable-balance/`.
- Proposed writes: POST `/api/finance/v1/adjustments/from-operational-reference/`; POST `/api/finance/v1/adjustments/{id}/draft-revisions/`.
- Native DocType candidates: `Sales Invoice (return / is_return)`.
- Permissions: Existing Django login + FinanceEntitlement + company/action authorization; finance.adjustments.read / finance.adjustments.draft / independent review + separate submit; Native target document/report permissions and company restrictions; server must enforce both layers.
- Operations: Read authoritative server DTOs; save/version/review draft commands only after separate write approval.
- Validation: Native return_against/original references, sign conventions and approved tax reversal; Cap prior credits/allocations; preserve existing return/stock workflow; no second physical return.
- Dependencies: Original submitted invoice; Operational return/price-correction identity; Approved refund/credit/debit direction and ownership.
- Audit: Original and adjustment/native IDs, reason, source revision, cumulative caps, reviewer and stock-ownership decision.
- Implementation stage: 7 (see roadmap gates).
- Current UI coverage: Linked sales credit / supplier debit reductions; local positive display values need native-sign adapter.

## Debit Note

- React: `src/pages/FinancePreview/FinanceTransactionsPage.tsx` · `/finance/preview/debit-note`.
- Current boundary: `src/finance/FinanceTransactionsContext.tsx`, `src/finance/transactionService.ts`, `src/finance/transactionMath.ts`.
- Reused components: Card, FinancePageHeader, FinanceDataTable, FinanceDetailDrawer, FinanceDocumentReference, FinanceTransactionHistory, FinanceRestrictedAction.
- Readiness: Implemented demonstration; QA evidence in Batch 6; Not implemented; proposed contract only.
- Proposed reads: GET `/api/finance/v1/adjustments/?company&side=purchase`; GET `/api/finance/v1/invoices/{id}/adjustable-balance/`.
- Proposed writes: POST `/api/finance/v1/adjustments/from-operational-reference/`; POST `/api/finance/v1/adjustments/{id}/draft-revisions/`.
- Native DocType candidates: `Purchase Invoice (return / is_return)`.
- Permissions: Existing Django login + FinanceEntitlement + company/action authorization; finance.adjustments.read / finance.adjustments.draft / independent review + separate submit; Native target document/report permissions and company restrictions; server must enforce both layers.
- Operations: Read authoritative server DTOs; save/version/review draft commands only after separate write approval.
- Validation: Native return_against/original references, sign conventions and approved tax reversal; Cap prior credits/allocations; preserve existing return/stock workflow; no second physical return.
- Dependencies: Original submitted invoice; Operational return/price-correction identity; Approved refund/credit/debit direction and ownership.
- Audit: Original and adjustment/native IDs, reason, source revision, cumulative caps, reviewer and stock-ownership decision.
- Implementation stage: 7 (see roadmap gates).
- Current UI coverage: Linked sales credit / supplier debit reductions; local positive display values need native-sign adapter.

## General Ledger

- React: `src/pages/FinancePreview/FinanceReportsPage.tsx` · `/finance/preview/ledger`.
- Current boundary: `src/finance/reportData.ts`, `src/finance/reportMath.ts`.
- Reused components: Card, FinancePageHeader, FinanceDataTable, FinanceDetailDrawer, FinanceDocumentReference, FinanceRestrictedAction.
- Readiness: Implemented demonstration; QA evidence in Batch 6; Not implemented; proposed contract only.
- Proposed reads: GET `/api/finance/v1/reports/general-ledger/?company&start&end&account&type`; GET `/api/finance/v1/documents/{doctype}/{id}/`.
- Proposed writes: none; overview/report remains read-only.
- Native DocType candidates: `GL Entry`, `Account`, `Payment Entry / Payment Ledger Entry where target version supports it`.
- Permissions: Existing Django login + FinanceEntitlement + company/action authorization; finance.reports.read with company/party scope; Native target document/report permissions and company restrictions; server must enforce both layers.
- Operations: Read authoritative server DTOs; no write operation.
- Validation: Authoritative submitted data only; unified snapshot/company/currency/Finance Book/dimensions and date scope; Hierarchical subtotals must not double-count leaves; explicit opening/closing and debit/credit signs; Deterministic order; pagination/running balance calculated before display-only type filtering; linked permission-checked documents.
- Dependencies: Approved authoritative report adapters; Consistent snapshot and period policy; Submitted source documents.
- Audit: Query scope, snapshot ID, row-count/total signature, access-denial and source drill-down; no direct GL writes.
- Implementation stage: 3 (see roadmap gates).
- Current UI coverage: Read-only filters, hierarchy/totals, document drill-down; 310-date reconciliation tests.

## Trial Balance

- React: `src/pages/FinancePreview/FinanceReportsPage.tsx` · `/finance/preview/trial-balance`.
- Current boundary: `src/finance/reportData.ts`, `src/finance/reportMath.ts`.
- Reused components: Card, FinancePageHeader, FinanceDataTable, FinanceDetailDrawer, FinanceDocumentReference, FinanceRestrictedAction.
- Readiness: Implemented demonstration; QA evidence in Batch 6; Not implemented; proposed contract only.
- Proposed reads: GET `/api/finance/v1/reports/trial-balance/?company&start&end`; GET `/api/finance/v1/documents/{doctype}/{id}/`.
- Proposed writes: none; overview/report remains read-only.
- Native DocType candidates: `GL Entry`, `Account`, `Payment Entry / Payment Ledger Entry where target version supports it`.
- Permissions: Existing Django login + FinanceEntitlement + company/action authorization; finance.reports.read with company/party scope; Native target document/report permissions and company restrictions; server must enforce both layers.
- Operations: Read authoritative server DTOs; no write operation.
- Validation: Authoritative submitted data only; unified snapshot/company/currency/Finance Book/dimensions and date scope; Hierarchical subtotals must not double-count leaves; explicit opening/closing and debit/credit signs; Opening/movement/closing sums balance at precision; no arbitrary balancing plug.
- Dependencies: Approved authoritative report adapters; Consistent snapshot and period policy; Submitted source documents.
- Audit: Query scope, snapshot ID, row-count/total signature, access-denial and source drill-down; no direct GL writes.
- Implementation stage: 3 (see roadmap gates).
- Current UI coverage: Read-only filters, hierarchy/totals, document drill-down; 310-date reconciliation tests.

## Profit and Loss

- React: `src/pages/FinancePreview/FinanceReportsPage.tsx` · `/finance/preview/profit-loss`.
- Current boundary: `src/finance/reportData.ts`, `src/finance/reportMath.ts`.
- Reused components: Card, FinancePageHeader, FinanceDataTable, FinanceDetailDrawer, FinanceDocumentReference, FinanceRestrictedAction.
- Readiness: Implemented demonstration; QA evidence in Batch 6; Not implemented; proposed contract only.
- Proposed reads: GET `/api/finance/v1/reports/profit-loss/?company&start&end&comparison`; GET `/api/finance/v1/documents/{doctype}/{id}/`.
- Proposed writes: none; overview/report remains read-only.
- Native DocType candidates: `GL Entry`, `Account`, `Payment Entry / Payment Ledger Entry where target version supports it`.
- Permissions: Existing Django login + FinanceEntitlement + company/action authorization; finance.reports.read with company/party scope; Native target document/report permissions and company restrictions; server must enforce both layers.
- Operations: Read authoritative server DTOs; no write operation.
- Validation: Authoritative submitted data only; unified snapshot/company/currency/Finance Book/dimensions and date scope; Hierarchical subtotals must not double-count leaves; explicit opening/closing and debit/credit signs; CA classification and cost recognition; comparative scope explicit; do not count stock/COGS twice.
- Dependencies: Approved authoritative report adapters; Consistent snapshot and period policy; Submitted source documents.
- Audit: Query scope, snapshot ID, row-count/total signature, access-denial and source drill-down; no direct GL writes.
- Implementation stage: 3 (see roadmap gates).
- Current UI coverage: Read-only filters, hierarchy/totals, document drill-down; 310-date reconciliation tests.

## Balance Sheet

- React: `src/pages/FinancePreview/FinanceReportsPage.tsx` · `/finance/preview/balance-sheet`.
- Current boundary: `src/finance/reportData.ts`, `src/finance/reportMath.ts`.
- Reused components: Card, FinancePageHeader, FinanceDataTable, FinanceDetailDrawer, FinanceDocumentReference, FinanceRestrictedAction.
- Readiness: Implemented demonstration; QA evidence in Batch 6; Not implemented; proposed contract only.
- Proposed reads: GET `/api/finance/v1/reports/balance-sheet/?company&as_of`; GET `/api/finance/v1/documents/{doctype}/{id}/`.
- Proposed writes: none; overview/report remains read-only.
- Native DocType candidates: `GL Entry`, `Account`, `Payment Entry / Payment Ledger Entry where target version supports it`.
- Permissions: Existing Django login + FinanceEntitlement + company/action authorization; finance.reports.read with company/party scope; Native target document/report permissions and company restrictions; server must enforce both layers.
- Operations: Read authoritative server DTOs; no write operation.
- Validation: Authoritative submitted data only; unified snapshot/company/currency/Finance Book/dimensions and date scope; Hierarchical subtotals must not double-count leaves; explicit opening/closing and debit/credit signs; Assets = liabilities + equity; approved earnings and period-closing treatment.
- Dependencies: Approved authoritative report adapters; Consistent snapshot and period policy; Submitted source documents.
- Audit: Query scope, snapshot ID, row-count/total signature, access-denial and source drill-down; no direct GL writes.
- Implementation stage: 3 (see roadmap gates).
- Current UI coverage: Read-only filters, hierarchy/totals, document drill-down; 310-date reconciliation tests.

## Receivables Aging

- React: `src/pages/FinancePreview/FinanceReportsPage.tsx` · `/finance/preview/receivables`.
- Current boundary: `src/finance/reportData.ts`, `src/finance/reportMath.ts`.
- Reused components: Card, FinancePageHeader, FinanceDataTable, FinanceDetailDrawer, FinanceDocumentReference, FinanceRestrictedAction.
- Readiness: Implemented demonstration; QA evidence in Batch 6; Not implemented; proposed contract only.
- Proposed reads: GET `/api/finance/v1/reports/receivables-aging/?company&as_of&party`; GET `/api/finance/v1/documents/{doctype}/{id}/`.
- Proposed writes: none; overview/report remains read-only.
- Native DocType candidates: `Sales Invoice`, `Account`, `Payment Entry / Payment Ledger Entry where target version supports it`.
- Permissions: Existing Django login + FinanceEntitlement + company/action authorization; finance.reports.read with company/party scope; Native target document/report permissions and company restrictions; server must enforce both layers.
- Operations: Read authoritative server DTOs; no write operation.
- Validation: Authoritative submitted data only; unified snapshot/company/currency/Finance Book/dimensions and date scope; Hierarchical subtotals must not double-count leaves; explicit opening/closing and debit/credit signs; Due-date/calendar/timezone basis explicit; exact bucket boundaries; dated allocations/credits reconcile to control account; no customer/supplier netting.
- Dependencies: Approved authoritative report adapters; Consistent snapshot and period policy; Submitted source documents.
- Audit: Query scope, snapshot ID, row-count/total signature, access-denial and source drill-down; no direct GL writes.
- Implementation stage: 3 (see roadmap gates).
- Current UI coverage: Read-only filters, hierarchy/totals, document drill-down; 310-date reconciliation tests.

## Payables Aging

- React: `src/pages/FinancePreview/FinanceReportsPage.tsx` · `/finance/preview/payables`.
- Current boundary: `src/finance/reportData.ts`, `src/finance/reportMath.ts`.
- Reused components: Card, FinancePageHeader, FinanceDataTable, FinanceDetailDrawer, FinanceDocumentReference, FinanceRestrictedAction.
- Readiness: Implemented demonstration; QA evidence in Batch 6; Not implemented; proposed contract only.
- Proposed reads: GET `/api/finance/v1/reports/payables-aging/?company&as_of&party`; GET `/api/finance/v1/documents/{doctype}/{id}/`.
- Proposed writes: none; overview/report remains read-only.
- Native DocType candidates: `Purchase Invoice`, `Account`, `Payment Entry / Payment Ledger Entry where target version supports it`.
- Permissions: Existing Django login + FinanceEntitlement + company/action authorization; finance.reports.read with company/party scope; Native target document/report permissions and company restrictions; server must enforce both layers.
- Operations: Read authoritative server DTOs; no write operation.
- Validation: Authoritative submitted data only; unified snapshot/company/currency/Finance Book/dimensions and date scope; Hierarchical subtotals must not double-count leaves; explicit opening/closing and debit/credit signs; Due-date/calendar/timezone basis explicit; exact bucket boundaries; dated allocations/credits reconcile to control account; no customer/supplier netting.
- Dependencies: Approved authoritative report adapters; Consistent snapshot and period policy; Submitted source documents.
- Audit: Query scope, snapshot ID, row-count/total signature, access-denial and source drill-down; no direct GL writes.
- Implementation stage: 3 (see roadmap gates).
- Current UI coverage: Read-only filters, hierarchy/totals, document drill-down; 310-date reconciliation tests.

## Bank Reconciliation

- React: `src/pages/FinancePreview/FinanceAdministrationPage.tsx` · `/finance/preview/reconciliation`.
- Current boundary: `src/finance/FinanceAdministrationContext.tsx`, `src/finance/administrationService.ts`, `src/finance/administrationData.ts`.
- Reused components: Card, FinancePageHeader, FinanceDataTable, FinanceDetailDrawer, FinanceRestrictedAction.
- Readiness: Implemented demonstration; QA evidence in Batch 6; Not implemented; proposed contract only.
- Proposed reads: GET `/api/finance/v1/bank-reconciliations/?company&bank&start&end`; GET `/api/finance/v1/bank-reconciliations/{id}/suggestions/`.
- Proposed writes: POST `/api/finance/v1/bank-reconciliations/{id}/match-requests/`; POST `/api/finance/v1/bank-reconciliations/{id}/unmatch-requests/`.
- Native DocType candidates: `Bank Account`, `Bank Transaction`, `Payment Entry`, `Journal Entry`.
- Permissions: Existing Django login + FinanceEntitlement + company/action authorization; finance.reconciliation.read / finance.reconciliation.match + separately approved clearance action; Native target document/report permissions and company restrictions; server must enforce both layers.
- Operations: Read authoritative server DTOs; save/version/review draft commands only after separate write approval.
- Validation: Statement/ledger company/currency, signed amounts, uniqueness and approved tolerances; Reconciliation may update native clearance/allocation fields: not just a local label; no invented fee journal or bank sync implicit in matching.
- Dependencies: Authoritative bank ledger; Approved statement import/security; Native matching behavior and conflict controls.
- Audit: Statement fingerprint/row, voucher references, before/after match+clearance, reviewer/reason, native outcome and retries.
- Implementation stage: 8 (see roadmap gates).
- Current UI coverage: Fictional pairs and exceptions; raw UGX 400 / two intentional exceptions; no actual clearance.

## Opening Balances and Independent Review

- React: `src/pages/FinancePreview/FinanceAdministrationPage.tsx` · `/finance/preview/opening-balances`.
- Current boundary: `src/finance/FinanceAdministrationContext.tsx`, `src/finance/administrationService.ts`, `src/finance/administrationData.ts`.
- Reused components: Card, FinancePageHeader, FinanceDataTable, FinanceDetailDrawer, FinanceRestrictedAction.
- Readiness: Implemented demonstration; QA evidence in Batch 6; Not implemented; proposed contract only.
- Proposed reads: GET `/api/finance/v1/opening-balances/?company&fiscal_year`; GET `/api/finance/v1/opening-balances/{id}/review/`.
- Proposed writes: POST `/api/finance/v1/opening-balances/drafts/`; POST `/api/finance/v1/opening-balances/{id}/review-requests/`; POST `/api/finance/v1/opening-balances/{id}/correction-requests/`.
- Native DocType candidates: `Journal Entry (opening)`, `Opening Invoice Creation Tool`, `Sales Invoice`, `Purchase Invoice`.
- Permissions: Existing Django login + FinanceEntitlement + company/action authorization; finance.openings.read / finance.openings.prepare / independent review; posting separately gated; Native target document/report permissions and company restrictions; server must enforce both layers.
- Operations: Read authoritative server DTOs; save/version/review draft commands only after separate write approval.
- Validation: Approved cutover/date and complete reconciliation to legacy ledger, parties and stock ownership; Do not load AR/AP in both opening journals and opening invoices; no duplicate stock opening; Reviewer != maker, authenticated assigned actor/company scope; versioned corrections and resubmit; actual import/post explicitly approved.
- Dependencies: CA opening sign-off; One posting owner/cutover; Existing Django accounting and operational stock reconciliation.
- Audit: Legacy extract fingerprint, account/party mapping, balancing evidence, independent approvals, one-time import token, target IDs and rollback/reversal plan.
- Implementation stage: 4 (see roadmap gates).
- Current UI coverage: Company/year-isolated drafts, party/control balancing, maker/checker/correction/revision guard; no actual approval.

## Finance Administration / CA Readiness

- React: `src/pages/FinancePreview/FinanceAdministrationPage.tsx` · `/finance/preview/administration`.
- Current boundary: `src/finance/FinanceAdministrationContext.tsx`, `src/finance/administrationService.ts`, `src/finance/administrationData.ts`.
- Reused components: Card, FinancePageHeader, FinanceDataTable, FinanceDetailDrawer, FinanceRestrictedAction.
- Readiness: Implemented demonstration; QA evidence in Batch 6; Not implemented; proposed contract only.
- Proposed reads: GET `/api/finance/v1/administration/users/?company`; GET `/api/finance/v1/administration/permission-matrix/?company`; GET `/api/finance/v1/administration/readiness/?company`; GET `/api/finance/v1/administration/audit/?company`.
- Proposed writes: POST `/api/finance/v1/administration/review-configuration/drafts/`.
- Native DocType candidates: `User`, `Role`, `User Permission`, `Workflow`, `Workflow State`, `Workflow Action`.
- Permissions: Existing Django login + FinanceEntitlement + company/action authorization; finance.admin.read / finance.admin.configure; any provisioning/role grants require separate privileged contracts; Native target document/report permissions and company restrictions; server must enforce both layers.
- Operations: Read authoritative server DTOs; save/version/review draft commands only after separate write approval.
- Validation: Server-authenticated identity; approved role mapping and least privilege; no client persona as authority; CA checklist cannot grant entitlement or activation; actual policy approval stored independently; No unrestricted Frappe role/User CRUD passthrough; audit separation of duties and denied requests.
- Dependencies: Existing Django identity/FinanceEntitlement; Company restrictions; CA policy and independent approval design.
- Audit: Privileged before/after changes, who requested/reviewed/applied, company scope, justification and immutable decision history; redact secrets.
- Implementation stage: 0 (see roadmap gates).
- Current UI coverage: Read-only role/company overview, local CA checklist, readiness/audit; no user provisioning or real grants.

## Verified documentation and limits

The native mappings above are design recommendations, not findings from a connected ERPNext site. Confirm installed version, custom fields, company permissions and report names in an approved test environment before implementation.

- [Frappe REST API](https://docs.frappe.io/framework/user/en/guides/integration/rest_api): native resource/method APIs exist; the proposed Django gateway is our design boundary, not a native endpoint list.
- [ERPNext permissions](https://docs.frappe.io/erpnext/permissions): document actions and company-related User Permissions must complement Django authorization.
- [Accounting reports](https://docs.frappe.io/erpnext/accounting-reports): report reconciliation requires consistent dates/company/filter scope.
- [Sales Invoice](https://docs.frappe.io/erpnext/sales-invoice): stock effects are conditional; existing Navapack operations must remain the stock workflow owner unless separately redesigned.
- [Sales tax templates](https://docs.frappe.io/erpnext/sales-taxes-and-charges-template) and [purchase tax templates](https://docs.frappe.io/erpnext/purchase-taxes-and-charges-template): separate selling/buying tax structures; the demo is not a complete native tax model.
- [Payment Entry](https://docs.frappe.io/erpnext/payment-entry) and [Journal Entry](https://docs.frappe.io/erpnext/journal-entry): use native payment/allocation behavior for payments and journals for appropriate adjustments.
- [Credit Note](https://docs.frappe.io/erpnext/credit-note) and [Debit Note](https://docs.frappe.io/erpnext/debit-note): return invoice representations need original references and native sign adapters.
- [Bank reconciliation](https://docs.frappe.io/erpnext/bank-reconciliation): native reconciliation records clearance and can update financial references; it is more than the preview pairing state.
- [Opening balances](https://docs.frappe.io/erpnext/opening-balance): choose opening journals/invoices according to approved cutover design, avoiding duplicate control balances.
- [Workflows](https://docs.frappe.io/erpnext/workflows): independent approval transitions must be designed against the installed workflow and authenticated roles.

No native submit/cancel/import/export/activation permission is granted by this plan. No `GL Entry` resource may be written directly. Existing operational Sales/Dispatch/Invoice/Returns/Inventory IDs and posting paths must be inventoried before write integration.
