# Recycling Module 2 — Recycled Materials

Implemented 26 October 2026 from `07.Rw_JULY_2026 (1).xlsx`, Sheet1 A1:AK17.
Fourteen material names are retained, with surrounding spaces removed. The source
records daily bag counts in C:AG, total bags in AH, kg in AI (`bags × 40`),
price/kg in AJ and amount in AK (`kg × price/kg`). Blank template rows and July
transactions are not imported into operational history. Workbook instructions
are reference content, not application authority.

## Entries and reports

Open Recycling, Module 2 (`/recycling?module=2`). Add date, material, positive whole
bags, price per kg, explicit currency and optional notes. The reference does not
identify currency, so the form requires selection rather than inferring one.
Price is entered per record; historical July rates are not assumed current.
40 kg per bag is fixed to the supplied reference. No other bag size or partial-bag
workflow is inferred. Additional unique material names are saved separately from
the Module 1 purchase catalog and cannot be renamed or deleted.

The server calculates kg and money using Decimal, with amounts rounded half-up
to two decimal places per entry. Monthly reports sum active entries by saved date;
multiple entries on one day accumulate. Different price/currency combinations
remain separate rows. Money totals never combine currencies.

GET `/api/recycling/materials/report/?month=YYYY-MM` returns the daily matrix,
entry details, bags/kg totals and currency totals. Append `&export=xlsx` for a
native Excel file containing Daily Bags, Bag Entries and Monthly Totals. Downloads
include all materials in the month even when the screen has a material filter.

## Persistence and access

The existing shared-entry commands persist `recycled-material-entries` and
`recycled-material-catalog`, with server actor/time, immutable revisions, command
UUID retry protection and expected-version conflict detection. No schema migration
is required beyond existing shared-entry and permission migrations.

Recycling Operator, Store Keeper, Accounts and Admin may write with shared-entry
change permission. Production Manager and Project Manager may read with view
permission. Demo or unloaded accounts cannot enter records. Saves show success
only after backend confirmation; failed pending saves retain the existing recovery UI.

Corrections and voids require a reason. Saved entries cannot be deleted, and voided
entries cannot be changed. Voids remain visible but do not affect report totals.

This is the bag register requested by the sheet. It does not infer consumption of
Module 1 purchases, inventory receipts, dispatches, QC acceptance or financial posting.

## Verification and rollout

Six Module 2 API tests and seven existing Module 1 tests pass on disposable SQLite:
conversion, same-day totals, changed rates/currencies, month boundaries, leap year,
rounding, permissions, validation, retries/conflicts, actor history, corrections,
voids, append-only catalog and Excel output. Django check and migration drift check
pass. Frontend TypeScript/build and shared-entry/register checks pass. The dedicated
Module 2 script checks server-rendered initial UI and selection. Browser interaction
and PostgreSQL concurrency remain unverified.

Deploy both the adjacent `Backend` application and frontend for the new endpoint
and shared-entry keys to be available on the configured remote API. No deployment
or live database change is performed by this implementation.
