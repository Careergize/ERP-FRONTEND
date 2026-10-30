# Recycling Module 4 - In-house Waste Delivery

Reference: supplied 08.WDN_August_2026.xlsx, Sheet1 daily grid A1:L38 and
valuation Q15:T25. Reference rows are not automatically imported.

Daily entry fields (kg, nonnegative, up to 3 decimal places): HDPE Black,
Color, Clear, Printed; LDPE Color, Clear, Printed; PP Clear / Printed.
Date, notes, status and correction/void reason complete the register. One active
sheet per date prevents accidental duplicate daily totals. Zero is an explicit
no-delivery value; unrecorded days are not created as zero records.

HDPE total sums four fields, LDPE sums three, PP equals its single field;
all-waste total sums all eight. Monthly totals exclude voids. Repeated weighings
can be combined into the daily category quantity. Formula expressions are not
accepted as input. Recorded corrections require a reason; voids are immutable;
physical deletion is rejected. Versioned SharedEntry history retains actor and
prior content. No new database migration is required.

Monthly rate groups reproduce the workbook mapping:
- Black: HDPE Black; suggested rate 2000/kg.
- Clear LD: LDPE Clear; suggested rate 2500/kg.
- Clear & Color: HDPE Color + Clear + Printed and LDPE Color + Printed;
  suggested rate 2400/kg.
- PP: PP Clear / Printed; suggested rate 2500/kg.

Rates are suggestions until explicitly saved for the month with a currency code.
Missing rates yield unavailable amounts, never false zero values. Each group
amount is quantity times rate, rounded half up to 2 decimals; total sums group
amounts. Rate corrections require a reason and retain history. No payments,
accounting or physical inventory postings are inferred from this delivery sheet.

Source reconciliation: the component quantities total 12841.3 kg, whereas the
sheet's S25 shows 12331.8 kg. F16 is hard-coded zero despite 509.5 kg of HDPE;
J6 contains whitespace despite 24.3 kg of LDPE. J38 totals the LDPE component
columns, so J6 does not affect its monthly result. Module 4 calculates every daily
total from inputs. Reference category totals reconcile to 27126100.00 at the
reference rates; currency is not stated in the workbook and must be confirmed.

Storage: inhouse-waste-entries and inhouse-waste-rates. Admin, Accounts,
Store Keeper and Recycling Operator can write with shared-entry change permission;
Production/Project Managers can read. GET /api/recycling/inhouse-waste/report/
?month=YYYY-MM returns details, totals, rates and valuation. export=xlsx returns
Waste Delivery and Valuation worksheets, including voided details and active totals.
Excel text is literal. Existing names and other recycling keys remain separate.

Validation: frontend TypeScript/Vite build and Module 3/4 static rendering checks
pass. All 23 recycling API tests pass on disposable SQLite, including reference
reconciliation, validation, permissions, corrections/voids, conflicts, and export.
Django system checks and migration drift pass. Browser interaction, PostgreSQL
concurrency, native Excel visual review and deployment remain unverified.


### 29 October 2026 - Custom waste items

Module 4 now includes Add waste item with a material/colour name. The shared
inhouse-waste-items catalog stores immutable {id, name} records; names are unique
ignoring case and cannot duplicate built-in category/group labels. Existing
Module 4 write roles and capabilities apply. No migration is required.

Each custom item adds a kg field to daily deliveries, a separate monthly rate,
a register column and Excel columns/valuation row. Extra quantities contribute
to All waste, not the built-in HDPE/LDPE/PP subtotals. Name the full material and
colour (for example HDPE Blue); custom items remain independently valued.

Entries optionally store extraQuantities keyed by catalog ID; rates optionally
store customRates keyed by the same ID. Existing records without these fields
remain valid and are never rewritten when adding an item. Earlier sheets have
no quantity recorded for a newly added item; absent custom fields contribute zero
to recorded totals. Unknown item IDs and invalid decimals are rejected.
Missing rate with a positive custom quantity leaves the overall monetary amount
unavailable. A zero-quantity item without a rate contributes zero to valuation;
explicit zero rates are supported. The rates form requires every current custom
item rate when saving. Corrections/voids and history rules still apply.

Validation: frontend build and Module 4 static check pass; 24 recycling API tests
pass on disposable SQLite, including custom catalog validation, unknown IDs,
new-item valuation, missing rates, legacy data, voids and Excel export. Django
checks and migration drift pass. Browser interaction and PostgreSQL concurrency
remain unverified.
