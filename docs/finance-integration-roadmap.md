# Django–ERPNext integration roadmap

6 November 2026 · Proposed future work only. No API, schema, gateway mutation or native financial configuration was implemented in Batch 6.

Read with the [22-module specification](finance-integration-readiness.md) and [machine-readable readiness matrix](finance-readiness-matrix.json). Future endpoint names and capabilities are proposals for contract review, not available routes.

## Existing boundary verified in source

`src/lib/financeGateway.ts` currently reads application availability through `/auth/applications/` and diagnostics through `/finance/status/`. `backend/finance_gateway/urls.py` declares only `status/`. Its contract remains unavailable/read-only, `posting_enabled=false`, `accounting_setup=not_assessed`. Existing login and FinanceEntitlement behavior are preserved. The development Preview branches before live providers and must remain isolated after integration starts.

The proposed `/api/finance/v1/...` gateway belongs in a separately approved live adapter. Keep the current in-memory services and fictional fixtures usable only in the explicit development preview. Do not swap a demo context into the authenticated accounting workspace or silently fall back from failed real reads to fictional balances.

## Stage 0 — Ownership, identity and contracts

- Inventory the existing Django accounting posting/dispatch/invoice/returns paths and identify the authoritative ledger owner. Existing operational and accounting behavior must remain intact until an approved cutover.
- Decide whether/when native financial documents replace a Django posting path. Never post the same event to both ledgers without a separately approved migration/reconciliation design.
- Preserve Django identity and FinanceEntitlement. Define company/action capabilities and their native permission counterpart. A frontend role/persona selector is never an authorization source.
- Verify the installed target version, DocTypes/custom fields and report signatures in an approved test environment; the public documentation is guidance, not evidence of the installed schema.
- Approve company/currency/calendar, tax/classification, dimensions, periods, credit terms, opening and maker/checker policy with the CA.
- Define immutable source identity, correlation IDs, idempotency, decimal-string DTOs, pagination, conflict handling, audit retention/redaction and a versioned error contract. Proposed errors: 401/403 for identity/access, 404 for inaccessible/missing resources, 409 for stale versions/idempotency conflicts, and a consistent 400/422 validation convention to be agreed.

Exit gate: written ownership and authorization decisions, signed-off sample calculations and contracts. No posting is enabled by finishing this stage.

## Stage 1 — Read-only setup and accounts

Read Company, Currency, Fiscal Year and Account through the Django gateway. Map stable native IDs rather than names, distinguish root/report/account type, and validate parent/group hierarchy. Keep setup completeness separate from entitlement and availability. Add company/permission-denied, loading, retry, empty and stale-response tests before any master write.

Exit gate: authenticated read-only master views with target-version fixtures and tenant/company isolation tests. Master draft writes require separate approval, revision checks and audit.

## Stage 2 — Tax, party and bank mappings

Reuse existing operational Customer/Supplier identifiers. Maintain one mapping to company-specific receivable/payable accounts; do not create a second customer or supplier workflow. Load native Bank/Bank Account and payment modes without exposing bank secrets or enabling synchronization.

Implement separate sales and purchase tax adapters only after CA approval. The preview’s 10% example, zero-tax report and simple liability mapping are not a production policy. Recoverable input tax, valuation, inclusive/compound rules, withholding, precision and effective dates need native schema/policy decisions. [Official selling](https://docs.frappe.io/erpnext/sales-taxes-and-charges-template) and [buying tax template documentation](https://docs.frappe.io/erpnext/purchase-taxes-and-charges-template) describe separate configurations.

Exit gate: reviewed mappings and tax examples; no silent master duplication, bank connection or real rate activation.

## Stage 3 — Authoritative read-only reports and Dashboard

Use a common snapshot ID and scope (company, inclusive period/as-of date, currency, Finance Book, dimensions and closing behavior). Read submitted native data; do not calculate live statements from browser draft lists. Reports and Dashboard must reconcile before proceeding. [ERPNext accounting reports](https://docs.frappe.io/erpnext/accounting-reports) explain the need to align report scope.

Verify opening + movements = closing, trial balance, accounting equation, P&L earnings-to-equity and aging-to-control accounts, including dated settlements/credits. Define due-date/aging timezone policy rather than carrying over the demo’s UTC convention by assumption. Return masked, permission-checked drill-down references. No direct writes to GL Entry and no financial export endpoint in this phase.

Exit gate: replayable read snapshots, parity evidence and approved report semantics.

## Stage 4 — Opening/cutover design and independent review

Treat opening balances as a controlled migration, not a free-form browser journal. Reconcile legacy posted journals, customer/supplier outstanding, bank, stock valuation and capital at the approved cutover date. Use the appropriate native opening documents and avoid loading the same AR/AP control in both journals and opening invoices. [Opening-balance guidance](https://docs.frappe.io/erpnext/opening-balance) distinguishes those paths.

Reviewers must be authenticated, eligible for the company, different from the maker and assigned to the specific revision. Corrections invalidate prior review. Persist extraction hashes, mapping versions, independent sign-off, one-time import token, native document IDs and recovery/reversal evidence. Existing stock/quantity workflows stay authoritative; opening UI must not create a second stock opening.

Exit gate: CA-approved dry run and single-ledger ownership/cutover plan. Import/posting still needs explicit authorization.

## Stage 5 — Operational invoice accounting representations

Read existing sales/dispatch and purchase/receipt source documents. Financial drafts must be derived from an approved operational source/revision with a unique company/source/type identity and deterministic idempotency key. Do not introduce another operational Sales, Invoice, Dispatch, Return or Inventory workflow.

Use an outbox/retry design or another explicitly approved recovery mechanism. A gateway timeout cannot be interpreted as success or justify a second native invoice. Record source and target IDs, document fingerprints, state transitions and conflicts. Prevent duplicate Django/native posting. Stock updates on native financial documents must be disabled unless the approved ownership design explicitly assigns them there; [Sales Invoice documentation](https://docs.frappe.io/erpnext/sales-invoice) makes stock effects conditional.

Exit gate: source-to-native draft parity and retry/idempotency tests. Submission remains a separate governed action.

## Stage 6 — Receipts, payments and allocations

Read authoritative invoice outstanding at command time and revalidate under concurrency control. Match company, party, account, currency and period; prevent duplicate allocations. Decide advances, write-offs, FX, refunds and rounding explicitly instead of generalizing the demo’s full-allocation-only rule. Use [native Payment Entry behavior](https://docs.frappe.io/erpnext/payment-entry), not arbitrary GL edits. Payment accounting must not initiate an external bank transfer.

Exit gate: exact allocation and ledger reconciliation, idempotency, conflict and partial-failure tests. Payment approval/submission is separately authorized.

## Stage 7 — Journals and financial notes

Implement journals for approved purposes with authoritative precision, dimensions, period locks and independent review. Use [Journal Entry](https://docs.frappe.io/erpnext/journal-entry) rather than bypassing native invoice/payment allocation processes.

Map sales credits to return Sales Invoices and supplier debits to return Purchase Invoices, preserving original-document references and native signs. Demo positive adjustment display values need an explicit adapter. [Credit Note](https://docs.frappe.io/erpnext/credit-note) and [Debit Note](https://docs.frappe.io/erpnext/debit-note) are native accounting representations; they must not duplicate the existing physical return workflow. Validate prior notes, allocations, tax reversal and refund/credit treatment.

Exit gate: audited original-to-adjustment lineage, cumulative cap and conflict tests; posting is still independently gated.

## Stage 8 — Reconciliation and governed administration

Native bank matching can update clearance and financial references, so the local pairing demo is not a complete integration. [Bank Reconciliation](https://docs.frappe.io/erpnext/bank-reconciliation) distinguishes bank clearance from party payment reconciliation. Add protected statement imports/matching only after explicit approval, with statement fingerprints, signed-amount/currency validation, uniqueness, conflict handling and audit. Fees/interest require explicit authorized accounting transactions; do not invent them to eliminate a difference.

Keep administrative reads separate from privileged changes. Existing Django identities remain the login source; no generic User/Role CRUD passthrough and no browser-held service credentials. Any CA policy or role change needs a privileged request/review/apply contract and independent audit. [Native permissions](https://docs.frappe.io/erpnext/permissions) and [workflow configuration](https://docs.frappe.io/erpnext/workflows) supplement, rather than replace, Django authorization.

Exit gate: independent acceptance/security review and documented activation prerequisites. A checked checklist or successful connection must never activate Finance automatically.

## Audit and acceptance rules for every stage

Capture server actor, company, action, immutable document/source IDs, correlation/idempotency key, before/after version, exact decimal totals, reviewer/revision, decision/outcome and native reference. Redact passwords, service tokens, full bank details and unnecessary personal data. A framework change log may supplement but cannot replace a durable gateway event history, including access denials and integration failures.

Require typed contract tests, real permission-denial tests, concurrency/idempotency/retry cases, period/currency/tax examples, report reconciliation, source preservation and UI error/empty/loading states. Keep real financial controls disabled until their individual stage is approved. This roadmap is not approval to change the backend, connect services, post records or deploy.
