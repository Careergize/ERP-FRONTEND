# Changelog

## Manufacturing sidebar navigation — 26 October 2026

Grouped existing navigation into Overview, Configuration, Sales, Procurement, Production, Inventory, and Finance & Tracking in manufacturing workflow order. Preserved role-specific Accounts and QC links, icons, active highlights and sign-out behavior. Navigation scrolls independently above the profile footer, with a stacked layout on small screens.

## Supporting-record persistence — 25 October 2026

Added database-backed supporting records, version conflicts, idempotent retries, visible save failures and management Entry History. This does not complete stock/production/QC-release/invoice backend integration.

Scope, pending authority proposal, verification and limitations: [persistence status](../../../Backend/PERSISTENCE_STATUS.md).

## Action spacing across pages — 25 October 2026

Audited button groups across the frontend. Added missing gaps and wrapping to Stock/Recycling category tabs, page action rows, modal footers, register pagination and quotation controls. Mixed-content QC, quotation and job-card forms now give inline actions consistent separation. Sidebar navigation retains its separate sizing. Validation: TypeScript/build and emitted Tailwind CSS checks; browser visual verification remains outstanding.

## Consistent button sizing — 25 October 2026

Shared screen styles now use 38px minimum action heights, compact 32px table actions, and explicit 36px square icon controls. Action links share button sizing; long labels wrap, form-grid actions avoid stretching, and full-width 48px sign-in controls remain supported. Existing green action colors and print styles are retained. Sidebar navigation uses a separate full-width 44px minimum row size with left-aligned labels and fixed 18px icons; sign-out uses a 40px row.

## Quotation approval creates fulfillment — 25 October 2026

For saved quotation-editor revisions, manager approval now atomically creates an approved Sales Order from the exact reviewed commercial snapshot. Existing-stock lines retain their finished-goods variant and create no Job Card. Custom manufacturing lines create a linked Job Card in PendingApproval, including the saved model recipe, route and planned costing. Mixed orders create manufacturing children only for custom lines. Managers must confirm a delivery date for manufacturing; an active customer master, saved stock variants/model revisions and valid recipe/route are required. Failed preparation rolls back approval and order creation. Retries reuse the same order and Job Card. Approval does not deduct stock, issue material, approve production or send messages. Existing dispatch checks remain in force.

Approval responses expose the linked order and whether a manufacturing delivery date is required; the manager view shows the order link and fulfillment result. Creator lists recover the linked order on reload. Legacy standalone PDF snapshots without an editor draft retain approval-only behavior; order-origin quotations do not create duplicate orders. No historical approvals were backfilled. Customer-response recording remains separate; it is no longer a prerequisite to this approval-triggered order creation path.

Validation: frontend TypeScript/build and quotation/persistence checks; 5 focused approval-fulfillment tests plus 25 existing quotation/draft/account tests on disposable SQLite. PostgreSQL concurrency was not exercised.


## Quotation approval submission — 25 October 2026

The primary Save Quotation action saves and submits a completed quotation for manager approval through the existing API. An explicit Save Draft action preserves incomplete work. Lists show status badges including Pending, Approved and Rejected, and existing drafts have Submit for Approval. Existing source/costing validation and manager permissions still apply; failed submissions stay Draft with an error.

## Local workflow and registers update — 23 October 2026

Added separate API-backed Spares and Consumables registers; reconciled workflow conflicts and disabled unresolved operational transitions. Existing business databases were not migrated.

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


## Automatic order numbers and B2B-only charges — 23 October 2026

Order numbers are automatic/read-only and retain their server number on retries.
VAT/LED entry and totals appear only for B2B; B2C strips hidden charges in both the
form and new direct-order API saves. Saved historical commercial records are retained.

## Stock OUT sales form — 23 October 2026

Added sales-style Stock OUT for new sales or existing Sales Orders, with customer
type, requisition, multi-item rates/amounts and separate VAT/LED totals. Confirmation
validates all rows before posting any Stock OUT; duplicate retries preserve their
commercial snapshot. Non-sales movements keep their separate form. Dispatch remains
session-only; new orders and quotations use their existing database workflow.

## Saved Job Card planned costing sheets — 23 October 2026

Job Card creation automatically prepares a persisted planned costing sheet. Complete
material/process prices, exchange rates and applicable taxes, save/calculate, then
PM-approve costing before approving the Job Card. Includes four markup comparisons,
revision history, stale-save protection and Print/Save PDF. Units are retained on the
model; Sales Orders show VAT and LED separately. No predefined waste is introduced.

## Automatic quotation from Sales Orders — 23 October 2026

Saving a new direct Sales Order automatically saves a linked Sales Quotation draft
using the existing Navapack template. Open Preview / Print or Review quotation from
the order. Added explicit inclusive/exclusive VAT entry. Existing quotation conversions
keep their original document; retries do not duplicate quotations. Approval and sending
remain explicit. LED snapshots and PDF totals are preserved.

## Operator-recorded wastage — 23 October 2026

Removed Default waste % from product creation and Planned Waste % from routing entry.
New costing drafts no longer inherit a model waste percentage. Machine employees
record actual wastage at each production stage/run.

## Job Card output unit — 23 October 2026

Manual Job Card and Sales Order manufacturing entry now use the model production
output unit, with legacy batch/default fallback, rather than only its default unit.
Manual Job Cards show selection prompts and warn when product/model units differ.

## Manual Job Card creation — 23 October 2026

Added Create Job Card on the Job Cards page for Receptionist/Admin. Jobs can be saved
without a Sales Order and sent directly for PM review using a saved model recipe and
manual routing. Manual jobs show their origin without a broken Sales Order link.

## Existing-item manufacturing entry — 23 October 2026

Added explicit manual/custom and existing-item entry choices for manufacturing.
Existing items require known zero stock before a Job Card can be created for the full
order quantity; backend rechecks on deferred allocation. Selecting a recipe model
preserves the manually entered product name.

## Sales Order API errors — 23 October 2026

Replaced raw production workflow HTML errors with readable messages, including
configuration guidance for missing API routes. Added focused error handling checks.

## Separate processes, machines and manual Job Card routing — 21 October 2026

Added Processes & Machines with API-backed machine/process mapping. Manufacturing
items now have an individually editable ordered Job Card workflow in Sales Order
entry. Machine choices respect supported processes; saved routing carries into PM
review/approval independently of the model template.

## API-only Sales Orders — 21 October 2026

Removed sample Sales Orders and local-only creation. List/detail load shared API
records with loading, retry and empty states. Creation choices use API customers,
staff, model revisions and finished stock; order numbers are assigned by the server.
Quotation conversion now saves through the API with duplicate protection. Build,
sales/quotation/customer checks and 8 backend workflow tests pass.

## Removed static Job Cards — 21 October 2026

Job Card screens now display only production workflow API records. Removed sample
merging, old detail fallback and local-only allocation. Empty lists, load failures and
detail retry are explicit. Reloading always replaces cards with the server response.
Build and existing sales/integrated checks pass.

## Product-specific process workflows and shared handoff — 21 October 2026

Added user-defined reusable process steps with per-model selection/order and explicit
recipe-batch output. Direct Sales Orders optionally allocate a linked manufacturing-only
Job Card, automatically calculating materials without requiring costing. PM corrections
and approval persist, and approved jobs enter Store's queue. Store Issue records checked
Raw Material OUT atomically. Stock-only items never create Job Cards. Product Models has
its own menu for Receptionist/PM/Admin. Legacy examples and later production tracking
remain separate. Backend 80 tests, build and relevant frontend regressions pass.

## Goods Received Notes — 21 October 2026

Added Goods Received Notes below Purchase Orders: list/search, PO-linked entry,
partial receiving, damaged/missing quantities, receiver/authorized-person fields and
printable notes. GRN posting adds only received minus damaged goods to finished Stock.
New POs default to GRN receiving; an explicit immediate-receipt option remains.
Existing posted purchases are preserved and cannot be added again through a GRN.
UUID retries prevent duplicate notes/stock. Backend checks/74 tests and build pass.

## Manual procurement tracking — 21 October 2026

Removed automatic consumption deductions from planner stock in Django and the frontend.
Stock quantity and date remain as entered; daily/monthly rates only estimate coverage,
availability and reorder dates. Editing no longer checkpoints a reduced balance or
resets the stock date. Saved unknown balances are preserved. Raw Material and finished
Stock ledgers are unchanged. Build/procurement checks and 16 inventory tests pass.

## Purchase order entry — 21 October 2026

Added Purchase Orders navigation, list/search, new-order entry and saved detail views.
Real accounts save supplier/delivery details, currency, payment terms and item quantities,
units/prices in Django. Each item offers From stock or Manual entry; new variants become
available on later purchases. Saving adds finished-goods Stock IN atomically with the
purchase. UUID retries cannot double-post stock. Stock reloads durable purchases after
refresh; previous drafts are not automatically received. Raw Material and procurement
plans are unchanged. Demo users see a real-login prompt.

## Raw stock autofill on grade selection - 17 October 2026

Selecting a grade for a new procurement plan now prefills Stock in Store from its current Raw Material balance (opening + IN - OUT), supplied by the procurement API with one aggregate query. Known zero stays zero and unknown opening stays unknown. A saved plan keeps its independent remaining balance; a previously unknown planner balance can prefill from the current raw source for confirmation on save. Raw receipts/issues are not changed by selecting or saving a plan. Frontend build and procurement checks pass; all 15 inventory API/migration tests pass.

## Current stock in procurement editor - 17 October 2026

Prefill the procurement stock entry with current remaining stock instead of the original baseline; saving uses today’s stock date to prevent a second deduction of elapsed consumption.

## Procurement stock field visibility - 17 October 2026

Made Stock in Store visible in a highlighted section at the top of Add / edit procurement plan, with a clearly labeled editable quantity input and stock date.

## Independent procurement and daily depletion - 17 October 2026

Separated Procurement entry from Raw Material. Enter stock and its date directly in the planner; remaining stock automatically reduces each calendar day by entered consumption, including days away. Removed Raw Material redirects. Saved baseline/rate/date prevent refresh double-deductions; consumption edits carry forward today’s remaining stock.

## Procurement plan entry - 17 October 2026

Added a clear Add procurement plan button, raw-material selector and synchronized daily/monthly consumption inputs. Added live coverage/date previews and visible Comment/Next Order Cycle columns matching the requested sheet.

## Procurement planner persistence - 17 October 2026

Raw Material and Procurement now have explicit delivery and plan-revision models in addition to saved materials/movements/plans. Existing delivery data migrates intact; plan edits retain history. All five models can be inspected read-only in Django Admin.

## Persistent quotation drafts — 16 October 2026

Connected quotation Save Draft, edit and list reload to Django database storage. Added QuotationDraft model/admin/API, source-preserving editor serialization, optimistic edit checks, submitted-draft freeze and server decision restoration. Replaced session-only save success wording for real users with confirmed database-save messages.


## User roles and quotation rejection — 16 October 2026

Added the Role master and Project Manager user assignment. Connected Masters → Users to real user/role APIs with password validation. Expanded quotation manager review to show document details and Approve/Reject actions, rejection reasons and decision history filters. Rejected quotations are blocked from email/WhatsApp delivery.


## Editable quotation selling price — 16 October 2026

Removed the custom-product unit-price read-only restriction on quotation drafts. Added decimal-friendly entry and explicit manual-price handling while retaining costing checks and manager approval.


## Real superuser login — 16 October 2026

Real Django login is now the default; demo mode requires explicit VITE_ENABLE_MOCK_LOGIN=true. Added local frontend API configuration and clearer credential/backend/throttle errors. Existing superusers carrying the inherited receptionist default are presented as admin in the authenticated profile; backend permission/manager approval rules remain enforced. No password was changed.


## Quotation units and line totals — 16 October 2026

Added backend Unit model, default units, admin/API and Masters → Units management. Quotations load units from the backend, show VAT-inclusive unit price and quantity × unit-price line totals. Server validates unit identity and computes line amounts; PDF headers explicitly state VAT basis and preserve six-decimal entered price precision.


## Quotation manager approval and saved customers — 16 October 2026

Added manager approval inbox and durable quotation submission; only the Production Manager can authorize email/WhatsApp delivery. Removed sender PDF self-approval; changed snapshots require fresh approval. Added persistent new-customer creation from quotations, extended customer fields, shared customer API loading/master editing and quotation-master links.


## 2026-10-15 — Keep login across refresh

Fixed the redirect to login caused by memory-only user state. Added startup profile restoration/loading guard, shared JWT renewal, complete invalid-session cleanup, tab/persistent Remember me behavior and guarded demo-session restoration. Verified browser refresh/logout, focused authentication checks, TypeScript and production build.


## 2026-10-15 — Reference quotation PDF and selected delivery

Added native reference-style A4 PDF, public snapshot persistence and structured sales-order extraction in the sibling Django backend. Quotation detail now offers PDF / Email / WhatsApp with independent checkboxes and editable +916282744675 recipient. Server PDF approval, SMTP attachment, Meta document-template submission and durable per-channel attempt results prevent false success and duplicate replay. Updated contact field types and photo-derived company/bank defaults. Live provider configuration remains required; existing frontend commercial records remain session-only.

## Monorepo layout — 2026-10-15

- Preserved frontend files/history while moving the Git root to Navapack-ERP and
  including the separate Django Phase 1 foundation under backend/.
- Added root setup/ignore guidance and documented the coordinated Vercel Root Directory
  change to frontend. Frontend functionality and API integration remain unchanged.

## Confirmed LED MAX / Finance demo — 2026-10-15

- Made client-confirmed Higher of the Two the default for applicable LED; centralized 2.5% versus USD 70/tonne × saved FX with mandatory weight/conversion validation and configurable pending percentage base.
- Connected frozen LED calculations/FX through costing, stock analysis, quotations, Sales Orders and partial invoices without double VAT.
- Connected the existing finance workspace to separate demo login/accounts entry, home navigation and read-only quality summary; preserved real authentication and QC permissions.
- Added focused MAX/tax/snapshot/demo regression coverage and updated existing costing/tax/backend/report documentation; no backend or automatic commit.

## Integrated operations — 2026-10-15

- Added versioned product/model KG–CTR conversions, stock VAT/LED/markup/margin/COP snapshots, evidence-based actual totals and product alert policies.
- Added confirmed dispatch without prior reservation, preserving dated/batch/QC guards and reversal history; classified new non-sales OUT.
- Replaced static operational dashboard aggregates with six current-state sections; added shared sales summary, connected ID-based trace navigation, stage timelines and multiple execution runs.
- Added source-idempotent quotation generation, reviewer rejection/change comparison and customer-safe email drafts/mailto without delivery claims.
- Added configurable QC frequencies, explicit idempotent schedules/daily counts and inactive KSEC placeholder. Updated report/backend requirements and integrated regression coverage; all state remains session-only.

## Quotations / Proforma Invoice — 2026-10-13

- Added dedicated commercial quotation screens, approvals, customer responses, immutable revisions, A4 preview and accepted-revision order conversion.
- Reused costing before an order exists; adopted approved source references into real order/job flows without duplicate pricing or fake orders.
- Shared customer/prospect/company/bank/terms settings and explicit VAT/discount snapshots; preserved basis through converted orders/partial invoices.
- Added live quotation metrics/CSV, focused regressions and report/backend specification; missing reference documents/layout verification and all backend persistence remain outstanding. No dependencies or automatic commit.

## Quality Control — 2026-10-13

- Added same-login QC roles, dashboard/navigation and category/template/inspection/review/action/report screens.
- Added versioned checklist snapshots, negative-answer/numeric sample validation, immutable review and correction history.
- Connected raw receipt holds, mandatory production QC/machine guards, separate quality/final-stock authorization and traceable Store receipts/held-batch dispatch.
- Added Excel-readable XML/browser PDF printing, focused QC regressions and canonical proposed Django/DRF quality architecture/contracts; no backend implementation or new dependencies.
- Source photographs were not present; templates remain provisional and all state resets on refresh.

## 2026-10-13

- New manufacturing lines share one parent Job Card per Sales Order, retaining independent costing, routes, materials, units, tracking and batches.
- Parent list/detail show separate item progress and combined history; approval requires complete manufacturing scope and completion requires all items.
- Preserve historical cards; retain parent/item references on new receipts. Add focused regression coverage.
- Partial client-workflow delivery: amendment, internal production, additional issues, FG authority, unreserved dispatch, exports and dashboard phases remain pending (see sales-fulfillment.md).

## Unreleased

### Added

- Job Card manufacturing tracking: calculated summaries and filters, five detail tabs, approval/material issues, data-driven stage updates and handovers, waste/activity history, delay warnings and frontend stock confirmation. Existing sample cards and routes retained.

- Consumables navigation and frontend Add/Edit/View, category/unit filters, Stock IN/OUT and movement history.
- Raw Material Filter/reset controls with combined family/unit/status/search filtering, Stock in Hand wording and selected-record details in both stock forms.
- Finished Goods Brand → Pieces → Packaging columns and CSV export; optional pieces per package entered on Stock IN and prefilled on Stock OUT without changing inventory calculations.
- Code-verified documentation baseline for architecture, business rules, frontend models, development status and backend integration work.
- Agent instructions requiring targeted documentation maintenance alongside meaningful changes.

### Changed

- Corrected README claims about module placeholders, backend integration and Android packaging to match the current repository.

This baseline does not assign release dates or reconstruct feature history. Existing finished-goods source interpretation remains in finished-goods-reference.md.

## 2026-10-09

- Added manual per-line sales fulfillment, linked manufacturing drafts and shared QC receipt batches.
- Added reservations, partial dispatch/reversal history, configurable invoices, trace links and reserved/available stock with custom history ranges.
- Added fulfillment regression checks; all transactions remain session-only. See sales-fulfillment.md.

## 2026-10-09 — Custom costing and routing

Added shared revisioned custom models, per-line USD/UGX costing and markup comparisons, printable redacted estimates, separate approval/customer response, linked draft jobs and PM-controlled dynamic routing/reapproval. Added QC-prepared receipt mapping and explicit unavailable actual costing. Workbook ambiguities stay configurable. New regression checks cover costing/model/estimate/routing behavior; existing stock/sales checks remain passing. See [implementation notes](custom-costing-routing.md).
