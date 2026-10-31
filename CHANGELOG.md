

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
