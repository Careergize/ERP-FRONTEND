> Historical Batch 4 report. See the [Batch 5 review](finance-ui-preview-batch5.md) for reconciliation, opening scenarios and administration.

# Finance UI Preview — Batch 4 review

6 November 2026 · Asia/Calcutta

Batch 4 implements read-only ledger and financial reports in the existing React Finance Preview. Batch 5 has not started. No commit, push or deployment was performed.

## Screens completed

- **General Ledger**: account-wise history, date/account/type filters, linked documents, debit/credit movements, signed running balances and opening/closing balances. A type filter hides rows while preserving full-account running and summary balances; the UI explains this behavior.
- **Trial Balance**: account hierarchy, group subtotals, signed opening balances, debit/credit movements, closing debit/credit balances and a balanced validation indicator. Totals use leaf accounts only, avoiding duplicate group aggregation.
- **Profit and Loss**: revenue, cost of sales, operating expenses, gross/net profit, account breakdown and date filters. Comparison uses the preceding equal-length inclusive period; it is explicitly unavailable if it falls outside dataset coverage.
- **Balance Sheet**: assets, liabilities, equity and account hierarchy, with category totals and equation validation. Equity includes current-year earnings from the same ledger-derived P&L, shown separately from capital; no closing entry is claimed.
- **Receivables Aging and Payables Aging**: profile balances, Current/1–30/31–60/61–90/90+ buckets, invoice drill-down with gross/settled/outstanding, and control-ledger reconciliation. As-of dates are explicit and editable within dataset coverage.

All six views reuse the Navapack shell, typography, colors, Card, page header, data table, detail drawer, restricted controls and linked-document component. Reports expose no editing or saving controls. Posting, approval, export, printing and activation buttons remain disabled.

## One reconciled dataset

`reportData.ts` centralizes 15 report accounts (including hierarchy groups), 19 fictional accounting documents and 39 balanced ledger lines. Every report reads an identical isolated copy from this single factory. There are no independent report totals or separate aging balances.

Coverage is **1 January–6 November 2026**, inclusive, with an explicit balanced opening entry on 1 January. The default movement period is **1–6 November 2026**. The default Balance Sheet and aging as-of date is **6 November 2026**, using UTC calendar dates rather than the browser timezone or live clock. Dates outside coverage and reversed/invalid ranges withhold reports.

The exact two immutable Batch 3 reference invoices are imported from the existing fixture factory:

- `DEMO-SALES-REF-01`: gross UGX 10,000; historical fictional receipt UGX 2,000; outstanding UGX 8,000.
- `DEMO-PURCHASE-REF-01`: gross UGX 6,000; historical fictional payment UGX 1,000; outstanding UGX 5,000.

Their IDs, references, dates, parties, currencies, lines and snapshot settlement values match Batch 3 exactly. The report ledger records those fictional settlements on **3 November 2026**; earlier as-of dates correctly exclude the later settlements. Report-only metadata gives these invoices illustrative due dates of 15 and 20 November respectively. Ten older fictional invoices demonstrate all aging buckets. They do not create operational invoices.

**All editable Batch 3 drafts are excluded.** Browser tests save a receipt plan, confirm it remains present in Batch 3, and verify the report balances do not change. The UI explicitly explains this boundary. Batch 1 Dashboard and Batch 2 profile snapshots are independent demonstrations and are not combined with the reports. The fixed report account hierarchy and classifications are separate from editable Batch 2 master drafts.

Report invoices use zero illustrative tax and the existing scaled-integer line helper. UGX values are whole currency units. Quantities/rates use the same shared rounding convention as Batch 3; no floating-point financial accumulation or FX conversion is introduced. Nonzero tax report fixtures fail validation rather than silently becoming revenue or inventory. Classifications, due dates, cost recognition and opening balances are fictional examples, not Navapack policy or CA approval.

Aging uses days past explicit invoice due dates: Current includes due today/future, then 1–30, 31–60, 61–90 and **more than 90** days. Receivable and payable balances are not netted. Dated settlement lines determine outstanding amounts as of the selected date.

## Reconciliation results

As of 6 November 2026:

- November debit movements **UGX 23,500** equal credit movements **UGX 23,500**.
- Trial Balance closing debits **UGX 140,250** equal closing credits **UGX 140,250**.
- November revenue **UGX 10,000**, cost of sales **UGX 4,000**, operating expenses **UGX 500**, gross profit **UGX 6,000**, net profit **UGX 5,500**.
- Year-to-date net profit **UGX 7,750** matches Balance Sheet current-year earnings.
- Assets **UGX 134,500** = liabilities **UGX 6,750** + equity **UGX 127,750**. Equation difference is zero.
- Receivable aging **UGX 11,500** equals the receivable control ledger; payable aging **UGX 6,750** equals the payable control ledger.
- Receivable buckets: Current **8,500**, 1–30 **600**, 31–60 **700**, 61–90 **800**, 90+ **900**.
- Payable buckets: Current **5,250**, 1–30 **300**, 31–60 **350**, 61–90 **400**, 90+ **450**.

The focused suite verifies GL/TB/Balance Sheet/aging reconciliation for **all 310 calendar dates** in coverage, including dates before invoices and settlements. Every ledger document balances. It tests exact 0/1/30/31/60/61/90/91-day aging boundaries, prior-period comparison, immutable Batch 3 parity, independent fixture copies, invalid dates, malformed hierarchy, changed invoice values, altered settlements, nonzero tax, invalid opening dates and missing control accounts. Dataset validation failures withhold the reports.

## Changed-file inventory

All paths below are relative to `F:/WORK/ERP/frontend/`.

New source:

- `src/finance/reportData.ts` — typed report accounts/documents/lines, coverage dates, metadata and consistent fixtures.
- `src/finance/reportMath.ts` — ledger, hierarchy roll-ups, trial totals, P&L, Balance Sheet, dated aging, comparison periods and validation.
- `src/pages/FinancePreview/FinanceReportsPage.tsx` — six read-only views, filters, reconciliations and drill-downs.

Modified source:

- `src/pages/FinancePreview/FinancePreviewRoutes.tsx` — approved report routes.
- `src/components/finance/preview/FinancePreviewLayout.tsx` — report navigation.
- `src/finance/navigation.ts` — removes completed ledger/report items from future modules.

Checks:

- New `scripts/check-finance-reports.mjs` — numeric reconciliation, boundary and corruption checks.
- New `scripts/check-finance-reports-browser.mjs` — report interactions, cross-screen consistency and responsive evidence.
- Modified `scripts/check-finance-preview-browser.mjs` — invokes report checks while retaining earlier batches, checks production report-fixture exclusion and records Batch 4 evidence.

Documentation:

- New `docs/finance-ui-preview-batch4.md` — this review.
- Modified `docs/finance-ui-preview-batch3.md` — historical-report pointer.
- Modified `docs/DEVELOPMENT_STATUS.md`, `docs/DATA_MODELS.md`, `docs/BUSINESS_RULES.md`, `CHANGELOG.md` — current report scope, data model and fictional conventions.

Generated evidence:

- `docs/evidence/finance-preview-batch4/`: 14 report PNGs (six desktop/mobile pairs plus two mobile aging drill-downs).
- `browser-check.log`, `reconciliation.log`, `build.log`, `preview-preservation.log`, `transaction-preservation.log` in that evidence directory.
- Validation refreshed ignored dist/cache/TypeScript metadata. No generated output was deployed.

No existing Batch 1/2/3 data, service, editor or operational files were edited. No backend, database, Frappe, Docker, authentication, FinanceEntitlement, dependency or deployment configuration changes. Git-based status/diff remains unavailable in this mounted workspace; this inventory records files written during the batch, backed by the existing source-hash checks.

## Validation and browser evidence

Passed:

- `node node_modules/typescript/bin/tsc --noEmit --incremental false`.
- `npm run build`, with VITE_FINANCE_UI_PREVIEW=true. The development-only preview remains denied in production; all preview fixture sentinels are excluded from production JavaScript.
- `node scripts/check-finance-reports.mjs`: reconciliation and boundary results above. [Recorded output](evidence/finance-preview-batch4/reconciliation.log).
- `node scripts/check-finance-preview.mjs`: original 15 protected-file hashes, original routes/sidebar constants, dev gate, **34 isolated preview dependencies**, fixture/abort/monetary/chart/restricted-action checks and master validation.
- `node scripts/check-finance-transactions.mjs`: existing **566 operational/backend/Docker hashes** plus transaction arithmetic, linked documents, allocations, notes, journal balancing and atomic drafts.
- `node scripts/check-finance-preview-browser.mjs`: all prior Batch 1/2/3 interactions plus six report views, date/account/type filters, GL running balance behavior, invalid-range withholding, TB totals, P&L comparative/YTD values, Balance Sheet equity/equation, aging/control reconciliation, dated settlement behavior, invoice drill-downs, draft exclusion/retention/reset and disabled financial actions. [Browser log](evidence/finance-preview-batch4/browser-check.log).
- Existing `check-finance-gateway.mjs` and `check-finance-gateway-browser.mjs`: entitlement/loading/error/retry/revocation/stale-user/logout/unavailable launch preservation.
- Existing `check-auth.mjs`, `check-accounting.mjs`, `check-led-finance.mjs`, `check-integrated-operations.mjs`, `check-sales-fulfillment.mjs`, `check-inventory-workflows.mjs`, `check-quality.mjs`, `check-production-workflow-errors.mjs`.
- Existing `check-dispatch-sale-browser.mjs` with CHROME_PATH pointing to installed Edge printed PASS for operational approved-order dispatch, ledger-balance display, cash/mobile-money and credit paths, invoice refresh and the balance-load error guard. Its runner then remained active in teardown and was interrupted locally after the passing assertions; a normal completion exit is not claimed for this auxiliary run. Synthetic contexts only; no source was changed.

Headless Edge checks use **1440×1000 desktop** and **390×844 mobile** sizes. No document-width overflow was detected. Wide tables scroll in their own regions; the existing sidebar scrolls independently. Representative Trial Balance/P&L desktop and aging mobile/drill-down screenshots were visually inspected. The main preview suite uses disposable profiles/servers and exited normally. The auxiliary dispatch runner was stopped locally after its passing assertions because teardown remained active.

Request auditing confirms **zero Finance Preview API requests**, including while writing the exclusion-test draft with a synthetic stored token. Existing tokens remain unchanged. No unexpected external requests or runtime/console errors were observed; existing shell font requests are allowed in auditing. DEV flag-off and production denial are verified. No Django or financial service was connected; backend tests were not rerun because this is frontend-only work.

Screenshots: [General Ledger desktop](evidence/finance-preview-batch4/report-ledger-desktop.png), [Trial Balance desktop](evidence/finance-preview-batch4/report-trial-balance-desktop.png), [P&L desktop](evidence/finance-preview-batch4/report-profit-loss-desktop.png), [Balance Sheet desktop](evidence/finance-preview-batch4/report-balance-sheet-desktop.png), [Receivables mobile](evidence/finance-preview-batch4/report-receivables-mobile.png), [Payables invoice drill-down](evidence/finance-preview-batch4/report-payables-drilldown-mobile.png).

## Remaining limitations

- Fixed fictional period and dataset; no real accounting, posting, approval, payment, export, printing or activation.
- Editable transaction drafts are intentionally excluded. There is no automatic posting simulation, master-policy synchronization or reconciliation with independent prior Dashboard/profile snapshots.
- Only zero-decimal UGX/zero-tax report fixtures; no FX, consolidation, compound tax, closing adjustments or approved policy classifications.
- Comparison uses a preceding equal-length period, not a full prior month/year. Balance Sheet and aging are cumulative as-of reports, rather than movement-period reports.
- Example aging includes one customer and one supplier with six invoices each. Due dates are explicit fictional metadata, not derived from unapproved credit terms.
- The auxiliary existing dispatch browser runner remained active after printing PASS and required a local stop during teardown; the main preview and report browser suite completed normally.
- The existing production bundle-size warning and previously documented relative-base/deep-link hosting limitation remain. This preview remains development-only.

## Batch 5 recommendation

Propose a separately approved **Bank Reconciliation and Opening Balances preview** using the same reconciled report dataset. Show fictional statement-to-ledger matching, unmatched items, opening-balance validation and a clearly separated draft scenario without changing the immutable baseline. Keep report and control-ledger consistency tests across that scenario, and retain disabled posting/approval/import/export/activation.

Before live integration, obtain CA decisions on account classifications, due-date terms, currency precision, tax, cost recognition and period closure, along with separately approved API/authorization contracts. No such integration has been started.

Stopped after Batch 4 for review.
