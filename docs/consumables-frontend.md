# Consumables frontend enhancement — 28 October 2026

## Scope and architecture

The existing `/consumables` route and sidebar entry are preserved. Saved Register
continues to render the unchanged, backend-connected `ItemRegisterPage`, with its
existing capabilities, API calls, validation, errors and confirmed-save behavior.
No backend, API service, authentication, other module, dependency or configuration
was modified. The separate `/spares` register is unchanged.

The module now has query-string navigation for Saved Register plus ten requested
views: Overview, Master, IN, OUT / Issue, Imported Spare Parts, Local Spare Parts,
Office & Administration, Issue & Usage History, Low Stock Alerts and Reports.
Browser Back/Forward can select views. Invalid view numbers fall back to Saved Register.

Demonstration records are isolated in page-local React state, matching the existing
frontend session-state convention without mounting the legacy, incompatible
ConsumablesContext or sharing any real inventory data. They survive view changes
but reset when leaving the module or refreshing. No browser storage is written.
The initial demo is empty; sample records load only through an explicit button.
All demo views and save notices identify the local-only boundary.

## Implemented behavior

- Three main categories, all 16 requested subcategories, dependent dropdowns and
  office-supply examples. Required units include the existing business unit Both.
- Full requested master fields, editable item details, unique codes, required-field
  and nonnegative-number validation, active/inactive status and ledger metadata.
- Receipt and issue forms include requested references, actors, department, purpose,
  machine, location and remarks; Save, Cancel and Reset are available.
- IN/OUT append local history and consistently calculate opening + IN - OUT.
  Nonpositive quantities, inactive items and overdrafts are rejected. Chronological
  checks prevent a backdated issue from borrowing stock from a later receipt.
  Opening stock and units lock after the first movement.
- Category, department, status and text filters; name/code/stock sorting; category
  subset views; all eight overview cards; recent activity; low/out-of-stock views.
  Low stock means positive stock at or below minimum; alerts also show zero stock.
- Stock valuation and receipt/usage reports. Values use latest purchase cost and an
  unspecified demonstration currency; incompatible units are not totalled together.
- Expense / Ledger Mapping is editable UI metadata only. It posts no accounting data.
- Existing Card, input and button/Tailwind conventions, labeled forms, status/error
  messages, responsive grids, wrapping navigation and horizontally scrollable tables.

## Backend work still required

The enhanced fields, categories, stock movements, reporting and expense mappings
need future approved backend contracts, persistence and authorization. They are
not sent to the existing basic consumable master API. There is no synchronization,
real inventory posting, tax calculation, journal posting or accounting integration.
A saved backend item is never copied into the demonstration stock automatically.

## Validation

- `node node_modules/typescript/bin/tsc -b`: passed.
- `npm run build`: passed; pre-existing >500 kB bundle warning remains.
- All 24 `scripts/check-*.mjs` scripts: passed, including the new
  `check-consumables-demo.mjs`. No lint script/config exists in this frontend.
- New checks exercise item creation/edit, dependent category validation, duplicate
  codes, receipts/issues, balance/history consistency, overdraft/backdating,
  unit/opening locks, inactive items, low/zero stock and SSR of all 11 views.
- Existing checks exercised register/API behavior and route/sidebar contracts,
  Sales Orders/order drafts, Job Cards/job drafts, finished goods and raw-material
  inventory helpers, quotations/persistence, invoicing/sales fulfillment, QC,
  accounting, authentication, procurement, shared entries and integrated operations.
  These are script-level regressions, not complete browser or live API certification.
- Main Dashboard source and routing were unchanged; no dedicated interactive
  Dashboard regression was performed.
- Browser preview attempt failed with `net::ERR_CONNECTION_TIMED_OUT` to the local
  Vite server. Browser click-through, visual/mobile layout and live persistence
  remain unverified. The temporary isolated preview harness was removed.
- The SSR test emits React Router's expected useLayoutEffect server-render warning.
  This is a test-render limitation, not a demonstrated browser runtime failure.

## Files

Modified: `src/pages/Consumables/ConsumablesPage.tsx`.
Added: `src/lib/consumablesDemo.ts`, `scripts/check-consumables-demo.mjs`, this report.
Added short feature links to DEVELOPMENT_STATUS.md, BACKEND_TODO.md,
DATA_MODELS.md, BUSINESS_RULES.md and CHANGELOG.md.

## Auto-code and audit preparation follow-up — 28 October 2026

This follow-up supersedes the earlier statement that the shared register component
was unchanged: only its Consumables editor now locks existing codes and displays
available backend ID/audit metadata. Spares behavior, API requests, permissions,
routes and sidebar are unchanged. The current API register has no category/allocation
contract, so its existing new-record creation workflow remains available. Provisional
category suggestions belong to the separate demonstration Master; they are never
represented as backend-allocated codes.

New demo items suggest `CON-{CATEGORY}-{SEQUENCE}` using the selected subcategory.
All 16 subcategories have distinct prefixes, including PAN, HSK, STA, LUB, SAF,
IMP and LOC. Code fields are read-only. Changing the category of a saved item keeps
its code; the save helper rejects attempts to change any existing code. Legacy
sample codes remain unchanged. Used-code history includes inactive records and
retains allocations if records are later removed from the in-memory item list.
There is no delete UI. Counters are session-scoped: refresh/leaving the module resets
the demonstration. There is no browser-storage or global uniqueness guarantee.

Receipts/issues receive read-only provisional `CIN-yyyy-00001` and
`COUT-yyyy-00001` references from separate year/direction sequences. References are
allocated on successful local posting, retained in history and never sent to an API.

Item details show future permanent ID as unassigned, actual local create/update
metadata where available, status and configurable Expense / Ledger Classification.
The classification input offers existing suggestions and accepts custom labels;
changes are UI metadata only. Unknown historical identities/timestamps stay unknown.
The authenticated identity comes from the existing AuthContext without changes to
login or permissions. User-entered Received/Issued By remains separate from the
activity's authenticated performer. Actual local actions use browser-clock timestamps;
sample items are not assigned invented creation events or dates. No-op saves do not
rewrite timestamps or append history.

The added read-only Activity History view shows reference, code, action, previous/new
values, performer, timestamp and remarks for local create/edit/status and IN/OUT
operations. Stock Adjustment is a supported display action reserved for future
integration; no adjustment workflow is introduced. These session records are neither
permanent nor tamper-proof. Backend history is not fabricated or fetched from invented
endpoints. Existing backend metadata is displayed only when present in the response.

Backend dependencies: authoritative item and movement reference generation, atomic
sequence allocation, permanent IDs, uniqueness enforcement, persistence, audit actors/
timestamps, audit-history reads and approved ledger-classification contracts. No
journal entries, accounting postings, API modifications or backend changes were made.

Validation for this follow-up:
- TypeScript and production build passed; the existing large-bundle warning remains.
- All 24 frontend check scripts passed. Focused checks additionally cover all requested
  code prefixes, legacy preservation, category identity stability, local non-reuse
  after inactivity/removal, sequential/year-scoped movement references, real-action
  metadata, missing identities, custom ledger labels, no-op saves and activity values.
- SSR verifies read-only demo item/reference fields, existing saved-code locking,
  available backend audit displays, unchanged Spares code editing and all 12 views.
- Existing auth, register/routes/sidebar, orders, job cards, inventory, quotation,
  invoice/fulfillment, QC, accounting and integration checks passed. This is script
  coverage, not complete browser/live-backend certification. No new interactive
  browser or mobile validation was performed. No lint configuration is available.

Exact files touched by this follow-up: src/lib/consumablesDemo.ts,
src/pages/Consumables/ConsumablesPage.tsx, src/pages/Registers/ItemRegisterPage.tsx,
scripts/check-consumables-demo.mjs, docs/consumables-frontend.md and short updates in
docs/DEVELOPMENT_STATUS.md, docs/BACKEND_TODO.md, docs/DATA_MODELS.md,
docs/BUSINESS_RULES.md and docs/CHANGELOG.md.

## Spares / Consumables separation — 28 October 2026

This correction supersedes the earlier spare-specific Consumables categories and
views. `/spares` remains the existing independent API register. No change was made
to its editor, API adapter, permissions, codes, navigation or posting restrictions.
The shared ItemRegisterPage, App.tsx, AppShell.tsx and registerApi.ts were untouched
by this correction. Backend files and all other modules were untouched.

Removed from active Consumables UI: Imported/Local Spare Parts tabs and overview
cards, spare category/filter selections, IMP/LOC code suggestions, and the spare
part-number input. Remaining views retain their existing query-string IDs; old
view=5/view=6 links fall back to Consumables Overview, without reopening spare tabs.
Overview, Master, IN, OUT, office grouping, usage/activity histories, alerts, reports,
read-only codes, audit metadata, ledger labels and movement references remain.

New item categories are Factory & Production Consumables, Pantry & Refreshments,
Housekeeping & Cleaning, Office Stationery, Office Maintenance Supplies, Employee
Welfare and General Administration. Factory subcategories remain available. Existing
office records retain their original category/subcategory values; new category
filters match these legacy office records without rewriting them. CON suggestions
remain provisional and session-only. Existing IDs/codes/audit values and expense
classifications are preserved; unused legacy part-number data is retained in state.

Records requiring review (local demonstration samples only):
- `demo-1` / `DEMO-2`: Imported bearing; Spare Parts / Imported Spare Parts.
- `demo-2` / `DEMO-3`: Local drive belt; Spare Parts / Local Spare Parts.

These records were neither deleted, reclassified nor moved into Spares. They remain
in the existing sample dataset and loaded state. A read-only review panel exposes
their original item fields and any linked movements/activity, including references.
They are excluded from Consumables operational tables, dropdowns, totals, reports
and alerts. Helpers reject attempts to edit, reclassify or post their stock through
Consumables. This restriction leaves their existing records/balances unchanged.

No live backend records were queried or migrated. The current Consumables API is
a basic register without the enhanced classification contract, so no authoritative
production migration count is available. An approved future backend/data review must
identify and migrate any real misplaced records while preserving identities and
history; this frontend correction does not perform that migration. The unmounted
legacy ConsumablesContext/data helpers are retained for compatibility and do not
supply the routed Consumables UI.

Validation: TypeScript and production build passed (existing large-bundle warning
remains). Focused checks passed for the seven categories, absence of spare controls,
CON suggestions, legacy code/category preservation, category filtering, item edits,
IN/OUT, balances/alerts, reference/audit preservation, blocked legacy-spare mutations,
read-only review rendering, both dedicated Spares category options, ten retained
views and retired-view fallbacks. Browser interaction/visual and live API tests were
not performed. No lint script/configuration exists.

All 24 `scripts/check-*.mjs` scripts passed, including auth, register/API and route/
sidebar contracts, Sales Orders/order drafts, Job Cards/job drafts, inventory/raw
material helpers, quotations/persistence, invoices/fulfillment, QC, accounting,
procurement and integrated operations. The focused checks were rerun after adding
explicit retired-view fallback assertions. These results are script-level coverage;
no complete browser, Dashboard interaction or live-backend regression is claimed.

Files changed for this correction: src/lib/consumablesDemo.ts,
src/pages/Consumables/ConsumablesPage.tsx, scripts/check-consumables-demo.mjs,
docs/consumables-frontend.md, docs/DEVELOPMENT_STATUS.md, docs/BACKEND_TODO.md,
docs/DATA_MODELS.md, docs/BUSINESS_RULES.md and docs/CHANGELOG.md.

## Backend integration — 28 October 2026

The routed Consumables page now loads the API-backed ConnectedConsumables workspace.
This supersedes the session-only status above for production views. Demonstration
helpers and the two legacy spare samples remain preserved in source and are never
imported into real inventories. Existing Spares uses its dedicated register and
existing movement URL; posting is controlled by backend permissions.

Server-owned codes, transactional movements, persistent references, audit metadata,
summary/history/report reads and duplicate-request protection are implemented and
tested in isolated databases. No shared database migration, role grant, deployment,
accounting journal posting or automatic record migration was performed. Browser QA
was blocked by the Computer Use URL-verification policy; no browser pass is claimed.

See [the full implementation report](../../backend/inventory/CATALOGUE_INTEGRATION.md)
for contracts, field mappings, safety boundaries, evidence, exact files and remaining
rollout work. Supplier/department/ledger labels remain metadata, valuation currency
is unspecified, and historical records are not assigned invented audit identities.
