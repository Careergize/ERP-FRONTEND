# Recycling Module 3: Labour Job

Based on the supplied June 2026 workbook's Material IN / OUT columns: date,
customer, material type, colour and quantity. Both directions are explicitly kg.
The workbook is a format reference; historical rows are not imported automatically.

Entries persist through `labour-job-entries` in the existing versioned SharedEntry
store. Operator, Store, Accounts and Admin can write; Production Manager and
Project Manager can also read. Existing shared-entry permissions still apply.
Corrections require a reason; voided records are immutable; deletion is rejected.
Existing command IDs, expected versions and management history retain retry,
conflict and audit behavior. No migration is needed.

`GET /api/recycling/labour-jobs/report/?month=YYYY-MM` returns monthly entries,
IN/OUT totals and exact customer/material/colour groups. Recorded opening includes
all earlier active entries; closing = opening + IN - OUT. These are recorded
balances, not assertions of verified physical stock. Negative balances are shown
for reconciliation. Names and colours are not normalized or merged. Quantity is a
positive decimal with up to three fractional digits. Optional `export=xlsx`
returns Summary, Material IN and Material OUT sheets; voids appear in detail only.

No labour billing rate was supplied. No charges, automatic stock movements,
conversion yields or accounting postings are inferred.

Validation: five Module 3 API tests plus thirteen Module 1/2 regression tests pass
on disposable SQLite; Django checks and migration drift pass. Frontend build
includes TypeScript checking. PostgreSQL concurrency and browser visual checks
were not exercised.


## 29 October 2026 — Labour Job register usability

Module 3 now filters the summary and both movement registers by exact customer,
material and colour. Clear filters restores the full view. Monthly totals and
Excel exports remain for the complete month and the UI states that scope.
Entry fields suggest names already saved in the register while still accepting
new values. Empty summaries and filtered registers show explicit messages.
Frontend build and Module 2/3 static rendering checks pass. All 18 recycling API
tests pass on disposable SQLite. Browser interaction and PostgreSQL concurrency
remain unverified.


### 29 October 2026 - Labour Job options

Added a Materials & colours side panel beside the entry form. Authorized writers can add named material/colour options independently of a movement. Saved options populate suggestions and filters across months; saving fills the open entry field. Options persist in labour-job-options with version checks, audit history, case-insensitive duplicate rejection per kind and no rename/delete. Existing entry names remain valid. No migration required. Frontend build/static check and 19 recycling API tests pass (SQLite); browser interaction remains unverified.
