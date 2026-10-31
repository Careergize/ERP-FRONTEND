# Development Status

## Visible Admin ledger actions — 31 October 2026

Finance → Masters → Ledgers now places Existing ledgers at the top with per-row Edit and Delete buttons for Admin. Edit fills the existing name/group editor, scrolls to it and focuses the name field. Delete requires confirmation and uses the existing saved name/group concurrency checks; cancel sends no request. Linked parties have Delete disabled. Other roles see the read-only list without action buttons. Existing backend guards still prevent deletion of built-in/used/linked ledgers and protect journal history. No backend authority or schema changes.

Validation: frontend TypeScript/build, Finance SSR including Admin/read-only ledger lists, and synthetic Chromium checks for row editing, name/group save, deletion cancellation/confirmation and refreshed list. Existing API lifecycle guards were not changed. Deployment/live behavior remains unverified.


## Voucher PDF download — 31 October 2026

Day Book → View voucher includes Download voucher PDF, pending/error state and a safe voucher-number filename. Authenticated GET accounting/vouchers/<id>/pdf/ renders the posted backend document using the existing ReportLab dependency and the same Finance read/schema checks. It returns a private no-store PDF attachment; unauthorized, missing or future-as-of records are rejected. The Day Book Through date is sent as asOf, keeping outstanding/unallocated amounts, allocations and reversal status consistent with the selected view. Current company/party/account labels are disclosed as such. Downloads never create or repost a voucher.

The PDF includes company, voucher type/number/date/status, party, cost category, transaction currency/FX, journal debit/credit totals in reporting currency, applicable items/rates/taxes, payment allocations, narration and source/audit references. Tables repeat headings across pages; text is escaped and wrapped, fonts are bundled where available, and page numbers are included. No dependency or database migration was added.

Validation: 61 accounting tests on disposable SQLite, including real PDF response/header/read-only checks, as-of allocation/reversal checks and access/not-found guards; Django check/drift; frontend TypeScript/build and Finance SSR. Synthetic Chromium checks download and inspect fixture PDF bytes/filename/asOf and exercise JSON-blob permission failures. A two-page backend-generated stress sample was rendered with Poppler, all pages visually inspected, and text checked with pypdf. Live downloads/deployment and PostgreSQL concurrency remain unverified. No live records changed.


## Day Book voucher visibility — 31 October 2026

View voucher opens a wide, scrollable native modal instead of placing details below the full register. The selected ID is compared as a string and resolved from the document collection. Voucher header, journal/payment accounts, items and allocations remain read-only. The shared confirmation component retains its normal defaults and adds an optional wide layout with a top close control; native modal focus/Escape behavior is preserved. No backend or financial changes.

Validation: frontend TypeScript/build and Finance rendering checks; Chromium synthetic Finance regression with a 61-row register verifies visible modal bounds, selected voucher/journal content, close/reopen, actual Escape key dismissal and payment-account-ledger navigation. Live deployed behavior remains unverified.


## Detailed company/customer Profit & Loss — 31 October 2026

Finance → Reports → Profit & Loss now offers Overall company or an exact customer ledger ID, uses the selected date range, and presents side-by-side trading/gross-profit and operating/net-profit sections. Groups expand into ledgers and their posted voucher/date/customer/cost-category amounts. Detailed CSV includes sections, account totals, voucher rows, warnings and supporting stock/purchase schedules. Mobile columns stack and inner voucher tables scroll.

GET accounting/detailed-profit-loss/ computes period income, cost of goods sold, direct expenses, indirect income/expenses, unclassified amounts, gross profit and net profit from posted JournalLine evidence, including dated reversals and cost assignments. Gross/net and section/group totals use Decimal on the server. Customer attribution matches the existing customer-profit rules (expense line parties; income line parties with document-customer fallback), preserving unassigned reclassification credits. Customer scope excludes company costs without customer attribution and exposes company-wide unassigned totals rather than allocating them implicitly. Same-name customer ledgers remain separate by ID. VAT/receivable opening balances are not P&L income. Foreign entries use posted reporting-currency values, not current FX.

Cash/credit sales breakdown uses only recorded dispatchPayment metadata tied to source invoices; older/unspecified sales remain explicitly unclassified. It is never inferred from current outstanding balances. Pending company posting events in the period warn that missing accounting entries are excluded. Classification/group/name changes affect presentation across all selected periods; journals remain unchanged.

The company report includes supporting posted stock opening/receipts/issues/closing schedules (by exact item and unit) and net posted purchase bills/reversals at saved FX. Perpetual-inventory COGS is already expensed, so these schedules are not added to profit again. No company stock or supplier bill balances are represented as customer-owned stock. Only posted valuation evidence is shown; unknown physical opening costs are not invented.

Apply accounting migration 0008_account_pnl_section after 0007. It adds optional Account.pnl_section metadata without rewriting financial amounts. Admin can classify income/expense accounts via Masters → Ledgers → Profit & Loss ledger classification. Standard 4100 sales and 5100 cost-of-goods-sold keep their fixed purpose; 4200 defaults to indirect income; other unclassified accounts remain visible with a gross-margin warning. Updates require an expected current classification and reject incompatible account kinds/stale updates. No new financial posting or role grants.

Validation: 58 accounting tests on disposable SQLite, including company/customer reconciliation to existing reports, FX/tax exclusion, group/voucher detail, opening/closing stock, non-double-counted purchases/COGS, reversals, cash/credit/unknown sale types, exact customer identity, partial cost assignment and classification authority; Django checks and migration drift; frontend TypeScript/build and Finance SSR. Synthetic Chromium checks cover company/customer P&L, voucher expansion, mobile overflow, classification save and existing Finance regressions. Synthetic layout screenshot visually inspected. Live migration/deployment, client-data reconciliation and PostgreSQL concurrency remain unverified. No live records changed.


## Currency creation display fields — 31 October 2026

Finance → Masters → Currencies follows the supplied field reference: Symbol, Formal name, ISO Currency Code, Number of decimal places, Show amount in millions, Suffix symbol to amount, Add space between amount and symbol, Word representing amount after decimal, and No. of decimal places for amount in words. The form previews numeric/words output and the register displays saved settings. Display and words precision are independent integers 0–6. Flags require booleans; decimal word is optional, up to 100 characters. Admin-only creation authority and duplicate ISO-code rejection remain.

Currency stores decimal_places, show_in_millions, suffix_symbol, space_between, decimal_word and words_decimal_places. Apply accounting migration 0007_currency_display_fields before serving the updated Finance APIs. Existing currencies get two decimals, prefix/no-space/no-millions and blank decimal-word defaults. No financial documents, balances, FX rates or reporting currency are rewritten. Preferences currently affect the master preview/register only; existing reports, PDFs and posting calculations retain their existing behavior/two-decimal precision. Changing report presentation is separate scope.

Validation: 53 accounting tests on disposable SQLite, including roundtrip/defaults/invalid types/ranges/authority and unchanged journals/book currency; Django checks and migration drift; frontend TypeScript/build, Finance SSR, currency-display helper checks and synthetic Chromium Finance checks covering all creation inputs and saved settings. Migration was tested on disposable databases only; deployment, live migration and PostgreSQL concurrency remain unverified.


## Automatic valuation units and case compatibility — 31 October 2026

Finance → Valuation selects a saved finished-good/raw-material item (or an existing legacy valuation identity), shows its exact ID, automatically fills a read-only unit, and displays the latest valued movement date. GET accounting/valuation-items/ uses existing Finance read authority and exposes catalog unit versus stored valuation unit. Server valuation checks enforce known catalog units. Unit comparisons ignore surrounding whitespace and capitalization only (Ctn/ctn); they do not convert or equate different units. Existing StockValue.unit labels, journals and quantities are not rewritten. Genuine mismatches require reconciliation. Date validation now reports its own message and latest date, separately from unit mismatch.

Validation: 51 accounting tests on disposable SQLite, including queued Ctn/ctn dispatch, repeat-post protection, wrong-unit rejection, unchanged physical stock, historical-unit preservation and separate date errors; Django checks/drift; frontend TypeScript/build and Finance SSR; Chromium synthetic desktop/mobile Finance checks including automatic read-only ctn/kg and posting the selected unit. No migration needed. PostgreSQL concurrency and live deployment remain unverified. No operational balances or historical records changed.


## Stock IN readiness — 31 October 2026

Stock IN waits for the shared inventory ledger to hydrate and be writable. The Stock page exposes shared-load failures and a retry action; the modal also blocks submission while its save prerequisite is unavailable, retaining entered form values. Demo profiles get a real-account requirement. This prevents the form from reaching an uninitialized shared setter; it does not claim to repair an unavailable remote service. Frontend TypeScript/build and shared-entry checks pass. Live backend loading remains unverified.


## Stock IN role consistency — 31 October 2026

Legacy active superusers with no assigned role and the default receptionist role now resolve to Admin in User.effective_role, matching the pre-existing login/profile display. Explicit assigned roles, including inactive role denial, take precedence. This resolves the reproducible case where the UI offered Admin Stock IN but operational checks saw Receptionist. No database role assignments, ordinary-user permissions or operational role mappings are changed; no migration required.

Operational permission errors now identify the effective role and action. Shared-save state retains HTTP status so a 403 explains permission recovery instead of displaying the 409 conflict instructions. Pending entries remain exportable and are not silently discarded.

Validation: 78 accounts/operational/shared-entry/accounting tests on disposable SQLite, including legacy-superuser Stock IN and assigned-role/inactive-role denial; Django checks/drift; frontend TypeScript/build, shared-save failure/status/export/reload checks and auth checks pass. Deployed account diagnosis and PostgreSQL concurrency remain unverified. No live account or stock records changed.


## Dispatch stock availability messages — 31 October 2026

Sales dispatch now shows overall and selected-batch stock after reservations. Allocation failures identify the product, requested quantity, overall availability and batch availability; unknown balances have a separate message. Existing quantity, reservation and dispatch guards remain unchanged. Frontend TypeScript/build and fulfillment checks pass.


## Quotation customer ledger choices — 31 October 2026

Quotation Customer / prospect now refreshes saved ERP customers on editor mount and has Refresh Customers & Ledgers. Linked ledger customers use the existing ERP customer list. Finance-only customer ledgers appear separately by ledger ID. Admin/Accounts users with ERP customer creation permission can explicitly Link ledger & select customer, preserving the original accounting party/history and attaching its new canonical customer ID to the quotation. Other customer-view users can see ledger identity and request linking from Finance. No name matching or automatic linking on read. Saving is blocked until a selected finance-only ledger is linked or replaced with a saved customer/prospect.

GET customers/ledger-options/ requires ERP customer view permission and returns unlinked customer ledger IDs/names and a canLink flag, never balances. The link operation reuses the existing accounting customer-link authority and UUID retry behavior. Inactive linked customers remain excluded by the active ERP customer query. Ledger choices load independently: a ledger-read failure does not remove saved customer options. No new database model/migration or role grants.

Validation: 47 accounting tests including ledger-choice permissions, explicit linking, same-name separation and existing settlement tests; Django check/drift; frontend TypeScript/build and customer/quotation/persistence scripts pass. Browser interaction, PostgreSQL concurrency and deployment remain unverified for this change. No live client records changed.


## Sales dispatch location — 31 October 2026

Moved the sales dispatch dialog and Stock OUT entry point to Sales Management. It defaults to approved existing orders and retains balance/cash-credit settlement. Stock only offers Stock IN/approved batch receipt actions; sales and non-sales OUT entry buttons are removed. Historical OUT movements remain visible in stock reports. Real dispatch is separate from Sales return/credit previews and disabled in the example workspace. Frontend build, Sales checks and synthetic Chromium settlement checks pass. No backend authority changes or deployment.


## Cash/credit at approved-order dispatch — 31 October 2026

Stock OUT now shows the approved order customer's current posted balance and cash/credit choices for Admin/receptionist. Stable customer IDs map the invoice and receipt to the correct ledger. Dispatch, operational invoice and accounting settlement save atomically; Cash records a full receipt, Credit leaves the invoice outstanding. Existing quotation/approval and role limits remain. 69 backend regressions, frontend build/fulfillment and synthetic Chromium form checks pass; PostgreSQL concurrency and deployment remain unverified. See the adjacent Backend/accounting/README.md for scope.


## Sales navigation icon — 31 October 2026

Added a shopping-cart icon beside the Sales sidebar label, matching the size and alignment of other navigation items. Frontend TypeScript/build and Sales checks pass.


## Ledger editing and deletion — 31 October 2026

Finance → Masters → Ledgers has an Admin-only editor for ledger name and compatible group. Ledger code/ID, accounting classification, cash/control behavior and ERP source link cannot be edited here. A linked ledger rename changes its accounting label only; it does not rename the ERP customer/supplier. Name/group changes affect report presentation across periods without rewriting journal rows. Requests include the previously read name/group and reject stale edits.

Admin can delete unused custom general ledgers and unlinked customer/supplier ledgers after confirmation. Protected financial references block deletion even for zero balances. Built-in/control accounts, the configured LED account and ERP-linked parties cannot be deleted. An unresolved posting queue blocks deletion because queued payloads may reference a ledger. No automatic deletion of customer masters, transactions or balances is provided.

Existing POST masters routes accept ledger-update and ledger-delete; both enforce Admin authority. No migration is required. Validation: 38 accounting tests on disposable SQLite, Django checks and migration drift, frontend TypeScript/production build and thirteen-section Finance rendering check. PostgreSQL concurrency, browser interaction and deployed-server behavior remain unverified. No deployment or operational database changes performed.


## Finance customers in Sales — 30 October 2026

Finance → Masters → Ledgers can create a linked ERP customer alongside a new customer ledger (requires customer creation permission). Existing finance-only customer ledgers can link to a selected active ERP customer by ID, or create one. Links preserve the ledger and journal history; conflicting existing links are rejected. Existing ERP customer selection requires customer view permission. Creation retries use a UUID to avoid duplicate customers.

Sales’ customer filter now includes active ERP customers without invoices and offers Refresh customers. Sales Orders and quotation customer choices should be reloaded after linking. Invoice projections normalize `db:` customer IDs to the same stable filter key.

Validation: 35 accounting tests on disposable SQLite, Django check/migration drift, frontend TypeScript/production build and Finance/Sales scripts pass. PostgreSQL concurrency and deployed-server behavior remain unverified. No deployment or operational database changes were performed.


## Sales sidebar and internal tabs — 28 October 2026

Sales now has one sidebar entry and internal Dashboard/Ledger/Returns/Credit Notes tabs. Existing deep links, role limits and workspace state remain. Common and status filters persist per tab. No Sales business calculations or backend changes. See [layout verification](sales-management.md#sales-sidebar-and-tabs-layout-update).

## Sales approval, QC and print continuation — 28 October 2026

Sales continuation: contributor-based independent review now applies even to Admin; QC profiles can inspect returns without financial approval or stock posting. Credit-note documents reuse browser Print / Save as PDF with DRAFT/approved-preview labels; official issuance remains disabled. See [Sales module](sales-management.md).

## Sales Management frontend — 28 October 2026

Added a frontend-only Sales workspace at /sales with dashboard, ledger, sales returns and credit notes. Saved invoices are read-only inputs; new adjustment documents/approvals are explicitly session-only previews. Explicit examples are opt-in. Receivables and automated PDF remain pending. See [Sales module](sales-management.md).

## Spares independent opening approval — 28 October 2026

Spares independent opening approval is implemented on the isolated feature branch. Pending proposals leave stock unknown; a different explicitly authorized user must approve. Production rollout, migration and permission assignments remain unapproved. See [implementation, exact files and verification](../../backend/inventory/SPARES_OPENING_APPROVAL.md).

## Catalogue backend integration — 28 October 2026

Consumables production views now use catalogue APIs; Spares IN/OUT uses its existing endpoint with model-permission checks. Backend/JWT/migration/concurrency and frontend checks pass in isolation. Shared migration, role grants, deployment and browser acceptance remain pending. See [implementation and validation](../../backend/inventory/CATALOGUE_INTEGRATION.md).

## Separate Spares and Consumables — 28 October 2026

Separated active Consumables categories/views from Spares. Two existing demo spare records remain read-only for migration review; the dedicated Spares register is untouched. See [scope and verification](consumables-frontend.md#spares--consumables-separation--28-october-2026).

## Consumables auto-code and audit preparation — 28 October 2026

Added provisional category codes, read-only identities, movement references and local Activity History; all 24 frontend checks passed. Saved Register creation retains its existing API contract. See [scope and verification](consumables-frontend.md#auto-code-and-audit-preparation-follow-up--28-october-2026).

## Consumables frontend — 28 October 2026

Consumables retains the saved API register and adds ten isolated demonstration views. Build and all 24 frontend checks pass; browser verification remains pending. See [scope and validation](consumables-frontend.md).


## Finance and accounting — 27 October 2026

Added `/finance` and the Accounts home workspace backed by the adjacent Backend's
accounting app: journals, party ledgers, receipts/payments/advances, item allocations,
PO-matched supplier bills, expenses, cash/bank, valuation, report filters/CSV exports
and automatic source posting with an explicit missing-input queue. Setup/opening
balances, deployment and PostgreSQL/browser verification remain pending. Actual
manufacturing completion costing, partial credits/returns and advanced tax workflows
remain outside this release. See [implementation](../../../Backend/accounting/README.md).

## Recycling Module 2 — 26 October 2026

Recycled Materials now provides persisted daily bag entries, 40 kg/bag conversion,
monthly daily matrix, currency-separated values, corrections/voids, custom materials
and Excel export. Local API/build checks pass; remote deployment and browser review
remain pending. See [scope and validation](recycled-materials.md).

## Manufacturing sidebar navigation — 26 October 2026

Existing sidebar links now follow the requested manufacturing workflow groups. Accounts retains its existing route visibility and finance summary; QC roles retain their specialist section menu. Desktop/tablet navigation scrolls above the profile footer; small screens stack navigation above module content. Routes, permissions and module behavior are unchanged.

Validation: TypeScript/production build, all existing frontend check scripts, and navigation route coverage/uniqueness checks passed. Browser visual verification remains outstanding.

## Recycling Module 1 — 25 October 2026

Four-module selector added. Waste Purchases supports user-added backend material names, manual purchases, monthly summaries, corrections/voids and Excel/PDF exports. Module 2 is now implemented below its own scope; Modules 3–4 await their workflows. Local checks pass; deployment and PDF browser-download review are pending. See [module scope and validation](recycling-purchases.md).

## Supporting-record persistence — 25 October 2026

Supporting-record persistence is connected for QC drafts/configuration, costing drafts/policies/rates, commercial settings/prospects, inventory controls, generic reference masters and author-scoped quotation workspaces. Immutable saved versions are available in Entry History. Operational posting remains incomplete.

Scope, pending authority proposal, verification and limitations: [persistence status](../../../Backend/PERSISTENCE_STATUS.md).

## Action spacing across pages — 25 October 2026

Audited button groups across the frontend. Added missing gaps and wrapping to Stock/Recycling category tabs, page action rows, modal footers, register pagination and quotation controls. Mixed-content QC, quotation and job-card forms now give inline actions consistent separation. Sidebar navigation retains its separate sizing. Validation: TypeScript/build and emitted Tailwind CSS checks; browser visual verification remains outstanding.

## Consistent button sizing — 25 October 2026

Shared screen styles now use 38px minimum action heights, compact 32px table actions, and explicit 36px square icon controls. Action links share button sizing; long labels wrap, form-grid actions avoid stretching, and full-width 48px sign-in controls remain supported. Existing green action colors and print styles are retained. Sidebar navigation uses a separate full-width 44px minimum row size with left-aligned labels and fixed 18px icons; sign-out uses a 40px row.

## Quotation approval creates fulfillment — 25 October 2026

For saved quotation-editor revisions, manager approval now atomically creates an approved Sales Order from the exact reviewed commercial snapshot. Existing-stock lines retain their finished-goods variant and create no Job Card. Custom manufacturing lines create a linked Job Card in PendingApproval, including the saved model recipe, route and planned costing. Mixed orders create manufacturing children only for custom lines. Managers must confirm a delivery date for manufacturing; an active customer master, saved stock variants/model revisions and valid recipe/route are required. Failed preparation rolls back approval and order creation. Retries reuse the same order and Job Card. Approval does not deduct stock, issue material, approve production or send messages. Existing dispatch checks remain in force.

Approval responses expose the linked order and whether a manufacturing delivery date is required; the manager view shows the order link and fulfillment result. Creator lists recover the linked order on reload. Legacy standalone PDF snapshots without an editor draft retain approval-only behavior; order-origin quotations do not create duplicate orders. No historical approvals were backfilled. Customer-response recording remains separate; it is no longer a prerequisite to this approval-triggered order creation path.

Validation: frontend TypeScript/build and quotation/persistence checks; 5 focused approval-fulfillment tests plus 25 existing quotation/draft/account tests on disposable SQLite. PostgreSQL concurrency was not exercised.


## Manager quotation history — 25 October 2026

The Quotations tab shows all submitted quotations to authorized managers by default, including approved and rejected records. Manager filters support Pending, Approved, Rejected and All submitted. Existing backend approval permissions and access scopes are retained.

## Quotation approval submission — 25 October 2026

The primary Save Quotation action saves and submits a completed quotation for manager approval through the existing API. An explicit Save Draft action preserves incomplete work. Lists show status badges including Pending, Approved and Rejected, and existing drafts have Submit for Approval. Existing source/costing validation and manager permissions still apply; failed submissions stay Draft with an error.

Spares are independent of Procurement (user clarification, 25 October 2026). Spare stock posting permissions must be defined separately; Procurement approval mapping is not a prerequisite. Posting remains disabled until those spare-specific permissions are confirmed.

## Local workflow and registers update — 23 October 2026

Separate API-backed Spares/Consumables registers are implemented locally; stock posting and operational approvals remain blocked. Earlier quotation-first/automatic-allocation notes below are superseded by the user decisions recorded in the implementation report.

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
Local verification: frontend typecheck/build and quotations, sales fulfillment,
custom costing, inventory workflows and integrated operations checks passed.
The 39-test workflow/quotation regression suite and separate Admin approval test
passed. Django system checks and migration drift check passed; migration applied locally.


## Automatic numbering and customer-type charges — 23 October 2026

Stock OUT and New Sales Order display read-only server-assigned order numbers. New
direct orders use the backend SO-W sequence and exact retries retain their number.
VAT/LED controls and summary rows are visible only for B2B. Selecting B2C clears
LED input/snapshots and excludes VAT/LED from totals and submission. The backend
also strips those charges from new direct B2C orders and generated quotations while
preserving the original creation request for retry comparison. Existing order and
accepted quotation snapshots are not rewritten. B2C Stock OUT snapshots exclude
charges while retaining the source order’s entered item rates.

## Stock OUT sales-entry form — 23 October 2026

Stock → Stock OUT opens the supplied sales-style layout with order/date/customer,
marketing person, B2B/B2C, requisition, multiple item/quantity/unit/rate/amount rows,
subtotal, VAT, LED and total. Receptionist/Admin can create a stock-only sale; Store
can select existing orders. Existing commercial rates/header fields remain locked;
partial quantities and batches can be selected. New sales save the Sales Order and
automatic quotation through the existing API before dispatch. Retry retains a saved
order if dispatch subsequently fails. Delivery challan/destination and batch/date/QC
checks remain required. Transfers/waste/adjustments use Non-sales Stock OUT.

All selected dispatch lines are checked before publishing any ledger movement, with
duplicate request/commercial-snapshot protection and no outstanding reservation.
Commercial snapshots retain the entered header, quantities, prices and tax/LED totals
on dispatches/movements. Existing order discounts are apportioned by selected value;
these snapshots are not posted invoices. Inclusive-price LED checks use net-of-VAT
selling value. The finished dispatch ledger remains session-only and explicitly says
so in the form; backend dispatch persistence is still outstanding. The Stock OUT form
does not upgrade that boundary or create manufactured stock.

## Job Card → planned costing → PM approval — 23 October 2026

Every newly allocated workflow Job Card item now stores a plannedCosting draft in
the same backend transaction, including manual production without an order. The sheet
uses exact required materials and required process stages; missing prices/rates remain
incomplete. Sales Order/manual Job Card screens link directly to Job Card Costing.
Costing editors can save/recalculate in Django; PM/Admin approves each item’s costing
before Job Card approval. Material/routing corrections create a new costing revision,
preserve prior approval history and require review again. Job version and costing
revision checks reject stale saves. Approved/issued jobs lock costing changes.

The sheet supports explicit USD/UGX prices/exchange rates, purchase VAT-inclusive
prices divided by (1 + rate), separate material/ink lines, per-stage costs, overheads,
10/15/20/25% markup comparisons, sales VAT and conditional Higher-of-the-Two LED with
eligible weight, dated USD→UGX rate and declared percentage base. It does not copy
the reference’s inconsistent overhead totals or fixed 3% waste. Actual wastage remains
operator-entered; actual final costing is unavailable until actual inputs are recorded.
Print/Save PDF uses the costing tab. Model save retains production output as its
default unit; saved model choices display output quantity/unit. Sales entry shows VAT
and LED separately, with VAT inclusion labeled. Existing approved jobs are preserved;
legacy pending jobs can explicitly create a costing sheet. No schema migration needed.

Thirty-nine combined backend workflow/quotation tests, Django checks and migration
drift checks pass on SQLite. Frontend build and costing/sales/quotation checks pass.
Browser printing, PostgreSQL concurrency and remote deployment remain unverified.

## Automatic Sales Order quotation — 23 October 2026

New workflow Sales Orders create a linked editable quotation draft in the same backend
transaction. Repeated order requests return the same quotation; quotation-to-order
conversion retains its original quotation. The order detail provides preview/print
and review links; the draft is restored in the normal Quotations list. Prices, units,
currency, VAT basis, discount, customer contacts and LED snapshots come from the saved
order. Direct entry now explicitly selects VAT-inclusive/exclusive rates. Company
settings are snapshotted from the form; API-only callers use existing Navapack defaults.
Template defaults are 14-day validity/delivery, 30-day credit and ±10% quantity wording.
Approval/sending are separate actions; no stock or extra Job Card is created by quoting.
Migration quotations/0006 grants Receptionist/Admin quotation view/add and is applied
locally. Thirty-seven backend workflow/quotation tests pass on SQLite. Frontend build
and sales/quotation regressions pass; the existing PDF template was rendered and visually
checked. Remote deployment and browser interaction are unverified.

Product/routing entry no longer asks for predefined waste percentages. Newly saved
model revisions omit those editor defaults and new costing drafts start without an
inherited model waste allowance. Actual stage/run waste remains operator-entered;
existing production persistence limits still apply.

Job Card creation derives its displayed output unit from the selected existing
product or model production output (legacy batch/default fallback). Model/product
unit mismatches are reported before submission; Sales Order manufacturing uses the
same model output precedence. No unit conversion is assumed.

## Manual Job Cards without Sales Orders — 23 October 2026

Job Cards now has a Create Job Card button for Receptionist/Admin. The form accepts
a manual product or zero-stock existing variant, saved model recipe, quantity, due
date, specifications and per-job routing. POST production-workflow/jobs/ persists a
production-for-stock parent and child without creating a Sales Order. UUID retries
are idempotent; changed retries conflict. PM correction/approval and Store issue reuse
the shared workflow. Migration 0014 is applied locally. Fourteen backend workflow
tests, Django checks and migration drift checks pass on SQLite. Later production/QC
and finished receipts retain their existing browser-state limitations.

## Existing-item Job Card entry — 23 October 2026

Manufacturing entry now explicitly offers manual custom products or existing variants.
Existing variants require known zero available stock and manufacture the ordered
quantity. Backend validates persisted stock at creation and deferred allocation.
Twelve workflow tests pass on SQLite; Django checks and migration drift checks pass.
Finished-goods browser movements/reservations remain separate from persisted backend
opening balances and receipts; PostgreSQL concurrency and browser interaction are unverified.

## Sales Order options error reporting — 23 October 2026

Production workflow 404 responses now explain the missing endpoint and API deployment
configuration instead of displaying server HTML. Other HTML error pages show a concise
HTTP error; structured validation remains visible. TypeScript/build, sales fulfillment
and production workflow error checks pass. The local adjacent Backend defines
`/api/production-workflow/order-options/`; remote availability could not be verified
because outbound access was blocked. Resolving a deployed 404 still requires checking
the configured API target and deployed Backend routes.

Frontend API configuration now targets https://35.175.179.96/api by default.
VITE_API_BASE_URL still overrides the default. Remote HTTPS and CORS readiness have
not been verified by this configuration change.

## Manual Job Card workflows and machine master — 21 October 2026

Processes & Machines is a separate menu for Receptionist/PM/Admin. Saved machines
declare supported processes and persist in the active Backend. Each manufacturing
Sales Order item can add/remove/reorder its own workflow and assign compatible
machines. Model routing is an optional starting template; recipe requirements still
use the saved model output batch. Per-order planned quantities are not batch-scaled.
PM can correct the saved Job Card before approval; approved routing stays locked.
Migration 0013 applied; build, sales/quotation checks and 10 backend workflow tests pass.

Navigation starts with Dashboard, Purchase Orders, Sales Orders and Goods Received
Notes in operations and finance, subject to existing role visibility. Verified by
TypeScript and production build on 21 October 2026.

## API-only Sales Orders — 21 October 2026

Sales Orders load exclusively from /api/production-workflow/orders/. Sample records
and local creation fallback are removed. List/detail reload from the server and show
explicit loading, retry and empty states. Creation options come from order-options/
and finished-stock APIs. Quotation conversion now persists the shared order and its
quotation references, with retries deduplicated by quotation identity. This supersedes
the earlier frontend-only quotation-conversion limitation; later production/QC and
commercial document editing still have their existing persistence limits.

## API-only Job Cards — 21 October 2026

JobCardsContext now loads exclusively from /api/production-workflow/jobs/. Removed
sample-card merging, legacy detail fallback, local Job Card allocation and reuse of
locally modified cards in place of fresh API results. Direct detail navigation reloads
API data; errors clear stale cards and show Retry rather than not-found/sample content.
Empty responses show a genuine empty state. Demo accounts must sign in to load cards.
Allocation requires a saved shared Sales Order and confirmed backend response. Existing
API records are preserved. Build and sales/integrated workflow checks pass.

## Shared Sales Order → Job Card → Store Issue — 21 October 2026

New direct Sales Orders save in the active adjacent Backend through production-workflow
APIs. Receptionist/Admin choose stock or manufacturing per line and optionally allocate
one parent Job Card for manufacturing items only. Model recipes and explicit production
output per batch calculate required materials; selected ordered processes become the
job's stage snapshot. Costing is not required for this direct workflow. PM corrects
pending requirements/routing, approves the parent and forwards it to Store. Store issue
validates current physical raw balances and records Raw Material OUT atomically. Job
queues reload on focus/every 30 seconds while visible. New models/processes/revisions
and handoff states survive staff sign-in/refresh; earlier illustrative records and the
quotation-conversion prototype retain their existing frontend behavior. Later production
runs/QC/finished-goods dispatch are not included in this new persistence boundary.

Django checks/migration drift, all 80 backend tests, frontend build and existing sales,
custom-costing, inventory, integrated-operations, QC and procurement scripts pass.
Focused tests cover actual Receptionist → PM → Store sessions, corrections, scaled
recipes, separate product routes, stock-only/mixed orders, stale saves and invalid issue.
Local SQLite was exercised; PostgreSQL concurrency and browser interaction were not.

## Goods Received Notes — 21 October 2026

Added GRN list/search, PO-linked entry and printable detail views directly below
Purchase Orders. New POs default to awaiting GRN; explicit immediate receipt remains
available. GRNs add received minus damaged quantities to finished-goods Stock in the
same transaction, with partial receipts, missing-item reports, immutable receiver
identity, declared authorized-person name and UUID retries. Stock links to its GRN/PO.
Already-posted immediate purchases cannot be received again. Existing entries are
preserved. Raw Material and manual procurement tracking are unchanged.

Django checks/migration drift, all 74 backend tests and frontend build pass. Tests
cover partial receipts, shortages, damaged goods, duplicate and changed retries,
over-receipts, cross-PO items, authorization and atomic rollback. Local verification
uses SQLite; PostgreSQL concurrency and browser printing were not exercised.

## Purchase orders — 21 October 2026

Purchase Orders now has list/search, entry and detail views alongside Sales Orders.
Real users save purchases in the active adjacent Django Backend/erp; demo users are
prompted to sign in. Captures supplier and delivery information, currency, payment
terms, notes and multiple item quantity/unit/price rows. Each line offers From stock
or Manual entry. GRN receiving adds accepted quantities to finished-goods Stock, and
manually added variants become selectable on later purchases. Received purchases and
their stock receipts reload from Django; raw-material stock remains separate. Earlier
draft purchases are retained without retroactive posting. Unknown source openings
remain unknown; new variants start at zero before their first purchase receipt.
Other finished-goods manual/production/dispatch movements retain their session behavior.
Django checks, migration drift and all 66 backend tests passed, including atomic rollback,
manual/existing receipts, reload, exact units, permissions and retry checks. Frontend
build and finished-goods/inventory/fulfillment/integrated checks passed. Verification
used the configured local SQLite database; PostgreSQL concurrency was not exercised.

## Raw stock autofill on grade selection - 17 October 2026

Selecting a grade for a new procurement plan now prefills Stock in Store from its current Raw Material balance (opening + IN - OUT), supplied by the procurement API with one aggregate query. Known zero stays zero and unknown opening stays unknown. A saved plan keeps its manually entered balance, including an explicitly unknown balance; only new plans prefill from Raw Material for review. Raw receipts/issues are not changed by selecting or saving a plan. Frontend build and procurement checks pass; all 15 inventory API/migration tests pass.

## Current stock in procurement editor - 17 October 2026

Stock in Store in the procurement editor now starts with today’s remaining procurement balance after elapsed daily consumption, both on initial open and material selection. The stock date starts at today, so saving the unchanged quantity cannot apply past consumption again. Unknown stays blank and zero remains visible. Added checks for 100 becoming 95 after five days, then 94 the next day after saving the current balance, with original input unchanged.

## Procurement stock field visibility - 17 October 2026

Moved the editable Stock in Store input into a prominent stock-entry section immediately below the material selector, with an explicit accessible label, quantity placeholder and stock date. Browser verification of the actual editor component in an isolated local fixture confirmed the kg field is visible, accepts 100, and updates remaining stock and coverage previews. Frontend build and procurement calculations pass. No real stock record was changed during this UI check.

## Manual procurement tracking — 21 October 2026

Daily and monthly consumption are manually entered planning figures only. Saved stock
stays exactly as entered, regardless of elapsed days, refreshes or consumption-rate
changes. Coverage = entered stock / daily consumption; estimated stock-until and
order-by dates start from the saved stock date. Editing preserves that quantity/date
until manually changed. New plans may prefill raw stock for review; saved zero/unknown
stock remains zero/unknown. Planner saves never post Raw Material or finished-goods
movements. Expected deliveries only affect forecast coverage.

Frontend build and procurement checks pass; Django checks, migration drift and all 16
inventory tests pass on the configured local SQLite database. No schema change or
migration is required.

## Procurement plan entry - 17 October 2026

The planner now has a visible Add procurement plan action and an existing-material selector. Its editor accepts daily or monthly consumption, synchronizes the other value using consumption days, previews live stock/coverage/depletion/order-by dates, and saves comments and the default 75-day cycle through the existing confirmed database API. The table matches the requested workbook labels, with a separate Comment column and cycle length plus next-order date. Build and procurement calculation checks passed.

## Procurement planner persistence - 17 October 2026

Raw Material and Procurement only: added dedicated ProcurementDelivery and ProcurementPlanRevision models alongside existing materials, movements and plans. Database migrations preserve existing expected deliveries and current plan snapshots; changed saves retain audit history, including removed delivery contents. Added read-only Django Admin listings. Full backend suite passes 54 tests, including 11 inventory/migration tests; Django checks, migration drift and frontend procurement/inventory regressions pass. No other ERP module is brought into scope. SQLite verified; PostgreSQL concurrency remains untested.

## Persistent quotation drafts — 16 October 2026

Save Draft now writes owner-scoped QuotationDraft records through /api/quotation-drafts/ and awaits a confirmed database response before reporting success. Real sessions load all saved drafts after login/refresh; edit/detail routes wait for loading. Editor metadata retains product/model/costing references, unit identity, prices, contacts and terms. Server snapshot review state reconstructs pending/approved/rejected/sent status. Repeated edits use row versions, conflicts return 409, and submitted snapshot IDs are frozen. Demo drafts remain session-only. Full costing/model/master persistence and commercial customer-response/order-conversion lifecycle remain separate.


## User roles and quotation rejection — 16 October 2026

Added a persisted Role master and user role assignment, including Project Manager. Masters → Users now creates real Django users and assigns active roles through superuser-only APIs. Users can also be assigned roles in Django Admin. Project/Production Manager roles receive quotation view/review permissions; ordinary users are not made staff/superusers. Managers see server-submitted quotations, expand full public line/contact/tax/terms details, and approve or reject with a required reason. Decisions persist with actor/time; rejected snapshots cannot be sent, resubmitted or later approved. Browser live-account interaction is not claimed; role/login/review API tests and frontend checks validate the implemented flow.


## Editable quotation selling price — 16 October 2026

Draft quotation unit prices are editable for both stock and customized products. The number input now retains blank and decimal entry state. Custom manual selling-price changes retain approved costing/model validation and require manager review before delivery; source changes/reapplying costing clear the manual override.


## Real superuser login — 16 October 2026

Real Django login is now the default; demo mode requires explicit VITE_ENABLE_MOCK_LOGIN=true. Added local frontend API configuration and clearer credential/backend/throttle errors. Existing superusers carrying the inherited receptionist default are presented as admin in the authenticated profile; backend permission/manager approval rules remain enforced. No password was changed.


## Quotation units and line totals — 16 October 2026

Added the persisted Unit master, seeded kg/ctn/pcs/roll/pack/ltr/m, authenticated paginated units API, Django admin and Masters → Units add/activate/deactivate controls. The quotation unit selector reads active backend units; stock variants retain their declared unit and custom-unit changes reset costing. Unit-price VAT basis and an inclusive price readout are explicit. Server quotation lineTotal is quantity × entered unitPrice, rounded once to two decimals; VAT is included or added according to the selected document basis. Native PDF headers now state the VAT basis and preserve entered price precision. Backend tests and quotation helper/type/build checks passed; PDF was rendered and visually inspected.


## Quotation manager approval and saved customers — 16 October 2026

Manager approval now gates real email/WhatsApp delivery. Real submission persists the snapshot, and Production Managers review a backend pending inbox. The server requires manager role plus approval permission and rejects unsubmitted/unapproved or changed snapshots for delivery. Sender self-approval controls were removed. Customer creation from quotations now persists the extended Django customer master and reloads it in real sessions; demo writes are rejected explicitly. Full commercial editor/lifecycle state remains session-only.


## Login refresh fix — 15 October 2026

Authentication now restores saved backend identity before protected routes redirect, refreshes expired access tokens once per concurrent group, persists rotated tokens and clears invalid credentials. Remember me selects persistent storage; unchecked login uses tab storage. Demo sessions restore across reloads only in enabled mock mode. Backend outages retain credentials and offer retry. Browser demo login → protected-page refresh and logout → refresh were verified; real token restoration/rotation/error cases pass mocked adapter checks. Existing business-record stores remain session-only.


## Quotation PDF and delivery — 15 October 2026

The detail screen now has PDF / Email / WhatsApp controls with independent opt-in checkboxes, customer email and editable +916282744675 WhatsApp recipient. The sibling `../Backend` Django service persists immutable public PDF snapshots, computes decimal totals, extracts persisted order/customer/line details, requires server PDF approval and records per-channel delivery results. SMTP and Meta WhatsApp Business template credentials must be configured; no real transmission was tested. Existing quotation editing, commercial lifecycle and conversion remain session-only. Native A4 reference PDF was rendered and inspected; full browser interaction is not verified. See `../Backend/quotations/README.md`.

## Monorepo layout — 15 October 2026

The parent Navapack-ERP directory is the shared Git root for frontend/ and backend/.
Frontend source and demo behavior are preserved. Continue running npm commands from
frontend/. The Django Phase 1 foundation is tracked independently in backend/;
its existence does not establish frontend API integration or domain persistence.
Vercel Root Directory must become frontend when the migration reaches the deployed
branch. See [migration and deployment](../../docs/MONOREPO_MIGRATION.md); remote
deployment settings are unchanged by this local migration.

## Client-confirmed LED MAX / Finance demo follow-up — 15 October 2026

Higher of the Two is now the default for new applicable LED records: MAX(2.5% × chosen base, eligible KG/1,000 × USD 70 × saved FX). Percentage base is still pending clarification/configurable; applicability and VAT-on-LED stay explicit. Shared led.ts is connected to stock reverse-price analysis, recipe costing, stock/custom quotations, direct/converted Sales Orders, dispatch-value metrics and partial invoices. Both alternatives/selected branch/FX/date/conversion remain immutable snapshots. Missing weight/conversion/FX/base/date blocks finalization rather than percentage fallback. Base VAT-inclusive/exclusive logic remains, with LED and optional VAT on LED added once. Historical records are preserved.

The existing user-authored FinanceDashboard/accounts sidebar is reused with `/finance/login`, finance@navapack.com / test@123 in mock-enabled mode, Accounts / Finance demo selector, finance home label/navigation and restricted read-only Quality summary. Wrong credentials reject; successful finance credentials resolve accounts and open FinanceDashboard. Real sign-in uses the existing API with accounts role check. Detailed QC permissions remain unchanged; production mock mode stays explicitly opt-in. No invented revenue/expenses/collections or backend accounts.

Passed: new check-led-finance plus all eight existing regression scripts; standalone TypeScript/build and Git whitespace review. Concurrent check processes emit existing non-fatal Vite WebSocket port warnings; build retains its large-chunk warning. Focused tests cover MAX percentage/weight/equal and missing inputs, exact product/model conversion, cost→quote→order frozen FX/history, inclusive/exclusive VAT, separate LED and partial-invoice reconciliation, mixed-line dispatched financial values, public redaction and demo credential/mode gating. Browser smoke verified separate finance page, bad-password rejection, successful accounts landing, Finance Dashboard home link and read-only Quality summary navigation. Finance Stock view displayed Higher of the Two by default and rejected a save with missing CTR weight/FX; no test financial snapshot was posted. A finance preview screenshot was saved in the chat visualization directory. This does not establish backend persistence or all-role end-to-end coverage.

Run `npm run dev`, then `/finance/login`. Demo state resets on refresh; real session restoration, account provisioning/server authorization and durable financial snapshots remain backend requirements. Full formulas, client-confirmed vs pending rules, demo limits and exact follow-up changed-file list are in [the report](sales-fulfillment.md#client-confirmed-led-max-and-finance-demo--15-october-2026). No backend changes, dependencies or commit.

## Integrated operations — 15 October 2026

Implemented frontend enhancements across Stock/Costing, Dashboard, connected Track & Trace, Sales Order list/detail, parent/item Job Card tracking, quotation workflow/settings/Customer Masters, and QC dashboard/template configuration. Existing inventory/order/job/model/costing/quality contexts, routes, reference data and workflow guards are reused.

New shared StockIntelligence/StockAlerts, SalesSummary, ProductionTimeline/ProductionRuns and GenerateQuotation components expose configurable VAT/LED/markup-vs-margin/COP snapshots; product/model effective KG–CTR versions; product-specific alerts; optional-reservation confirmed dispatch; unit/currency-separated sales metrics; ID-linked costing/trace movement facts; append-only stage runs; source-idempotent quotation generation, internal rejection/change comparison/email drafts; and explicit QC schedule/occurrence generation. KSEC remains inactive/undefined; weekly templates remain weekly.

Validation: all eight scripts passed (`check-integrated-operations`, `check-quotations`, `check-quality`, `check-sales-fulfillment`, `check-job-cards`, `check-custom-costing`, `check-finished-goods`, `check-inventory-workflows`); TypeScript/build and Git diff whitespace checks passed. Concurrent Vite SSR checks emitted non-fatal WebSocket port-in-use warnings; the production build retains the large-bundle warning. QC regression now explicitly verifies inactive KSEC cannot create inspections; all six active template tests remain.

Browser smoke on the local Admin demo verified six-section dashboard rendering, saved product `ctn` conversion, saved financial snapshot and Trace navigation showing matching KG/estimated COP, repeated Generate Quotation returning QT-1, and a QC source/schedule with duplicate generation retaining the same count. No email was sent, public portal accessed or production stock posted. This is targeted smoke coverage, not all-role/end-to-end or print-layout verification. Initial localhost attempt timed out before Vite was ready; retry succeeded. A dashboard screenshot was saved outside source in the chat visualization directory.

Canonical formulas, roles, changed-file inventory, backend ownership/capabilities/atomicity and unresolved business rules are in [the existing report](sales-fulfillment.md#integrated-operations-update--15-october-2026). All new state resets on refresh. Actual total costs need manual evidence; material-batch consumption/process expenses are not invented. Backend persistence/server permissions/locks, email PDF/provider/outbox/delivery, secure customer links and background recurrence remain future work. LED percentage base/applicability/VAT treatment (MAX comparison is now confirmed), conversion weights, thresholds, KSEC/shift/calendar rules and missing reference documents/photos require confirmation. No dependencies/backend files or automatic commit.

## Quotations and Proforma Invoice module — 13 October 2026

Implemented dedicated list/detail/edit/preview/revision/approval/customer-response/conversion screens; shared customer/prospect/company/bank/terms session state; quotation-source costing using the existing engine; and idempotent conversion into existing Sales Orders with parent Job Card eligibility. Accepted inclusive/exclusive/discount/rounding snapshots carry through orders and partial/final invoices. Added derived quotation dashboard metrics/CSV and A4 browser printing. Updated the ERP report and workflow diagram; canonical proposed Django sales model/API/transaction contracts are in quotations.md.

All seven helper suites, TypeScript and production build pass; bundle warning remains. Both referenced client documents were absent, so exact source layout/signature/identity and browser print validation remain outstanding. No persistent backend, server roles/locks, tax/fiscal certification or external communication is implemented. Existing operations demo metrics and earlier amendment/internal-production/reservation-free dispatch pending work remain separate.

## Quality Control module — 13 October 2026

Implemented dedicated QC routes/dashboard, same-login QC Inspector/Supervisor roles, six provisional versioned templates, up to eight samples/explicit measurements, immutable submission/independent review/reinspection, NC action history, raw receipt holds, mandatory item routing checkpoints/machine verification and separate quality/final-stock authorizations. Store postings and held-batch dispatch use shared inventory guards. Excel-readable XML and browser Print/Save as PDF use no new dependencies. Shared machine IDs live in ModelsContext. Complete report section and canonical proposed Django quality-app/models/API/transactions are in sales-fulfillment.md and quality.md.

Eight photographs were absent; paper codes/revisions remain unverified. All QC data is session-only. Separate execution runs, supplier receipt metadata, persistent assignments/attachments/schedules, server permissions/atomic postings and native XLSX/PDF exports remain backend work. TypeScript/build and all six helper suites passed; browser interaction was blocked by localhost timeout and unavailable Chrome. Existing bundle warning remains. Reservation-free dispatch and other earlier parent-workflow pending phases remain separate work.

## Client-confirmed parent-card integration — 13 October 2026

Implemented the relationship portion of phases 1–2: one new parent Job Card per Sales Order, independent manufacturing items, complete-scope atomic parent approval, item controls/history and parent receipt traceability. Historical cards remain unchanged. TypeScript, production build and all five check suites passed, including focused parent regressions; browser verification was not performed. Vite retains its bundle warning.

This is a coherent partial delivery, not completion of the 22-section task. Order amendments, production for stock, additional issues, Supervisor/Manager FG approval, dispatch without reservation, expanded reports/exports and live dashboard remain pending. Existing explicit allocation and Store/Admin QC behavior remains active. Everything remains session-only. Details and backend requirements are in sales-fulfillment.md.

Repository baseline: routed frontend pages exist for all nine modules. No backend source or verified end-to-end persistence is present. API attempts with mock fallback are not marked Integrated.

## Module status

- Dashboard: frontend/mock role-specific widgets and navigation; static metrics, not synchronized with orders/inventory. Backend pending.
- Sales Orders: frontend/mock fast-entry multi-line form, validation, filters, sorting, pagination and CSV export; shared navigation-safe Context. Backend pending.
- Job Cards: data-derived summaries, combined search/status/department/stage/date filters, detail tabs, approval/edit, full/partial material issue, dynamic production tracking and handovers, stage waste, activity history, delay warnings and frontend Stock Keeping confirmation. Existing stage toggles/API fallback retained; shared navigation-safe JobCardsContext. Linked-order receipts now post into shared frontend inventory; backend persistence remains pending; custom requirements now derive from explicit model/estimate recipes.
- Stock: frontend/reference variant inventory, Brand → Pieces → Packaging columns, optional pieces-per-package metadata, detailed Stock IN/OUT, history, monthly reporting/export and open-order demand comparison. Backend pending.
- Raw Material: frontend/reference category/family views, combinable family/unit/status filters and search with reset, Stock in Hand labels, detailed Stock IN/OUT, balances, movement history and monthly CSV reports. Backend pending.
- Consumables: frontend Add/Edit/View, Imported Spare/Local Spare categories, Each/Both/Litres/Kilos units, search/filter/reset, Stock IN/OUT and movement history. Starts empty; navigation-safe state resets on refresh. No Spare Parts module exists in this checkout. Backend pending.
- Recycling: waste/granule read views and summaries; API/mock fallback. No intake/production posting workflow. Backend pending.
- Costing: cost/rate read views and rate entry; API/mock/local fallback. No cost recalculation. Backend pending.
- Track & Trace: search and history display; API lookup with seeded examples on failure. Backend pending.
- Masters: shared session-only revisioned model drafts used by orders/costing/jobs; other item/customer/supplier/department/user edits remain page-local. Backend persistence pending.

## Sales fulfillment update

Sales Order detail, per-line manual fulfillment, linked custom jobs, QC-confirmed partial receipt batches, reservations, partial dispatch/reversals and invoice snapshots now share session state. Stock includes reserved/available balances and date-range history. See [implementation, checks and limitations](sales-fulfillment.md). Browser verification is blocked by browser access to localhost.

## Recently Completed

Available in the inspected baseline (not a claim about implementation dates): multi-line sales entry, separate finished-goods/raw-material ledgers, workbook-derived reference loading and finished-goods demand comparison.
Documentation baseline now records actual architecture, models and integration gaps.

## Currently In Progress

Overall phase: frontend workflow validation. No separate active implementation task is inferred from this snapshot.

## Next Priorities

- Confirm authoritative inventory reservation/issue/production/dispatch rules and source-data ambiguities.
- Plan durable orders, masters and inventory integration at the existing state boundaries.
- Replace silent mock/local write fallback with explicit success/failure behavior during integration.
- Connect dashboard/recycling/master data flows and verify server permissions.

## Review limitations

Local orders and inventory reset on refresh; non-model page-local master edits reset on remount; shared model revisions reset on refresh. Job-card stage and costing-rate writes may appear updated after an API failure.
Authentication is not restored from stored tokens. Role-filtered navigation is not server access control.
Recycling and costing summary month labels do not filter loaded rows by month; Dashboard uses separate demo currency/metrics.

## Verification

Documentation-only changes do not change application behavior. Use README commands for typecheck, build and the finished-goods data check; no lint setup exists.

Baseline checks passed: TypeScript without emit, Vite production build to a temporary directory, finished-goods checks, Markdown links and Git whitespace checks. Standard npm run build could not write the existing tsconfig.tsbuildinfo (EPERM); the separate checks avoid that file. Vite reported a bundle-size warning.

Inventory update verification: TypeScript passed using a temporary incremental cache; Vite production build and both inventory data-check scripts passed. Browser checks covered Consumables Add/Edit/View, categories/units, filters/reset, movement history and navigation-safe state; Raw Material combined search/filters and IN/OUT; Finished Goods pieces prefilling and IN/OUT. No browser console errors were captured in these workflows. Desktop/tablet layouts and mobile modal containment were inspected. The existing fixed-width sidebar remains limiting on narrow screens. Standard npm run build still hits the pre-existing tsconfig.tsbuildinfo EPERM; Vite still reports the existing bundle-size warning.

Job Cards upgrade verification: TypeScript with a temporary incremental cache, Vite production build, manufacturing invariant checks and both inventory checks passed. Browser checks covered combined filters, required stages, editing/approval, partial/full issue, stage completion, same-unit handover, mixed-unit safeguards, waste/history, stock confirmation and completed-card locks. No console errors were captured during those workflows. Tablet forms were inspected; the existing fixed sidebar limits narrow screens. Standard npm run build retains the existing tsconfig.tsbuildinfo EPERM; Vite retains its bundle-size warning.
Final clean reload rendered Job Cards correctly. Development hot updates briefly produced a provider-context mismatch; reloading cleared it. Backend integration still needs durable workflow storage and atomic inventory posting.

## Custom costing and routing — 2026-10-09

Implemented and connected frontend custom lines, versioned models, recipe/process costing, USD/UGX snapshots, markup scenarios, estimate revision/approval/printing/customer response, linked draft Job Cards, dynamic PM routing and approved-stage tracking. Store issue remains local tracking; unmapped QC output retains prepared receipts. Actual Cost/Variance are unavailable. TypeScript, build and all five workflow checks passed; browser UI/printing validation remains unavailable and Vite reports a large-bundle warning. No backend/dependencies/contracts changed. See [changed files, formulas, assumptions and remaining integration](custom-costing-routing.md).


## 29 October 2026 — Labour Job

Recycling Module 3 (Labour Job) now supports persisted customer material IN/OUT, monthly recorded balances, corrections/voids and Excel export. See [scope and validation](labour-jobs.md).


### Labour Job register usability — 29 October 2026

Added customer/material/colour filters, saved-name suggestions and empty-result messages. Frontend build, Module 2/3 static checks and 18 recycling API tests pass (SQLite). See [Labour Job](labour-jobs.md).


### 29 October 2026 - Labour Job options

Module 3 now includes Add material and Add colour in a side panel, persisted reusable options and automatic selection in the open form. Build/static check and 19 recycling API tests pass (SQLite).


## 29 October 2026 - In-house waste delivery

Recycling Module 4 now implements in-house waste daily entries, totals, monthly rates/valuation, corrections/voids and Excel export. Build, Module 3/4 static checks and 23 recycling API tests pass (SQLite). See [scope](inhouse-waste.md).


### 29 October 2026 - Custom waste items

Module 4 Add waste item is implemented with reusable names, daily kg fields, monthly rates, totals and Excel output. Frontend build/static check and 24 recycling API tests pass (SQLite).

### Finance Analysis — 30 October 2026

Finance & Accounting now includes Analysis: a dated day book, sales/purchase/receipt/payment/expense/contra/reversal registers, customer/supplier filtering, voucher search, original-currency amounts, reporting-currency summary cards, voucher item/allocation details, CSV export and direct party-ledger navigation. Create voucher reuses the existing posting form and its authorization. Data uses the existing accounting reports API; no sample records or fallback persistence are introduced.

Summary cards exclude reversed originals and reversal documents. This is active-document activity, not period P&L; financial statements continue to use signed journal movements, including dated reversals. Company P&L remains in Reports. Customer profit allocation, uninvoiced order commitments and full Tally parity remain outstanding. Customer sales/purchases/collections alone cannot establish customer net profit. Voucher detail does not yet expose the cash/bank journal counterpart; cash/mobile-money/bank selection is available during existing receipt/payment creation.

Validation: TypeScript/production build and accounting SSR screen checks (ten sections), LED/finance regressions. Interactive browser and live API validation remain outstanding.

### Analysis home dashboard — 30 October 2026

Analysis opens a three-column home dashboard based on the supplied Tally reference. Tiles provide monthly net sales/purchase trends, company P&L totals, cash/bank/mobile-money balances, total assets/liabilities/equity, cash inflows/outflows, closing customer/supplier control balances and top cash-account ledger links. Tile actions open existing reports; Day book & registers remains available as the second Analysis view. All figures use the selected reporting dates and reporting currency. Trend data uses signed transaction baseNet amounts, including dated reversals. Missing inflow/outflow detail is shown as unavailable rather than zero.

Gross-profit classification, overdue due dates and ratio inputs remain unavailable and are identified in the dashboard. No screenshot figures are copied into live data. Build, ten-section SSR checks, dashboard tile rendering, signed/reordered monthly trend calculation and missing-cash-detail checks pass. Browser interaction and live accounting transport are not verified.

### Finance interface and complete analysis workflows — 30 October 2026

Finance has a redesigned responsive dashboard/navigation and dedicated Customer profit / Uninvoiced orders workspaces. Customer profit consumes actual tagged journals, exposes unassigned cost reconciliation and a cost-assignment form with dated audit evidence; new dispatch COGS auto-links canonical customers. Orders report line-level unbilled quantities/values with per-currency summaries and partial billing. Voucher drilldown displays actual cash/bank/mobile-money journal counterparts and links to account ledgers.

Requires active adjacent Backend accounting migration 0005_costassignment. Historical costs require reviewed assignment, not a data backfill. Assignment journals change customer classification on their posting date without changing company profit or cash. Commitments use current order scope and invoicing through the report end; values precede discounts/tax/levies and do not create accounting postings. See [backend accounting contract and validation](../../../Backend/accounting/README.md#finance-completion-and-interface-refresh--30-october-2026).

Validated with production build/typecheck, twelve-section SSR, CSS/LED regressions, 50 SQLite API/regression tests, and desktop/mobile Chromium fixture navigation plus assignment submission. Synthetic screenshots were visually reviewed. PostgreSQL concurrency, remote deployment and real client-data reconciliation remain pending.

### Accounting master creation — 30 October 2026

Finance → Masters now creates groups/subgroups, general/cash/bank and customer/supplier ledgers, cost categories, currency definitions and custom voucher types. Existing ledgers can be placed in compatible groups. Voucher forms use saved categories/types/currencies; Journal entries are supported with balanced reporting-currency lines. Reports include general-ledger groups, party groups and voucher cost categories. Custom type names/categories appear in registers/detail and exports.

Requires adjacent Backend migration 0006_finance_masters. Admin configures chart/group/category/currency/type masters; Accounts can create customer/supplier ledgers. Names/behavior are create-only; membership changes are explicit and apply across report periods. Currency definitions do not set FX or change the fixed book currency/two-decimal precision. See [accounting master API/semantics](../../../Backend/accounting/README.md#accounting-masters--30-october-2026).

Verified: 55 SQLite API/regression tests, Django check/drift, frontend typecheck/build, thirteen-section SSR, CSS/LED regressions, and Chromium desktop/mobile fixture master-creation/posting flows. No deployed database migration or real client-data change performed.

### Finance server-error handling — 30 October 2026

Accounting endpoints now return an actionable 503 if accounting migrations are missing, after checking access. Finance error messages show the HTTP status/request path and preserve JSON errors without dumping raw HTML. No automatic migration or database change is performed. 32 accounting tests, frontend typecheck/build and SSR/error-format checks pass, plus Django check/drift. Local accounting schema was found unmigrated; configured frontend targets a separate remote server whose schema state was not verified.
