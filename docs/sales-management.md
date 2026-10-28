# Sales Management frontend — 28 October 2026

## Scope and navigation

Added /sales (Sales Dashboard), /sales/ledger, /sales/returns and /sales/credit-notes as internal horizontal tabs beneath the Sales Management heading. The sidebar contains one Sales link to /sales, highlighted for all four section routes. Existing Sales Orders and Quotations remain in that section and retain their routes. Existing invoice, dispatch and customer entry points remain untouched. Existing sidebar mobile scrolling/layout and role filtering are retained. No backend source, database, migration, authentication, API service contract, environment or dependency change was made. No deployment or merge was performed. Pre-existing Spares work was preserved and is not attributed to this Sales implementation.

The remaining PDF requirements were supplied. Inspection found browser Print / Save as PDF in QuotationPrint and QC/costing screens, but no programmatic PDF generator or PDF dependency. Credit notes reuse browser print/Save as PDF with a dedicated document projection. There is no automatic file download. Unapproved notes are watermarked DRAFT; approved previews remain APPROVED PREVIEW — NOT ISSUED. Official issuance is disabled because there is no backend-confirmed approval, permanent reference or issuance path. No dependency was installed.

## Data boundary

SalesManagementProvider is scoped to the Sales route, using the existing Auth and SalesOrders contexts. It reads existing invoice snapshots through the existing loadSharedEntries GET adapter and checks invoices read access. It never invokes the shared-entry writer, invoice create method or an inventory mutation. Loading, permission/API failure, invalid snapshots and genuinely empty registers are distinct. Invalid snapshots are excluded with a visible incomplete-totals warning. Existing invoices are not reclassified or overwritten.

Saved invoices lack authoritative issue/payment status, so the read-only projection labels them Recorded, not paid/issued/approved. A separately selected explicit example workspace contains example invoices; it is never substituted on API failure. New returns, inspections, credit notes and preview approvals live only in browser memory for the chosen source. Saved-invoice preview work remains account-scoped and is lost on refresh, logout or leaving Sales. Explicit example work is retained in module memory within the same tab across profile changes, so another signed-in demo profile can independently review it. A full refresh clears examples. Business invoice work is never placed in this shared example state. The page states these boundaries. No new browser storage or successful-server-sync messages were introduced.

The existing order customerId supplies customer identity when available. Otherwise each invoice has its own unlinked customer key; names alone do not merge customers. Unlinked invoice labels explain this limitation. Products and original units remain as invoiced; the module does not convert CTR, KG, Pieces or other existing units. Original batch is shown only for an available source batch; saved invoices currently expose none.

## Calculations and ledger

All money cards/charts are for one selected currency. Currency conversion is not assumed. Gross sales uses eligible invoice totals; Draft/Cancelled invoices have zero financial effect. Net Sales equals gross sales minus approved return adjustments. Credit notes require an approved return and document that already-recognized adjustment, so their ledger rows add zero credit and explicitly explain why. Only one non-rejected/non-cancelled credit note per return is permitted. Standalone/unlinked credit adjustments are not invented.

Tax-exclusive net, existing VAT and existing LED are separated. Net amount derives from stored total minus stored VAT/LED, preserving discounts and rounding already represented in the invoice. Invoice-line allocations reconcile integer cents using proportional line amounts and largest remainders. Partial return allocations use cumulative returned quantity; the last eligible return consumes the remaining rounded cents. No VAT rate, LED formula, FX or tax jurisdiction is invented. Credit-note VAT/LED fields are read-only copies of the approved return allocations, not tax-authority-certified calculations. Confirmation of jurisdictional adjustment rules remains necessary for backend production use.

Ledger rows include sale/return/credit reference, original invoice, customer, product, quantity/unit, debit, credit, running customer sales balance, return/credit reason, status and detail actions. Running balances are chronological per customer and currency over full available history before date/search/product filters. The UI/CSV explain that a date-filtered opening can therefore include earlier sales. These are sales-document balances, not accounting receivables. Payments, opening balances and valid receivable adjustments are not integrated; outstanding receivables is therefore unavailable, not fabricated as zero.

Filters cover date range, customer, product, invoice status, currency and search. Pagination follows filtering. CSV exports all matching rows, including notes about balance semantics, with quoting and spreadsheet formula protection. Dashboard charts show monthly sales, customer-wise sales, and sales versus approved returns. Recent sale and return lists use the same filtered ledger model. Selected-customer summaries retain returned quantities separately by unit.

## Returns and credit-note workflow

Returns record provisional reference/date, customer, original invoice, original order, invoice line/product, available batch, sold/previously approved returned quantities, return quantity/unit, original unit price, allocated amount, reason, condition, remarks, attachment metadata and status. Attachments have a 5 MB UI limit; only filename/size/type metadata is retained. There is no upload or retained file content.

Only a valid original non-Draft/non-Cancelled invoice line is selectable. Return quantity must be positive, finite, at most six decimal places, and no greater than sold minus earlier approved quantities. Draft creation/edit and approval validate this. Pending returns do not reserve quantity; competing pending returns are checked again at approval. Frozen invoice snapshots preserve original details even if the read source changes later. No status increases Finished Goods stock. A Sales-scoped QC inspection preview records Pass/Fail/Hold, quantity, findings and history. Partial inspections and Fail/Hold do not establish restocking eligibility; even a full Pass still requires a separate authorized physical restocking decision. Inspection does not change approval status, return capacity or financial totals. Reinspection appends history rather than overwriting evidence. Persistent QC and stock-disposition integration remain future backend workflows.

Credit-note creation requires an approved return. Invoice, return, product, quantity, original price, net/VAT/LED/total are frozen. Reason/date/remarks can be edited only on Draft. References are SR-PREVIEW / CN-PREVIEW with session counters, never backend identities. Cancellation does not reuse a sequence in the same workspace.

Statuses: Draft -> Submitted -> Pending Approval -> Approved or Rejected; pre-approval cancellation is permitted. Approved/Rejected/Cancelled records are terminal; no silent deletion/reversal is offered. Drafts can be edited. Actions require remarks and append authenticated profile plus actual browser timestamp to the session history, which is explicitly not a permanent audit trail.

Existing role vocabulary is reused for preview controls: admin/accounts/receptionist may prepare and submit; admin/accounts may independently review; project_manager/production_manager can view without financial approval. Creators, editors and submitters cannot mark their own document pending, approve or reject it, even as Admin. No existing self-approval exception was found, so none is inferred. Missing submission history fails closed. QC Inspector/Supervisor can access only /sales/returns within Sales, inspect submitted/pending/approved returns, and append Pass/Fail/Hold findings with inspected quantity, authenticated profile and actual browser time. They cannot create/approve credit notes. The existing QC route restriction allows the /sales landing link and /sales/returns only; the landing redirects QC profiles to their existing Returns-only view; existing QC routes are preserved. No backend grant or authentication mechanism changed. These are frontend restrictions only; permanent authorization requires future backend enforcement.

## Exact files for this Sales change

Modified existing source:
- src/App.tsx — imports/nested Sales routes and a narrow QC-role allowance for /sales and /sales/returns (with the existing QC Returns-only guard).
- src/components/layout/AppShell.tsx — renders the single SalesNavigation link at the existing Sales heading and adds a Sales group for QC profiles; existing links/layout retained.

Created source:
- src/lib/salesManagement.ts
- src/context/SalesManagementContext.tsx
- src/pages/Sales/SalesNavigation.tsx
- src/pages/Sales/SalesTabs.tsx
- src/pages/Sales/SalesWorkspace.tsx
- src/pages/Sales/SalesDocuments.tsx
- src/pages/Sales/SalesReturnInspection.tsx
- src/pages/Sales/CreditNotePrint.tsx
- src/pages/Sales/sales.css
- scripts/check-sales-management.mjs

Documentation: this file (new), plus additive Sales entries in DEVELOPMENT_STATUS.md, BACKEND_TODO.md, DATA_MODELS.md, BUSINESS_RULES.md and CHANGELOG.md. No prior Spares/Consumables implementation documentation was removed.

## Verification

The focused check exercises invoice/customer/line projections, frozen source data, role/status validation, invalid/over-returned quantities/dates, competing pending approvals, cancellation/rejection exclusion, net/VAT/LED rounding including inclusive prices, duplicate credit prevention, approved return/credit deduplication, customer/date/product/status/currency filters, running balances, CSV quoting/formula protection, active nested links and accessible chart values. Network and storage writes are blocked in this check. It is a helper/SSR test, not a real browser interaction test.

All 27 frontend check-*.mjs scripts were executed after implementation. Build/typecheck and exact final outcomes are recorded below after completion. No backend suite was rerun because backend code is excluded from this task. Previous backend prepare_quote failures are outside scope and were not modified. Browser/mobile clicks, native-dialog print layout and real-account invoice permission/loading acceptance remain unverified; server persistence/authorization/tax/QC/payment and official issuance workflows remain pending backend integration.


Final results: **27/27 frontend scripts passed**. The focused Sales script was rerun successfully after the final preview-confirmation change and extra snapshot/rejected-credit assertions. Final `npm run build` (which runs TypeScript build checks) passed; standalone tsc -b also passed. Existing SSR useLayoutEffect and >500 kB bundle warnings remain (main JS approximately 1.27 MB). No lint command/configuration is available. Git diff --check passed. No new failing check remains in executed frontend coverage.

Evidence: [all script exit codes](../../Gap-Analysis/sales-management-checks/sales-management-all-results.json), [final focused Sales check](../../Gap-Analysis/sales-management-checks/sales-management-focused.txt), [final build](../../Gap-Analysis/sales-management-checks/sales-management-build.txt), plus individual check logs in that directory. Evidence files were moved out of backend/tmp into Gap-Analysis; no backend source or database was modified.


## Continuation validation — supplied remaining requirements

Implemented the supplied approval/QC/PDF conditions without changing backend code, API contracts, stock, quotations or the existing invoice creation path. Added SalesReturnInspection.tsx and CreditNotePrint.tsx; updated only Sales domain/context/UI/tests, the narrow /sales/returns QC route allowance, Sales navigation and affected documentation.

PASS: standalone TypeScript build check; focused Sales helper/SSR checks; all 27 frontend scripts; final production build. New tests verify self-review denial for Admin creators, editors and submitters; distinct accounts reviewer; no QC/Production Manager financial authority; QC inspection role/quantity/status validation, append-only reinspection history, partial/full-pass readiness and unchanged sales totals; QC-only Sales Returns navigation; company/contact/tax/reference/quantity/value print content; DRAFT and approved-preview/non-issued watermarks; official issuance unavailable. Existing sales, quotation, inventory, auth and other frontend checks also passed. No new failing frontend check remains. Existing SSR useLayoutEffect and large-JS-chunk build warnings remain.

Evidence: [all continuation exit codes](../../Gap-Analysis/sales-management-checks/sales-continuation-results.json), [focused continuation tests](../../Gap-Analysis/sales-management-checks/sales-continuation-focused.txt), [production build](../../Gap-Analysis/sales-management-checks/sales-continuation-build.txt), and continuation-check-*.txt logs in that directory. No backend tests were run because no backend code was changed.

UNVERIFIED: native browser clicks/print output, mobile layout, actual browser PDF file creation, and real-account permission/API acceptance. BLOCKED for production: backend-authorized cross-user business-document approval, permanent audit/reference/persistence, actual QC disposition/stock commands and official credit-note issuance. The existing frontend has browser print support but no programmatic PDF generator; the UI does not fake a generated download or official approval. Example data can be handed between different signed-in profiles in one tab for independent-review demonstration. Actual saved-invoice preview work remains account-scoped; it is not a shared approval queue.


## Sales sidebar and tabs layout update

The sidebar now renders exactly one Sales link, to /sales, active for all /sales/* section routes. Quotations, Sales Orders and other sidebar entries retain their positions and behavior. The page order is heading, horizontal green section navigation, data source/notices, filters and the existing routed section content. Tabs use React Router NavLink; /sales defaults to the existing Dashboard index route, while /sales/ledger, /sales/returns and /sales/credit-notes remain working deep links. The tab bar scrolls horizontally on narrow screens. Existing QC access remains Returns-only; no financial pages or approval privileges were granted.

Common filters and document-status filters are stored per section in the persistent Sales frame. Existing workspace records/drafts remain in the same provider when switching section routes. When an open form dialog is present, cancelling the tab-switch confirmation keeps its unsaved inputs; confirming closes it and unsaved input may be discarded. This does not add persistence across refresh/logout or browser-level navigation. No ledger calculation, return validation, credit approval, source API, QC or print calculation changed.

Files changed for this layout correction: src/pages/Sales/SalesNavigation.tsx; new src/pages/Sales/SalesTabs.tsx; src/pages/Sales/SalesWorkspace.tsx; src/App.tsx (allow existing QC Sales landing through to its Returns redirect); scripts/check-sales-management.mjs; docs/sales-management.md; docs/DEVELOPMENT_STATUS.md; docs/CHANGELOG.md. The sidebar shell and all business helper/context files were unchanged by this correction. Existing unrelated uncommitted work remains untouched.

Focused tests assert one sidebar link on all four URLs, four internal links with exactly one active destination, QC Returns-only navigation, preserved route declarations, per-section filter storage, page ordering and unsaved-dialog confirmation behavior. The existing calculation/validation/approval/PDF-preview checks remain in the same test. Actual native browser/mobile clicks remain unverified.


Layout validation result: **27/27 frontend check scripts passed**, standalone `tsc -b` passed and final `npm run build` passed. Existing SSR useLayoutEffect and >500 kB chunk warnings remain. `git diff --check` passed. Evidence: [tab-focused checks](../../Gap-Analysis/sales-management-checks/sales-tabs-focused.txt), [all script exit codes](../../Gap-Analysis/sales-management-checks/sales-tabs-results.json), [production build](../../Gap-Analysis/sales-management-checks/sales-tabs-build.txt). Native browser/mobile interactions and native printing were not manually tested. Business domain helper/context files, backend services and calculations were unchanged by this navigation/layout correction.
