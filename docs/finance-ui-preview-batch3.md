> Historical Batch 3 report. The [Batch 4 review](finance-ui-preview-batch4.md) documents the reconciled read-only ledger and reports.

# Finance UI Preview — Batch 3 review

6 November 2026 · Asia/Calcutta

Batch 3 implements Finance Transactions UI in the existing development-only preview. Batch 4 has not started. No commit, push or deployment was performed.

## Screens completed

- **Sales Invoice Accounting and Purchase Invoice Accounting**: separate searchable/state-filtered accounting lists, read-only fictional operational reference snapshots, invoice details, editable draft line items, add/remove lines, illustrative tax and total calculations, and draft editing.
- **Receipt Entry and Payment Entry**: fictional customer/supplier and bank selection, invoice allocation editors, split allocations, snapshot outstanding, other planned allocations/adjustments, available balance and projected remainder. Positive amounts, exact allocation totals, duplicate allocation prevention and aggregate available-balance checks are enforced.
- **Journal Entry**: multiple debit/credit lines, non-group ledger selection, add/remove lines, live debit/credit/difference presentation, one-sided positive line validation, balanced totals and local drafts.
- **Credit Notes and Debit Notes**: linked invoice references, adjustment reasons and editable lines. Sales credits reduce planned receivables; supplier debits reduce planned payables. References must match party/currency/direction and adjustment dates cannot precede invoices. Aggregate adjustments cannot consume funds already reserved by other draft plans.
- **Shared references/history**: reusable linked-document navigation and local create/edit history in details drawers. No production audit trail is implied.

Existing Card, page headers, data tables, drawers, restricted actions, shell, colors and typography are reused. The drawer now wraps long references. Batch 1 Dashboard and Batch 2 setup/master forms remain functional and were exercised again by browser tests.

## Accounting representation boundary

These screens are accounting representations of centralized fictional operational references, within `/finance/preview/`. They do not create another operational Sales, Dispatch, Inventory, Invoice or Returns workflow. References do not read operational stores or mutate orders, stock, dispatches, invoices or returns. They identify sample source documents so the future approved integration boundary is visible.

`transactionData.ts` defines discriminated document types, fixtures and reference metadata. A typed in-memory transaction service clones reads and validates the entire candidate graph before replacing memory state. Invalid saves leave documents and history unchanged. Repeated saves update the same draft rather than allocating twice. Parent invoice edits cannot invalidate existing notes or allocations. Reference snapshots cannot be edited or converted into drafts, and new invoice drafts cannot claim historical settlement.

Snapshot outstanding = invoice total minus fictional historical settled amount. Available planning balance further subtracts saved planned allocations and notes. These are demonstration budgets, not real settlements. Batch 1 Dashboard totals and Batch 2 profile balance snapshots remain independent illustrative datasets and are not reconciled or recalculated from Batch 3 drafts.

Tax defaults to zero. Users can enter explicit illustrative additive line rates; no Batch 2 tax master is automatically applied or treated as approved. Whole UGX prices, quantities up to three decimal places, rates up to two decimal places and per-line half-up net/tax rounding are demonstration calculation conventions only. Values must remain safe bounded integers after calculation. No actual Navapack accounting or tax policy is encoded.

## Isolation and preservation

- Existing DEV + explicit VITE_FINANCE_UI_PREVIEW=true + user-entry gate is unchanged. Production denies the preview even when built with the flag.
- The transaction provider is nested inside the existing resettable demo/master providers. Refresh, reset and exit discard all transaction drafts and history.
- Recursive preview dependency inspection covers **31 modules** and rejects API transports, browser persistence, operational/auth contexts and unapproved external dependencies.
- Actual browser request auditing confirms **zero Finance Preview API requests**, including during all draft writes with a synthetic stored token. No unexpected external requests or runtime/console errors were observed. Existing font requests are allowed in the audit.
- Sales, dispatch, inventory, invoice/returns-related source, authentication, FinanceEntitlement and backend/Docker preservation checks passed: the existing 15-file baseline plus **566 Batch 3 operational/backend/Docker file hashes**. The new baseline was captured before Batch 3 edits; it does not replace or relax the original baseline.
- No backend, database, Frappe, Docker, operational, authentication, dependency, environment or deployment configuration files were edited.
- Posting, approval, payment execution, email, export and activation remain disabled. Only local draft saves are enabled. No real accounting/payment records were created.

## Changed-file inventory

Paths below are relative to `F:/WORK/ERP/frontend/`.

New implementation files:

- `src/finance/transactionData.ts` — document unions, sample references, fixtures, blank editors.
- `src/finance/transactionMath.ts` — scaled arithmetic, line/tax totals, journal totals and planning balances.
- `src/finance/transactionService.ts` — independent in-memory snapshots, atomic validation/save and history.
- `src/finance/FinanceTransactionsContext.tsx` — React adapter to the service and existing masters.
- `src/components/finance/preview/FinanceDocumentReference.tsx` — reusable document references and local history.
- `src/pages/FinancePreview/FinanceTransactionsPage.tsx` — lists, details and draft editors for all seven views.

Modified implementation files:

- `src/finance/FinanceDemoContext.tsx` — resettable transaction provider nesting.
- `src/finance/navigation.ts` — removes completed transaction views from future modules.
- `src/pages/FinancePreview/FinancePreviewRoutes.tsx` — transaction routes inside the isolated preview.
- `src/components/finance/preview/FinancePreviewLayout.tsx` — transaction navigation and scope text.
- `src/components/finance/preview/FinanceDetailDrawer.tsx` — long-title wrapping and close-button sizing.

Checks:

- New `scripts/check-finance-transactions.mjs` — calculation/service and preservation tests.
- New `scripts/check-finance-transactions-browser.mjs` — browser interaction helper invoked by the main preview browser suite.
- New `scripts/finance-batch3-preservation.json` — pre-edit operational/backend/Docker hashes.
- Modified `scripts/check-finance-preview-browser.mjs` — invokes Batch 3 checks, retains all earlier checks, audits production exclusion of transaction fixtures and writes Batch 3 evidence.

Documentation:

- New `docs/finance-ui-preview-batch3.md` — this report.
- Modified `docs/finance-ui-preview-batch2.md` — historical-report pointer to this batch.
- Modified `docs/DEVELOPMENT_STATUS.md`, `docs/DATA_MODELS.md`, `docs/BUSINESS_RULES.md`, `CHANGELOG.md` — current scope and demo behavior.

Generated review evidence:

- `docs/evidence/finance-preview-batch3/`: **30 PNGs** — seven views × desktop list/mobile list/mobile editor/mobile details, plus the preserved Dashboard desktop/mobile captures.
- `docs/evidence/finance-preview-batch3/browser-check.log` — final combined preview browser results.
- `docs/evidence/finance-preview-batch3/dispatch-preservation.log` — existing operational dispatch/sale browser result.
- Validation refreshed ignored build output, TypeScript metadata and Vite caches. No generated output was deployed.

This inventory records files written in this batch. Git-based diff/status is unavailable in this mounted workspace, as already observed during Batch 2; protected source hashes supply the preservation evidence.

## Validation results

All required checks passed:

- `node node_modules/typescript/bin/tsc --noEmit --incremental false`.
- `npm run build`, with VITE_FINANCE_UI_PREVIEW=true for production-denial verification. Existing bundle-size warning remains.
- `node scripts/check-finance-preview.mjs`: existing routes/sidebar constants, protected-file hashes, development gating, 31 isolated dependencies, original fixture/abort/monetary/chart/restricted-action checks and Batch 2 master validation.
- `node scripts/check-finance-transactions.mjs`: 566 preservation hashes; independent fixture/read copies; fractional quantity and half-unit rounding; unsafe/negative/non-finite/precision bounds; source/profile/currency/date consistency; split allocation totals; duplicate and aggregate over-allocation; adjustment direction/reason/caps; parent edits; journal imbalance, group ledger and two-sided-line rejection; immutable snapshots; unknown IDs; atomic failed saves and local edit history.
- `node scripts/check-finance-preview-browser.mjs`: Batch 1/2 preserved, all seven Batch 3 add/edit/search/state/detail workflows, live invoice totals, add/remove line controls, split receipt allocation, excessive/mismatched allocation rejection, three-line journal balancing, excessive adjustment rejection, linked-reference navigation, local create/edit history, route retention/reset, disabled financial controls, token preservation, no runtime/console errors and **zero API requests**. Flag-off and production denial and production fixture exclusion also passed.
- `node scripts/check-finance-gateway.mjs` and `node scripts/check-finance-gateway-browser.mjs`: existing entitlement, route/navigation, denied/loading/error/retry, revocation, stale-user cancellation, logout and unavailable-launch behavior preserved.
- Existing `check-auth.mjs`, `check-accounting.mjs`, `check-led-finance.mjs`, `check-integrated-operations.mjs`, `check-sales-fulfillment.mjs`, `check-inventory-workflows.mjs`, `check-quality.mjs`, `check-production-workflow-errors.mjs` passed.
- Existing `check-dispatch-sale-browser.mjs` passed with CHROME_PATH set to installed Edge. The script's default Chromium path is absent on this workstation; no script/source change was needed. Synthetic contexts only; no live backend requests.

Browser dimensions: desktop **1440×1000**, mobile **390×844**. No document-width or editor-width overflow was detected; wide transaction tables scroll inside their own region and the existing sidebar has its own scroll region. Representative invoice, receipt editor, journal details and credit-note screenshots were visually reviewed. Drawers use viewport captures to avoid full-page native-dialog screenshot artifacts. Browser profiles/servers are disposable and closed by the suites. Backend suites were not rerun; this batch validates frontend behavior and source preservation.

Evidence examples: [Sales invoice desktop](evidence/finance-preview-batch3/sales-invoice-desktop.png), [Purchase invoice desktop](evidence/finance-preview-batch3/purchase-invoice-desktop.png), [Receipt editor mobile](evidence/finance-preview-batch3/receipt-editor-mobile.png), [Balanced journal mobile](evidence/finance-preview-batch3/journal-details-mobile.png), [Credit note mobile](evidence/finance-preview-batch3/credit-note-details-mobile.png).

## Known limitations

- Local demonstration only; no durable persistence, real settlement, posting, approval, authorization grant, audit trail, email, export or activation.
- Only zero-decimal UGX illustration is supported. No FX, jurisdiction policy, compound/inclusive tax, withholding, discounts, retention, write-offs or CA-approved rounding/tax rules.
- Two fictional operational source references and read-only reference invoices seed the preview. New accounting drafts use those fictional sources; no live document import or operational deduplication contract exists.
- Receipts/payments require full allocation of the entry amount. Unallocated advances, reversals and cancellations are outside this batch.
- Sales credit and supplier debit notes demonstrate reductions only, capped by available planned balances; they do not execute returns. Other adjustment directions need separately agreed behavior.
- Journal drafts are not included in invoice planning balances or Dashboard/profile snapshots. No ledger/report recalculation is claimed.
- Batch 2 master edits are revalidated against the current transaction graph at the next transaction save; there is no cross-module master-approval or dependency-lock workflow. Invalidated references must be corrected before a transaction can save.
- Existing main-bundle warning and previously documented relative-base production deep-link hosting limitation remain. The preview is development-only.

## Batch 4 recommendation

Propose a separately approved **read-only accounting review and reporting UI**: a fictional general ledger, trial balance, receivable/payable aging and document drill-down, with an explicit distinction between immutable sample posted history and unposted draft projections. Define a single reconciled fixture dataset for those reports rather than silently combining the independent Dashboard/master snapshots.

Add report consistency tests, aging/date filters, empty/error states and desktop/mobile checks. Opening-balance and bank-reconciliation previews can follow agreed scope. Obtain CA decisions on tax, rounding, currency, account classifications and adjustment direction before expanding calculation policy. Keep APIs, financial posting and approval disabled until separate authorization and contracts are available.

Stopped after Batch 3 for review.
