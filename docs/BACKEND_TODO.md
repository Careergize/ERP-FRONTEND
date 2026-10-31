# Backend Integration TODO

## Sales approval, QC and print continuation — 28 October 2026

Sales UI now includes independent review guards and QC findings. Backend enforcement, shared cross-user business-document persistence, inspection/disposition integration, permanent issuance and official PDFs remain pending. Existing PDF infrastructure is browser print only; no programmatic generator/dependency was added.

## Sales Management frontend — 28 October 2026

Sales return/credit persistence, authoritative references, approval permissions, QC disposition, invoice issuance status, payment/opening balances and confirmed jurisdictional tax adjustments require future approved backend work. No endpoints, schemas, postings or stock changes were added for this frontend task. See [Sales boundaries](sales-management.md).

## Spares independent opening approval — 28 October 2026

Before Spares rollout, verify actual API origin/revisions, review inventory 0011 dependency and 0012 opening migration, approve explicit requester/reviewer grants and run browser/target-database acceptance. No grants or operational migrations were performed. See [implementation, exact files and verification](../../backend/inventory/SPARES_OPENING_APPROVAL.md).

## Catalogue backend integration — 28 October 2026

Catalogue integration is implemented and isolated-tested. Before rollout, approve the target, verify existing ERP audit tables, review/apply inventory 0011 only with its plan, assign catalogue permissions and verify browser/target-engine behavior. Do not run unrestricted shared migrations or import demo/spare records automatically. See [implementation and validation](../../backend/inventory/CATALOGUE_INTEGRATION.md).

## Separate Spares and Consumables — 28 October 2026

Review real misplaced spare-classified Consumables before any approved migration. Preserve IDs/codes/history; frontend flags two local demo samples only and performs no transfer. Permanent allocation, persistence and audit integration remain pending. See [scope and verification](consumables-frontend.md#spares--consumables-separation--28-october-2026).

## Consumables auto-code and audit preparation — 28 October 2026

Backend must allocate permanent Consumables codes/references atomically, enforce uniqueness and persist authoritative audit metadata/history. Frontend suggestions and activity remain session-only. See [scope and verification](consumables-frontend.md#auto-code-and-audit-preparation-follow-up--28-october-2026).

## Consumables frontend — 28 October 2026

Future approved contracts are needed for enhanced consumable fields, categories, movements, reports and expense metadata. Existing APIs remain unchanged; demo data is never synchronized. See [scope and validation](consumables-frontend.md).


## Finance and accounting — 27 October 2026

Accounting models/APIs and operational source hooks are implemented in the adjacent
Backend. Deploy accounting migrations and frontend together; reconcile cutover balances,
costs, FX and tax mapping. Verify PostgreSQL concurrent allocation/valuation and browser
workflows. Complete actual production/WIP costing, partial credit/return documents,
nonrecoverable landed-cost tax and GRNI FX reconciliation. See
[scope and rollout](../../../Backend/accounting/README.md).

## Recycling Module 2 — 26 October 2026

Bag register, material catalog, audit history and monthly/Excel reporting are implemented
in the active adjacent Backend. Deploy both applications and verify the remote endpoint,
browser workflow and PostgreSQL concurrency. Inventory transfers remain undefined.
See [Module 2](recycled-materials.md).

## Recycling Module 1 — 25 October 2026

Material catalog, purchase records, management history, monthly summaries and Excel/PDF endpoints are implemented locally. Before rollout, verify on the target PostgreSQL environment, review the PDF visually and deploy both applications. Modules 3–4 need their user-defined workflows. See [details](recycling-purchases.md).

## Supporting-record persistence — 25 October 2026

Supporting-record persistence and management history are implemented locally. Finish dedicated stock movements/dispatch, production runs/QC batches/transfers, invoice issue, QC submission/review/release and costing approval services after confirming operational authority. Canonical purchasing masters remain separate from generic reference entries.

Scope, pending authority proposal, verification and limitations: [persistence status](../../../Backend/PERSISTENCE_STATUS.md).

## Local workflow and registers update — 23 October 2026

Apply new catalog/graph merge migrations only to an approved environment; assign approved master permissions. Publish authority/policy and source evidence before stock posting or operational approval/release. Complete standalone controlled Job Card authoring without bypassing Task 04/05 gates.

See [implementation, checks and blockers](spares-consumables-implementation.md).

## Quotation-first orders and Sales Order approval — 23 October 2026

Current flow: saved Quotation → Sales Order awaiting approval → Production Manager
or Admin approval → automatic manufacturing Job Card and planned costing sheet.
This replaces the earlier order-first automatic quotation/allocation behavior.
The existing quotation review and customer-response UI still precedes conversion.
Manual selling prices may be entered without a preliminary costing estimate;
linked estimates retain their approval/model checks. Job Card costing is reviewed
after creation, before production approval and Store material issue.

New orders must identify an exact saved quotation revision and retain its lines,
prices, units, customer, tax/discount and LED snapshot. Direct order creation is
rejected by the API. Order approval is persisted with actor/time, limited to
Production Manager/Admin, atomic with job creation and safe to retry. Stock-only
orders create no Job Card. Existing-item manufacture still requires known zero
stock, rechecked at approval. Standalone manual production Job Cards remain allowed.

Sales Orders offers “Start with quotation”; the old new-order route opens Quotations.
Stock OUT new-sale entry saves a quotation first. Dispatch against an existing
order requires Sales Order approval. Finished-goods dispatch remains browser-session
state; this change does not add database persistence to dispatch or customer responses.
Migration erp.0015 grants the Sales Order approval permission to PM/Admin roles.


Implemented production-workflow/machines GET/POST, saved machine/process compatibility
checks, and per-item jobRouting overrides through Sales Order allocation and PM edits.
Migration 0013 adds ProductionMachine; existing process-master permissions govern access.
Machine maintenance/deactivation UI and later production-run persistence remain pending.

## API-only Sales Orders — 21 October 2026

Implemented shared order list/detail reads without sample fallback, API creation
options for active customers/staff/latest model revisions, and persisted quotation
conversion references with duplicate protection. No schema migration required.
Historical illustrative orders are no longer displayed. Later production/QC/dispatch
persistence and full quotation authoring persistence remain pending.

## API-only Job Card reads — 21 October 2026

List/detail now use production-workflow/jobs exclusively; no sample-card or legacy
job-cards response fallback remains. Allocation accepts shared API-backed Sales Orders
only. Empty/error responses stay explicit. Later production tracking persistence remains
pending; reloading replaces local state with the authoritative API snapshot.

## Shared direct Sales Order handoff — 21 October 2026

Implemented production-workflow models/processes/orders/jobs and permission-controlled
PM correction/approval and Store Issue. New direct order/model/Job Card handoffs persist;
raw issues lock materials, check availability and write OUT atomically. Model revisions,
explicit output batches, request UUIDs and job versions protect scope and retry behavior.
Still pending: migration of illustrative/quotation-conversion orders, shared persistence
for later production/QC/finished dispatch, durable server-owned QC holds/release checks,
order amendments/reversals and PostgreSQL concurrency verification. Existing auth,
purchase/GRN and manual procurement workflows are preserved.

## Goods Received Notes — 21 October 2026

Implemented persisted GRN list/create/detail, immutable receiver identity, partial
receipt/damage/shortage validation, PO locks, UUID retries and accepted finished-stock
receipts. New POs default to GRN; explicit immediate receipts remain protected from
subsequent GRN duplication. GRNs print through the browser. No payment, procurement
or raw-material posting is introduced. Still pending: receipt reversal/correction,
replacement/over-receipt approval rules, actual authorization workflows, supplier
master linking, other finished-stock movement persistence and PostgreSQL concurrency
verification.

## Purchase orders — 21 October 2026

Active adjacent Backend/erp persists purchases and their finished-goods Stock IN through
one atomic transaction, with decimal totals, server identity/status/number, UUID retry
protection and model permissions. Manual variants persist and can be selected on later
purchases. Finished-stock returns catalog and purchase receipts for refresh/reload.
Earlier drafts are not backfilled. Still pending: shared persistence for other finished
stock/dispatch movements, approval/amendment, supplier-master linking, tax/freight,
payment posting and PostgreSQL concurrency verification.

## Manual procurement tracking — 21 October 2026

Manual procurement stock is implemented in the active adjacent Backend inventory
app. Consumption rates calculate forecast coverage only; no elapsed-day deduction
occurs in API reads or frontend edits. Stock/date change only through explicit input.
Existing revisions and inventory-ledger separation remain intact. PostgreSQL
concurrency verification and opening-balance adjustment workflows remain pending.

## Procurement planner persistence - 17 October 2026

Implemented raw-material/consumption/procurement persistence in the active adjacent Backend/inventory app: immutable API movement posting, shared saved masters, server permissions, UUID retries and versioned plans. The separate monorepo Phase 1 backend is unchanged. Still pending: PostgreSQL concurrency verification, opening-balance confirmation/adjustment workflow, authoritative persisted QC holds/releases and any integration with production issues. Expected deliveries never post stock automatically.

## Persistent quotation drafts — 16 October 2026

Implemented durable editable draft storage and read/save endpoints using quotation view/add permissions and owner scoping. Optimistic versions plus row locking prevent stale overwrite; exact save replay is idempotent. Submitted snapshot IDs cannot be edited. Manager approval/delivery still uses immutable Quotation snapshots. Existing historical PDF snapshots without editor metadata are not automatically reconstructed as editable drafts. Full family numbering/lifecycle/conversion services remain pending.


## User roles and quotation rejection — 16 October 2026

Implemented accounts.Role (active named code and permission set), User.assigned_role, role permission backend, superuser-only /api/users/ and read-only /api/roles/. Seeded/mapped existing roles. Quotation reject action stores reason/actor/time with terminal snapshot guards; pending/all-submitted filters support the manager review inbox. Full immutable review-event history, quotation-family revision service and persistent editor drafts remain separate follow-ups.


## Editable quotation selling price — 16 October 2026

Frontend now supports explicitly entered custom selling prices with approved-source checks. The existing backend snapshot manager reviews final public prices; authoritative backend custom-cost source/override policy remains part of the pending full commercial service.


## Quotation units and line totals — 16 October 2026

Implemented erp.Unit and /api/units/ CRUD without deletion, active filtering, unique case-insensitive stable codes and default unit seed migration. Quotation snapshots validate active unit identity and store unit_id/code plus server-computed lineTotal and unitPriceInclVat. Product.unit remains the existing legacy text field; product/stock conversion services and normalized line tables are outside this change.


## Quotation manager approval and saved customers — 16 October 2026

Implemented snapshot submit, pending-manager list, manager-role/permission approval, and server-enforced delivery approval. Backend Customer now stores full quotation contact fields with generated codes/idempotent creation; quotations can link to the saved master. Full family revision/supersession, acceptance/conversion backend and production delivery configuration remain pending.


## Authentication session integration — 15 October 2026

The frontend now restores GET /auth/me/ identity and uses POST /auth/refresh/ for access expiry against the sibling Django backend. Invalid refresh credentials clear local tokens; outages retain them for retry. Mocked transport checks and browser demo refresh/logout are verified. Production authentication deployment, cross-tab refresh coordination and remote token revocation at frontend logout remain separate follow-up work.


## Implemented PDF delivery slice — 15 October 2026

The sibling `../Backend/quotations` app now exposes structured order extraction, public snapshot create/list/detail, native PDF, server PDF approval and selected-channel send endpoints. Email/WhatsApp submissions use configured SMTP/Meta transports with durable attempts and request replay protection. Setup is required before live delivery. This does not complete the proposed six-entity quotation lifecycle, backend custom-cost source checks, conversion or family revision service listed below. See `../Backend/quotations/README.md` for actual contracts.


Planned work, not implemented APIs or database design. Check items only after verified integration.

## Sales Orders

- [ ] Durable order/header/line persistence and authoritative order numbers.
- [ ] Shared customer, employee/marketing and finished-goods master integration.
- [ ] Persist requisition references, validate totals/units and define order status lifecycle.
- [ ] Link orders to job cards; decide whether external accounting export is required.

## Finished Goods Stock

- [ ] Authoritative variant master retaining source provenance and repeated identities.
- [ ] Confirm and persist optional pieces-per-package metadata independently of ledger quantities and units.
- [ ] Transactional Stock IN/OUT, validation, balances and movement audit history.
- [ ] Monthly reports and server-side demand projection.
- [ ] Reconcile unknown Packing openings/dates and ambiguous source records before import.
- [ ] Define cumulative reservations/allocation across competing orders.

## Consumables

- [ ] Persist consumable masters, categories, units, opening balances and stock movement audit history.
- [ ] Validate dates, positive quantities and posted unit/opening immutability server-side.

## Raw Material

- [ ] Master with specific Virgin Material grades, Recycled Granules and Ink.
- [ ] Durable Stock IN/OUT, balances, movement history and monthly reports.
- [ ] Confirm unknown openings, minimum levels and treatment of legacy demo granules.
- [ ] Link confirmed store issues/production consumption and recycling output to movements.

## Job Cards and Production

- [ ] Verify existing frontend read/stage-write expectations with actual server contracts.
- [ ] Persist per-card model/points routing, requiredMaterials, dynamic productionStages, approvals, handovers and stage waste.
- [ ] Supply authoritative BOM/points requirements and availability; define partial issue and replenishment rules.
- [ ] Enforce role permissions, chronology, immutable completed stages, units/conversions and transactional lifecycle transitions server-side.
- [ ] Persist durable activity history and prevent duplicate/replayed material issues or stock transfers.
- [ ] Resolve finished-goods variant references and post accepted quantity as Stock IN with job/sales-order/customer/model/product/batch references.
- [ ] Connect stage waste/recycling quantities to real Recycling transactions; keep quantities and units reconciled.

## Recycling

- [ ] Durable waste intake, collection, granule production and disposition records.
- [ ] Confirm restock/external sale rules and reconcile batch quantities with raw inventory.
- [ ] Supply accurate filtered summaries.

## Costing

- [ ] Durable costing records and manually entered exchange-rate history.
- [ ] Confirm local currency, cost/rate effective dates and authoritative calculation rules.
- [ ] Report write failures accurately; decide how rate changes affect existing records.

## Masters, Dashboard, Trace and Authentication

- [ ] Shared durable item/model/customer/supplier/department/user masters and validated relationships.
- [ ] Live role-scoped dashboard metrics; remove independent demo values.
- [ ] Trace history linked to real order/job/material/granule events.
- [ ] Verify real authentication, session restoration, token expiry/refresh and complete 401 cleanup.
- [ ] Enforce permissions server-side; navigation filtering is insufficient.
- [ ] Replace fallback/local success paths with explicit production error handling.

## Important Inventory Decision

Confirm the authoritative workflow before implementation:
Sales Order -> Job Card -> Production -> Store Issue -> Finished Goods -> Dispatch.

This is a decision checklist, not a proven posting sequence. Determine event ordering, exactly when demand becomes reservation, when raw materials are deducted, when finished goods are received/deducted, and how cancellation/reversal avoids duplicate posting.
Sales Order creation itself must not deduct stock. Current demand comparison creates no reservations.

## Sales fulfillment frontend boundary

[Sales fulfillment](sales-fulfillment.md) now demonstrates linked demand/jobs/receipts/reservations/dispatches/invoices in session state. Backend work must supply atomic posting and reversal operations, idempotency, reservation locking, authoritative numbering/master identity, persistent invoice snapshots and server permissions. No new endpoints or API contracts are claimed. Confirm QC/locations/BOM yields/tax/credit notes/cancellations and partial stage rules before production use.

## Custom costing and routing integration

Persist revisioned models, line-linked estimates and immutable financial/routing snapshots with independent customer response. Enforce role/revision/concurrency checks server-side. Integrate atomic raw-material issue/consumption, actual process/expense costing and exact finished-variant configuration. Persist idempotent QC receipts and approved stage history without losing the frontend references. No new endpoint or schema was implemented. See [detailed boundaries](custom-costing-routing.md).

## Client-confirmed target — 12 October 2026

One parent Job Card per Sales Order with durable item-level references and independent routes/units. Persist and enforce parent uniqueness, complete manufacturing scope, atomic approvals, audit history, item-level costing revisions and inventory source references. Migrate historical multi-card orders only through an authorized trace-preserving procedure. Manufacturing-only inclusion for mixed orders requires client confirmation. Frontend parent/item state is demonstrative.

The confirmed posting sequence is demand → parent Job Card → PM approval → material issue → sequential production → Supervisor/Manager finished approval → Finished Goods IN → confirmed dispatch/OUT. Production for stock requires no fabricated Sales Order. Reservations are not mandatory. Replace earlier reservation/QC decision placeholders with these confirmed rules when implementing their pending frontend/backend phases. Persist additional issues, batch/run history, authorized excess decisions, order amendments and atomic idempotent Stock IN/OUT with server roles and concurrency validation. No API/schema changes were made in this phase.

## Dedicated quality app — proposed contracts, not implemented

- [ ] Implement the canonical eleven QC entities/action audits and source FKs described in [quality.md](quality.md), reusing production/inventory/masters/accounts/reports/recycling ownership.
- [ ] Provide authoritative raw supplier/batch/receipt and production run/stage/finished-batch identity; preserve template snapshots and submitted findings.
- [ ] Enforce QC Inspector/Supervisor assignment scope, independent review, NC verification and separately mapped final FG managerial authority on the server.
- [ ] Implement atomic raw holds/releases, production checkpoint guards, cumulative batch authorization and inventory-owned idempotent Stock IN/OUT with concurrent hold rechecks.
- [ ] Implement proposed DRF actions, paging/filters/errors/version conflicts/idempotency and evidence/report storage; no QC endpoints are called by the frontend.
- [ ] Reconcile historical raw receipt QC/opening availability, seed IDs and manual import receipts before production deployment; never assume rejected material was returned or discarded.
- [ ] Supply eight photographs and resolve sampling/concession/partial-disposition/schedule/role/retention policies; implement native XLSX/PDF exports and scoped report scheduling if required.

The QC frontend now separates independent quality release, Production Manager/Admin FG authorization and Store stock posting. Earlier notes treating Store confirmation alone as acceptance describe superseded frontend behavior. All new states/actions are session-only; see quality.md for transaction boundaries and retry behavior.

## Quotation business logic in future sales app

- [ ] Persist the six quotation entities and immutable source/company/customer/terms/price/tax snapshots in [quotations.md](quotations.md), reusing Customer/Prospect/Product/Model/CostEstimate/SalesOrder/User/CompanySettings.
- [ ] Enforce exact revision/source/expiry/approval/customer-response policy and authorized numbering/manual prices on the server; printing/sending must not imply acceptance.
- [ ] Implement proposed DRF contracts, paging/filters/version conflicts and immutable public document projection; no quotation endpoints currently exist or are called by the frontend.
- [ ] Make conversion atomic and idempotent with one order per quotation family, adopted costing references, explicit prospect/customer linkage and audit/outbox. Never create Job Cards/stock/invoices at quote creation or conversion.
- [ ] Preserve inclusive/exclusive VAT/discount/rounding through order and partial/final invoice workflows using server decimals; define quantity/currency precision and adjustment/credit-note policy.
- [ ] Verify the two missing reference documents, company/bank/TIN/signatory, terms/credit/tolerance/expiry/acceptance evidence and conversion KPI policy; supply durable PDF/report/communications services if required.

## Integrated operations contract requirements — 15 October 2026

See the existing [integrated report](sales-fulfillment.md#future-backend-ownership-requirements-and-transaction-boundaries) for the canonical incremental contract, domain ownership and transaction boundaries. No new server endpoints/schema are claimed. Required capabilities: versioned product/model conversions, exact-unit thresholds and alerts/observed consumption; immutable pricing/LED/FX/VAT/profit snapshots and actual-cost evidence; grouped sales/operational aggregates; stable-ID trace lineage/exceptions; atomic execution-run accumulation/stage handover; source-idempotent quotation generation/review history; secure expiring/revocable revision-specific customer links; customer-safe PDF/email outbox/provider/status/retry history; QC schedule and occurrence generation/assignment.

Server must independently authorize actors, validate IDs/expected versions/request keys, recalculate decimal amounts/KG/balances, lock affected order/batch/stage/quality records and atomically publish ledger/audit changes once. Freeze historical financial/conversion snapshots. Failed dispatch/receipt/run/release/conversion must roll back. Durable QC holds and separate final stock authority cannot rely on React. Email uses authorized senders/provider idempotency/webhooks, never draft success as delivery. Customer access is narrowly projected and logged. Recurrence needs authoritative calendars/shifts/assignment and unique schedule/date/shift. Real raw consumption, material-batch allocation, expenses and confirmed order status/amendments remain gaps.

## Confirmed LED MAX / finance follow-up

Enforce client-confirmed `MAX(base×0.025, eligibleKG/1000×70×savedFX)` centrally. Percentage-base definition remains pending; keep explicit versioned configuration, product scope and VAT-on-LED. Reject missing weight/conversion/FX/date; no percentage fallback. Snapshot both alternatives/selected branch/rates/FX/date/conversion/base with costing revisions and accepted quotation/order records. Preserve history; allocate original LED across partial invoices with final Decimal reconciliation and no double VAT. Authoritatively validate source versions and permissions; do not trust client snapshots or migrate old financial amounts silently. Finance demo adds no backend: provision accounts credentials/permissions and real session handling through existing authentication integration. See the canonical report for details.
# Existing-item manufacturing integration — 23 October 2026

The adjacent Backend enforces known zero persisted finished-goods balance for existing
manufacturing items at order save and Job Card allocation. Persisted balance includes
opening quantities and purchase/GRN receipts. Unify browser-only finished movements
and reservations with server stock before treating frontend available quantities as
an authoritative shared balance. No automatic shortage split is implemented.

# Manual Job Cards — 23 October 2026

POST /api/production-workflow/jobs/ now persists manual production-for-stock jobs
without orders, with creation-key idempotency, existing model/routing/stock validation
and existing Receptionist/Admin allocation permissions. Nullable order references
and manual request IDs require migration 0014. PM edits handle a manual creation-date
baseline. SQLite workflow tests pass; PostgreSQL concurrency and browser QA remain
unverified. Production/QC/finished receipts retain existing integration boundaries.

# Automatic order quotations — 23 October 2026

Implemented atomic workflow-order to QuotationDraft generation, retry reuse, source
quotation conversion exclusion, persisted cross-links and LED-aware document totals.
Migration quotations/0006 grants Receptionist/Admin view/add quotation access. Verify
remote deployment, shared company-settings persistence, PostgreSQL concurrency and
end-to-end browser review/printing. Existing orders are not automatically backfilled.

# Persisted Job Card costing — 23 October 2026

Implemented automatic plannedCosting snapshots and jobs/{id}/costing/ plus
jobs/{id}/approve-costing/ actions under existing job visibility/PM authority, with
explicit editor roles, scope/version checks, calculation, revision history and
approval locks. New job approval requires approved item costing. Legacy pending
jobs can explicitly create sheets; historical approved data is preserved. No schema
migration. Actual consumed quantities, operator waste, actual machine prices and
final actual-cost persistence remain separate work. Browser-print QA, PostgreSQL
concurrency and deployment remain unverified.
# Stock OUT sales form boundary — 23 October 2026

The frontend now supports atomic multi-line sales dispatch from Stock OUT and saves
new stock-only Sales Orders/quotations through the existing API. Finished movement/
dispatch/commercial snapshots remain session-only. A future backend integration must
post all lines atomically, preserve request IDs and commercial snapshots, recheck
permissions/current and dated batch balances/QC/order remainder, and make failed
network retries recoverable without losing or duplicating Stock OUT. No new dispatch
endpoint was introduced by the form change.


## 29 October 2026 — Labour Job

Labour Job Module 3 is integrated with versioned shared entries and `/api/recycling/labour-jobs/report/`; no migration required. PostgreSQL concurrency and deployment verification remain pending. Billing and stock posting are outside the supplied reference.


### 29 October 2026 - Labour Job options

Labour Job reusable material/colour catalog integrated through labour-job-options. No migration required; PostgreSQL concurrency remains unverified.


## 29 October 2026 - In-house waste delivery

Module 4 report and shared-entry integration implemented; no migration required. PostgreSQL concurrency, browser interaction and deployment verification remain pending. See [scope](inhouse-waste.md).


### 29 October 2026 - Custom waste items

Module 4 custom waste catalog, quantity/rate maps and export are integrated with existing shared-entry permissions. No migration; PostgreSQL/browser verification pending.

### Finance Analysis integration — 30 October 2026

Completed locally on 30 October: actual journal-based customer profitability, bounded/audited customer expense assignment, automatic canonical customer dispatch COGS, uninvoiced sales/purchase commitments and voucher journal payment-account detail. Apply accounting migration 0005_costassignment when deploying. Remaining operational work: PostgreSQL concurrency verification and real client-data reconciliation/cost allocation. Commitments use current order scope; fully historical order revision reconstruction and general production completion costing remain separate workflows.

### Accounting masters integration — 30 October 2026

Implemented adjacent Backend persistence and frontend selection for groups, ledgers, cost categories, currency definitions and custom voucher types, including controlled existing-ledger group membership and grouped/category reports. Deployment requires 0006_finance_masters after 0005. Outstanding operational verification remains PostgreSQL concurrency, actual server rollout and client-data reconciliation. Arbitrary new posting behaviors, variable currency precision, automatic voucher numbering, per-line cost-centre allocations and master rename/delete are not part of this create-master workflow.


## Approved dispatch settlement — 31 October 2026

Implemented customer-balance/options read and atomic cash/credit invoice/receipt posting through the existing inventory shared-entry save in the adjacent Backend. UI refreshes server-created invoice state. Remaining validation: PostgreSQL concurrent dispatch/invoice writers and deployed-server acceptance with reconciled accounting setup. This does not add direct sales or role grants.


### Quotation ledger selection — 31 October 2026

Implemented permission-scoped customer ledger identity choices and reused accounting customer-link for explicit selection in quotations. Backend and frontend checks pass; deployed acceptance and PostgreSQL concurrency remain pending.


### Valuation item units — 31 October 2026

Implemented Finance valuation item choices and catalog-unit validation, with case/whitespace compatibility and independent date errors. SQLite/API/frontend/fixture-browser checks pass; PostgreSQL concurrency and live reconciliation remain pending.


### Currency display metadata — 31 October 2026

Implemented creation validation/persistence/bootstrap fields and tested migration accounting.0007_currency_display_fields on disposable SQLite. Live migration/deployment and any future application to report/PDF formatting remain separate pending work.


### Detailed P&L — 31 October 2026

Implemented posted-journal company/customer detailed P&L API, stock/purchase supporting schedules, payment-type split and Admin account-section classification. Tests/UI checks pass. Remaining: deploy accounting.0008_account_pnl_section, PostgreSQL concurrency and live client reconciliation/classification. No automatic common-cost allocation or customer inventory ownership was added.


### Posted voucher PDF — 31 October 2026

Implemented permission-checked read-only PDF download for posted accounting documents, including date-consistent balances and allocations. API/UI/layout checks pass; deployment and live download acceptance remain pending. No new migration or dependency.
