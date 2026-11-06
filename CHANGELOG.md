### 6 November 2026 — Finance preview Batch 6 final QA

Aligned Dashboard and party balance summaries with the reconciled report ledger; added whole-unit chart scaling, unique sidebar destinations, global display states, clearer preview/illustrative labels and modal keyboard containment. Added comprehensive route/accessibility/accounting/preservation checks, repaired test-only dispatch browser cleanup, and documented the module integration plan and client walkthrough. No APIs or production configuration changed. [Final report](docs/finance-ui-preview-batch6.md).

### 6 November 2026 — Finance preview Batch 5

Added local fictional bank match/unmatch and exception summaries, balanced opening scenarios with independent demo review/corrections, and Finance Administration role/company/CA/readiness/audit presentation. Original report figures, operational modules and development-only boundary remain preserved. No live APIs or financial activation. [Review and validation](docs/finance-ui-preview-batch5.md).

### 6 November 2026 — Finance preview Batch 4

Added read-only General Ledger, Trial Balance, comparative P&L, Balance Sheet and receivable/payable aging from one reconciled fictional ledger. Shared Batch 3 reference invoices reconcile exactly; drafts remain excluded. Date/account/type filters and invoice drill-downs preserve the existing preview boundary and operational workflows. [Review and validation](docs/finance-ui-preview-batch4.md).

### 6 November 2026 — Finance preview Batch 3

Added demonstration accounting views for sales/purchase invoices, receipts/payments, balanced journals and linked credit/debit notes. Reusable document references and local history accompany validated session-only draft services. Operational workflows and disabled financial actions remain intact; no API integration. [Inventory and validation](docs/finance-ui-preview-batch3.md).

### 6 November 2026 — Finance preview Batch 2

Added Accounting Setup and Financial Masters inside the existing development-only preview. Validated local draft forms, account hierarchy, tax templates/mapping, party credit profiles and fictional banks reuse the existing shell. Financial actions remain disabled; no live integration. [Review report](docs/finance-ui-preview-batch2.md).

### 6 November 2026 — Finance preview Batch 1

Added an explicitly gated development-only Finance & Accounts Dashboard inside the existing React app. Fictional KPIs/charts, outstanding summaries, searchable transactions and accessible detail drawer use isolated in-memory fixtures. Existing login/sidebar/accounting preserved; financial actions disabled. [Inventory and test report](docs/finance-ui-preview.md).



### 6 November 2026 — Technical Finance readiness and CA ownership

Added neutral accounting-setup/posting policy metadata, reusable connection/setup-guide components and private manual connectivity diagnostics. CA guidance appears only after authenticated connectivity. Accounting setup/approval controls, COA retrieval and ERPNext posting remain deferred; existing application login/sidebar/routes/accounting are preserved.

### 6 November 2026 — ERPNext Finance status shell

Added `/finance/erpnext` with explicit Finance entitlement, access states and optional server-side read-only diagnostics. Existing login/sidebar/accounting preserved; ERPNext remains unavailable. No financial synchronization or migration. See [validation and limitations](../finance/docs/FINANCE_TEST_REPORT.md).

### Labour Job register usability — 29 October 2026

Added customer/material/colour filters, saved-name suggestions and empty-result messages. Frontend build, Module 2/3 static checks and 18 recycling API tests pass (SQLite). See [Labour Job](docs/labour-jobs.md).


### 29 October 2026 - Labour Job options

Added Module 3 side-panel forms for reusable materials and colours, backed by shared persisted options.


## 29 October 2026 - In-house waste delivery

Added Recycling Module 4: In-house Waste Delivery with daily material quantities, calculated totals, monthly valuation and Excel export. See [scope](docs/inhouse-waste.md).


### 29 October 2026 - Custom waste items

Added Module 4 Add waste item form, custom delivery quantity fields, monthly rates and dynamic register/Excel output.


### 30 October 2026 - Finance customer links

Finance customer ledgers can create or link ERP customers for Sales Orders. Sales filters include active customers without invoices and support refreshing customer choices. Existing ledger transactions are preserved.


### 31 October 2026 - Edit and delete ledgers

Admins can edit ledger names/groups under Finance → Masters → Ledgers and delete unused, unlinked custom ledgers. Financial history, ERP links, built-in accounts and pending posting references are protected; stale edits are rejected.


### 31 October 2026 - Cash/credit dispatch

Approved Sales Order dispatch shows the customer ledger balance, offers cash/credit, and saves the invoice plus any cash receipt atomically with Stock OUT. Customer ledger mapping uses the approved ERP customer ID.


### 31 October 2026 - Sales Management handles Stock OUT

Moved sales dispatch and cash/credit controls into Sales Management. Removed outbound entry actions from Stock; Stock IN and historical movement reporting remain.


### 31 October 2026 - Quotation ledger customer choices

Quotations refresh customer choices and show finance-only customer ledgers. Authorized users can explicitly link a ledger and select its saved customer identity without changing financial history.


### 31 October 2026 - Stock IN role mismatch

Unified legacy-superuser Admin role resolution between login and operational checks. Save failures distinguish permissions from conflicts and preserve exportable pending entries.


### 31 October 2026 - Wait for Stock IN backend readiness

Disable Stock IN saves until shared stock records are loaded and writable, with visible load errors and retry controls.


### 31 October 2026 - Automatic valuation unit

Valuation selects stock items and automatically uses their read-only unit. Ctn/ctn casing is accepted without relabeling history; genuine unit mismatches and backdated entries have separate errors.


### 31 October 2026 - Currency creation fields

Added reference-style currency display/words settings and live previews under Finance Masters. Settings persist with currencies; existing report/posting precision is unchanged. Requires accounting migration 0007_currency_display_fields.


### 31 October 2026 - Detailed Profit & Loss

Added company/customer P&L with trading and operating sections, group/ledger/voucher drill-down, cash/credit sales breakdown, supporting stock/purchase schedules and detailed CSV. Admin can classify direct/indirect expenses in Masters. Requires accounting migration 0008_account_pnl_section.


### 31 October 2026 - Day Book voucher popup

View voucher now opens visible modal details instead of rendering below the register. Supports close/Escape and existing journal/account navigation.


### 31 October 2026 - Download accounting voucher PDF

Day Book voucher details can download a backend-generated PDF with journal lines, items, allocations and as-of balances. Existing Finance permissions apply; downloads do not change accounting records.


### 31 October 2026 - Admin ledger row actions

Added visible Edit/Delete buttons beside existing ledgers at the top of Finance Masters. Editing focuses the existing form; deletion retains confirmation and all backend history protections.
# Release readiness — 6 November 2026

Prepared three independent repository boundaries, explicit cross-repository
preservation checks and a separate static fictional Finance demo. Operational
production Preview remains restricted; hosting-level demo protection is required.
