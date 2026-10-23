# Spares, Consumables and workflow clarification — 23 October 2026

Status: PARTIAL; local implementation only. No production readiness claim.

## Existing versus missing

Reused Django JWT authentication, DRF pagination/model permissions, assigned-role permission backend, shared Axios token/refresh client, Card/input styles, router/sidebar conventions, and the raw-inventory pattern of locking the exact parent item before appending ledger entries.

Task 04/05 order/job Draft endpoints, immutable revision snapshots, contributor evidence, optimistic versions, command receipts and independent-review checks already exist. Their source files and existing uncommitted frontend work were preserved. Operational Job Draft writes remain closed by their existing source/policy evidence guards. They are not a complete quotation-style standalone editor: the current controlled editor requires a confirmed order source and supports narrative corrections. Standalone instruction evidence, material/machine/route draft revisions, submit/request-corrections, independent approval and release still require work once the authority/policy boundary is agreed. No alternate Job Card engine was introduced.

The old Consumables page was a browser-memory spare ledger. Its operational route now uses a separate backend item register. Old data/context helpers remain for compatibility but the provider is no longer mounted and the register does not read/import their records.

## Workflow conflict resolution

Removed committed conflict markers in erp/models.py and production_workflow.py. WorkflowJob keeps optional order, unique nullable request_id AND source_confirmed_revision. Existing migrations already represent those fields; empty additive ERP/quotation merge migrations reconcile the split migration graph without rewriting historical migrations.

Legacy order capture now permits orders without a quotation, preserves quotation-source validation when supplied, uses the existing total validator and retains known-zero-stock checks for existing manufacturing items. Saving an order never automatically allocates a Job Card. Legacy order approval, allocation, standalone job POST, job approval, costing approval and material issue reject operational transitions pending adopted policy/authority evidence, including for superusers. Existing controlled-job conflict responses remain intact. Internal allocation math remains a preparation helper used by the protected private Draft engine; it does not establish approval authority.

The target permits non-operational drafts before authorization and authorized standalone replenishment. Existing controlled entry points still need trusted source/policy evidence; those gates were not bypassed. Existing legacy Job Card edit/costing preparation remains legacy, not a new versioned maker/checker workflow. Other frontend-only production/dispatch workflows are not certified by this change.

No financial calculations were changed. ERP.xlsx and Costing Sheet for Pricing.xlsx retain their VAT-inclusive subtraction, overhead mismatch and LED currency/unit ambiguities for Finance/client confirmation. Existing calculation code was not newly enabled by this work.

## Models and persistence

inventory/catalog_models.py defines separate SpareItem and Consumable UUID masters: globally unique code within each model, name, description, exact unit, active flag, creator and timestamps. Spares additionally have IMPORTED/LOCAL category and nonnegative Decimal(20,6) minimum_stock. Supported labels: Each, Both, Litres, Kilos.

SpareStockMovement records item, globally unique request UUID, IN/OUT, explicit opening marker, Decimal(20,6) quantity, exact unit, source reference, actor and timestamp. Constraints enforce direction, positive ordinary quantities, nonnegative IN openings and at most one opening per item. No consumable ledger or balance model exists.

Opening is unknown until explicitly recorded; zero opening is allowed only as an explicit opening entry. No openings or client records were invented/imported. The service locks the item in an atomic transaction before checking retries, unit/status, opening and available quantity, then appends a movement. Unit changes after any posting are rejected under the same item lock. Same actor/payload request retries replay; changed retries reject. Balances use one aggregate query and return decimal strings. There is no normal movement update/delete API or admin registration. Corrections/reversals remain unavailable pending policy.

Migrations: inventory/0010_spares_consumables.py; erp/0016_merge_existing_workflow_heads.py; quotations/0007_merge_existing_control_heads.py. Applied only to disposable in-memory test databases. Existing development/business databases were not migrated. Deployment and live persistence verification remain pending approval.

PostgreSQL-compatible row locks and constraints are used, but PostgreSQL concurrency was NOT exercised. SQLite tests do not prove concurrent production safety. Posting remains disabled.

## API contracts

All routes use existing /api/ prefix and JWT. No delete master endpoint.

- GET/POST /api/spares/ and /api/consumables/: paginated list/create.
- GET/PUT/PATCH /api/{spares|consumables}/{uuid}/: retrieve/update.
- GET /api/{spares|consumables}/capabilities/: create/edit permissions; posting false.
- GET /api/spares/{uuid}/stock/: opening_stock, stock_in, stock_out, current_stock, below_minimum.
- GET /api/spares/{uuid}/movements/: paginated immutable history; requires view_sparestockmovement as well as item view permission.
- POST /api/spares/{uuid}/movements/: intentionally 403 pending authority mapping. The tested private service contract uses request_id UUID, movement_type IN/OUT, is_opening boolean, decimal quantity string, unit and nonblank reference. This endpoint does not currently execute that service.
- Consumables have no stock or movement endpoints.

Master body: code, name, description, unit, is_active; spares additionally category and minimum_stock decimal string. Responses add id/created_at/updated_at and, for spares only, server-calculated stock. Lists use count/next/previous/results. Filters: search (name/code), unit, is_active=true|false; spares category=IMPORTED|LOCAL. Unknown units/invalid quantities/duplicate codes return DRF field errors; authentication 401 and unauthorized actions 403. Opening/current unknown quantities return null.

Server permissions use inventory.view/add/change_spareitem and inventory.view/add/change_consumable. No new role grants, authority publication or superuser operational bypass was added. Item CRUD therefore needs approved permission assignments after migration. Posting cannot be activated through a setting or browser flag. Procurement system-entry versus Stores physical custody/requisition/independent verification must be mapped explicitly before opening or stock posting can be enabled.

## Frontend

/spares and /consumables are separate routes/menu entries. Shared ItemRegisterPage provides API-only loading, filters, pagination, add/edit/view dialog, backend-confirmed saves, inline errors, empty states, inactive status and explicit retry. Quantities stay strings; no frontend stock arithmetic or demo fallback. Spares show unknown opening/current values, minimum alerts, read-only paginated history and disabled posting actions. Consumables show only register fields. Summary totals use matching count; other summary cards explicitly describe current-page scope. History is per-item rather than an all-spares Movements tab; global category/low-stock summary and cross-item ledger browsing remain UI limitations.

Job Card/Sales Order UI identifies unresolved authority gates. Legacy Create/Approve/Issue actions affected by those gates are disabled. Existing controlled draft interfaces and their backend capabilities remain unchanged. Quotation-style full draft authoring and standalone instruction evidence are not claimed complete.

## Validation

Only backend/test_baseline_runner.py was used for Django commands: dotenv disabled, in-memory DB/test DB, outbound sockets blocked.

- Django system check: passed.
- Migration drift: no changes detected.
- Seven focused catalog tests: passed (both spare categories, consumable persistence/edit/reload, uniqueness, filters, authentication/authorization, posting closed even to superuser, decimal IN/OUT, opening, balance, invalid quantities, insufficient stock, mismatched/locked units, retries, rollback, independent items, immutable API history).
- Frontend check-registers.mjs: passed (mock transport, confirmed-save timing, separate data paths, decimal strings, edit/reload simulation, filters, failure propagation/no fallback, initial server-rendered UI and routes). These are not browser interaction tests or live HTTP persistence verification.
- Frontend full validation scripts: all passed after correcting the missing collection-helper contract. Existing check-inventory-workflows still exercises legacy helper compatibility; it does not mean Consumables exposes stock operations.
- TypeScript and production build: passed; existing large bundle warning remains.
- Full backend suite: 174 tests, 154 passed, 14 failed, 6 errored. All catalog and Task 04/05 controlled Draft/evidence tests passed. Fourteen legacy production tests expect superseded workflow behavior (including quotation-required capture, automatic allocation or role-only approvals). Six baseline characterization tests error because their existing fixture has no prepare_quote method. See ../../backend/tmp/spares-regression-final.txt for exact results. Legacy tests expecting quotation-required capture, automatic Job Cards or role-only approvals conflict with the new decisions and were not rewritten to conceal that conflict. Baseline characterization also has existing missing prepare_quote fixture methods. Existing tests/foundations were not replaced.

Browser visual/interaction tests, live database persistence and PostgreSQL concurrency are unverified.

## Files changed in this implementation

Backend modified: config/urls.py, inventory/models.py, erp/models.py, erp/production_workflow.py. Added: inventory/catalog_models.py, catalog_api.py, spare_service.py, test_catalog.py, migrations/0010_spares_consumables.py; erp/test_operational_authority.py, migrations/0016_merge_existing_workflow_heads.py; quotations/migrations/0007_merge_existing_control_heads.py.

Frontend modified: src/App.tsx, components/layout/AppShell.tsx, pages/Consumables/ConsumablesPage.tsx, pages/JobCards/JobCardList.tsx, JobCardDetail.tsx, pages/SalesOrders/SalesOrderDetail.tsx, lib/productionWorkflowApi.ts (additive missing loadWorkflowCollection export needed by existing ModelsContext work). Added: lib/registerApi.ts, pages/Registers/ItemRegisterPage.tsx, scripts/check-registers.mjs and this report. Affected status/model/rules/TODO/changelog documents receive short links to this report. Existing unrelated staged/unstaged/untracked changes were preserved.

No branch creation/switch, staging, commits, pushes, Git merge/rebase/reset/stash/clean, remote operations, PRs, record deletion, production credential changes or existing-database migration were performed.

Final regression log: [backend synthetic test output](../../backend/tmp/spares-regression-final.txt). Other local intermediate logs are in backend/tmp/spares-{regression-results,foundation-results}.txt.
