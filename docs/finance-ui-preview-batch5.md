> Historical Batch 5 review. See [Batch 6 final frontend QA](finance-ui-preview-batch6.md) for the unified Dashboard/profile/report figures, final validation and integration/demo deliverables.

# Finance UI Preview — Batch 5 review

6 November 2026 · Asia/Calcutta

Batch 5 is complete for frontend review. Batch 6 has not started. No commit, push or deployment was performed.

## Completed screens and behavior

**Bank Reconciliation**

- Bank selector, fictional statement table and the accounting bank ledger derived directly from Batch 4.
- Suggestions use an explicitly illustrative rule: same bank, equal signed amount and dates within three days. Suggestions do not apply themselves.
- Manual selection/match, accept suggestion and unmatch actions affect only session state. Each row may belong to one match; mismatched signs/amounts and reused rows are rejected.
- Date and absolute-amount filters, matched/unmatched totals, opening/closing balances, raw difference, explained residual and unresolved exception indicators.
- Filters affect tables only; summary/suggestions retain the full fixed statement period, visibly disclosed in the UI. Empty/unmapped bank examples never imply successful reconciliation.

**Opening Balances**

- Company and fiscal-year selection, account-wise debit/credit editor, add/remove rows, customer/supplier subledgers and opening summary.
- Positive balanced whole-unit totals, unique non-group balance-sheet accounts, one-sided account values and AR/AP-to-party reconciliation.
- Separate entry and review/correction views. Unsaved editor changes cannot be prepared for review.
- Maker/checker separation, role/company eligibility, assigned-reviewer enforcement, required correction reasons, review-time edit lock, revision checking and resave/review cycle.
- Stages are only Draft, Awaiting demo review and Correction requested. No approved or posted state exists.

**Finance Administration**

- Four fictional users/roles, company-access overview and a demonstration permission matrix.
- Maker/checker workflow explanation, local CA reviewer/notes/checklist configuration, readiness dashboard and activation prerequisites.
- Full CA checklist completion still leaves policy approval pending and activation blocked.
- Local audit history, recent-event summary and full-history drawer. No production audit trail or user provisioning is implied.

Existing Navapack shell, typography, colors, Card, page header, tables, drawers and restricted actions are reused. The Dashboard’s empty future-modules footer is hidden now that its planned modules are implemented; Dashboard calculations and interactions are unchanged.

## Consistent figures and isolation

The bank period is **1–6 November 2026**, using immutable Batch 4 bank ledger lines:

- Opening **UGX 99,750**.
- Receipt **+2,000**, payment **−1,000**, operating expense **−500**.
- Ledger closing **UGX 100,250**, exactly matching the General Ledger.

The fictional statement uses the same opening and receipt/payment, plus a statement-only charge **−100**:

- Statement closing **UGX 100,650**.
- Raw statement-minus-ledger difference **UGX 400**.
- Two suggested pairs: receipt and payment. After matching, matched signed net is **UGX 1,000**, absolute matched amount **UGX 3,000**.
- Remaining exceptions: statement **−100** and ledger **−500**. Their explained residual is zero, but the screen correctly stays **not reconciled** with two unresolved rows. No charge or expense adjustment is posted.

The primary company’s **2026 opening scenario** is cloned from the exact Batch 4 January opening: bank debit **100,000**, inventory debit **20,000**, capital credit **120,000**. This January balance differs appropriately from the November reconciliation opening because they represent different dates.

Opening edits are explicit isolated scenarios and never change reports. The focused test corrects a scenario to **UGX 120,500 Dr = Cr**, including customer/AR **500** and supplier/AP **300**. Browser tests then add one unit to bank/capital during a second correction, so the readiness screenshot shows **120,501 Dr = Cr**. Those are local scenario revisions, not alternate report totals. Batch 4 assets remain **134,500**, bank closing **100,250**, AR **11,500**, AP **6,750**, and all 310-date reconciliation tests still pass.

Other company/year selections start empty, with no assumed carry-forward. Fiscal years 2026/2027 and two fictional companies are demonstration choices, not actual Navapack setup. CA configuration/personas here are isolated presentation data; they do not overwrite Batch 2 masters or real login/entitlement state.

## Restrictions

All actual posting, approval, activation, bank synchronization and export controls are disabled. Local matching, opening saves, review/correction presentation and CA checklist saves are the only new mutations, and they update memory only. No service method grants permissions, activates Finance, approves balances or creates an opening journal.

The maker/checker rules operate on selected fictional personas. They are not authentication or proof of real independent approval. Only the assigned eligible different demo reviewer may request a local correction. Resaving clears the assignment and requires new review. Completing the checklist never grants readiness or activation.

The new provider is inside the existing keyed reset lifecycle. Navigation retains saved local drafts/matches/checklists; reset, exit and refresh discard them. All figures use the existing bounded whole-unit UGX parsing convention. No FX, unapproved tax rules or actual accounting policy was introduced.

## Exact changed-file inventory

Paths are relative to `F:/WORK/ERP/frontend/`.

New implementation files:

- `src/finance/administrationData.ts` — typed fictional banks/statements, report-derived movements, companies, roles/personas, opening drafts and CA fields.
- `src/finance/administrationService.ts` — local matching, summaries, opening validation/revisions/review/correction, CA configuration and audit events.
- `src/finance/FinanceAdministrationContext.tsx` — session state adapter and local command wrappers.
- `src/pages/FinancePreview/FinanceAdministrationPage.tsx` — reconciliation, opening entry/review and administration screens.

Modified implementation files:

- `src/finance/FinanceDemoContext.tsx` — resettable administration provider nesting.
- `src/pages/FinancePreview/FinancePreviewRoutes.tsx` — three approved routes.
- `src/components/finance/preview/FinancePreviewLayout.tsx` — navigation entries.
- `src/finance/navigation.ts` — clears the now-completed future module list.
- `src/pages/FinancePreview/DashboardPage.tsx` — hides only the empty planned-module footer.

Checks:

- New `scripts/check-finance-administration.mjs` — matching/accounting/review/isolation validation.
- New `scripts/check-finance-administration-browser.mjs` — Batch 5 interactions and screenshots.
- Modified `scripts/check-finance-preview-browser.mjs` — adds Batch 5 coverage, evidence location and production-fixture exclusion while retaining all earlier assertions.

Documentation:

- New `docs/finance-ui-preview-batch5.md` — this review.
- Modified `docs/finance-ui-preview-batch4.md` — historical-report pointer.
- Modified `docs/DEVELOPMENT_STATUS.md`, `docs/DATA_MODELS.md`, `docs/BUSINESS_RULES.md`, `CHANGELOG.md` — scope, types and demonstration behavior.

Generated evidence under `docs/evidence/finance-preview-batch5/`:

- `batch5-reconciliation-desktop.png`, `batch5-reconciliation-mobile.png`, `batch5-reconciliation-tables-desktop.png`.
- `batch5-opening-entry-desktop.png`, `batch5-opening-entry-mobile.png`, `batch5-opening-entry-rows-desktop.png`.
- `batch5-opening-review-desktop.png`, `batch5-opening-review-mobile.png`.
- `batch5-administration-desktop.png`, `batch5-administration-mobile.png`, `batch5-administration-readiness-desktop.png`, `batch5-administration-readiness-mobile.png`.
- `batch5-audit-drawer-mobile.png`.
- `browser-check.log`, `build.log`, `accounting-validation.log`, `report-preservation.log`, `preview-preservation.log`, `transaction-preservation.log`.

Validation refreshed ignored build output, Vite caches and TypeScript metadata. No dependency/environment/configuration, backend, database, Frappe, Docker, authentication, FinanceEntitlement or operational files were edited. No existing report/transaction/master data or calculation service was changed. Git-based status/diff remains unavailable in this mounted workspace; the inventory records files written in this batch and existing source-hash checks remain intact.

## Validation results

Passed:

- `node node_modules/typescript/bin/tsc --noEmit --incremental false`.
- `npm run build` with VITE_FINANCE_UI_PREVIEW=true. Production remains denied and preview fixture sentinels are excluded from production JavaScript. Existing main-bundle size warning remains. [Build log](evidence/finance-preview-batch5/build.log).
- `node scripts/check-finance-administration.mjs`: exact bank/opening baseline parity; suggestions do not auto-match; manual match/unmatch; signed-amount and one-to-one guards; unmapped-bank/exception handling; filters; opening totals/party controls; maker/checker/role/company/assigned-reviewer/reason checks; review edit lock; stale revision rejection; correction/resave; atomic rejected operations; cloned reads; no approval/activation/grant methods; unchanged report baseline; local CA/events. [Recorded validation](evidence/finance-preview-batch5/accounting-validation.log).
- `node scripts/check-finance-reports.mjs`: all original ledger/TB/P&L/Balance Sheet/aging invariants, exact Batch 3 parity and **310 daily reconciliations**. [Report preservation](evidence/finance-preview-batch5/report-preservation.log).
- `node scripts/check-finance-preview.mjs`: original 15 protected hashes, routes/sidebar constants, dev/entry boundary, **38 recursively isolated preview dependencies**, fixture/abort/monetary/chart/disabled-action and master checks.
- `node scripts/check-finance-transactions.mjs`: original **566 operational/backend/Docker hashes**, transaction arithmetic, allocations/notes/journal balancing, atomic drafts and history.
- `node scripts/check-finance-preview-browser.mjs`: all Batch 1–4 interactions, plus Batch 5 manual/suggested matching, mismatch rejection, unmatch/rematch, filtered tables with unchanged summaries, empty/unmapped bank, unbalanced opening and party-control rejection, balanced saves, unsaved-review prevention, maker/viewer rejection, independent checker/correction, edit locks, revision retention, separate companies/years, CA checklist persistence without activation, permission/company presentation, audit drawer, report consistency, reset and disabled financial actions. [Browser evidence log](evidence/finance-preview-batch5/browser-check.log).
- Existing `check-finance-gateway.mjs` and `check-finance-gateway-browser.mjs`: entitlement, original navigation, denied/loading/error/retry/revocation/stale-user/logout/unavailable launch behavior.
- Existing `check-auth.mjs`, `check-accounting.mjs`, `check-led-finance.mjs`, `check-integrated-operations.mjs`, `check-sales-fulfillment.mjs`, `check-inventory-workflows.mjs`, `check-quality.mjs`, `check-production-workflow-errors.mjs`.

Desktop/mobile browser checks use headless Edge at **1440×1000** and **390×844**. No document-width overflow was detected. Wide tables remain inside horizontal scroll regions; the original sidebar scrolls independently. Desktop table/form segments, mobile review/readiness and audit captures supplement full-page evidence. Representative screenshots were visually inspected. The combined preview and gateway suites both completed normally; no teardown intervention was needed in this batch.

Request auditing confirmed **zero Finance Preview API requests**, including during matching, opening drafts/review/corrections and CA checklist writes with a synthetic stored token. Tokens remained unchanged. No unexpected external requests or runtime/console errors were observed; inherited shell font requests are allowed in the audit. Flag-off denial and production denial were retained. No Django or financial service was connected. Backend test suites were not rerun; this is frontend validation with protected-source hashes.

Screenshots: [Bank statement and ledger](evidence/finance-preview-batch5/batch5-reconciliation-tables-desktop.png), [Opening entry rows](evidence/finance-preview-batch5/batch5-opening-entry-rows-desktop.png), [Review and correction mobile](evidence/finance-preview-batch5/batch5-opening-review-mobile.png), [Readiness mobile](evidence/finance-preview-batch5/batch5-administration-readiness-mobile.png), [Local audit drawer](evidence/finance-preview-batch5/batch5-audit-drawer-mobile.png).

## Remaining limitations

- Fixed fictional statement period and one mapped report bank; the second bank is an empty unmapped example. No import, sync, bank connection, posting or adjustment-journal action.
- One-to-one equal signed-amount matching only; no split/combined/partial/FX/fee-tolerance matching. The three-day window is illustrative, not approved policy.
- The sample deliberately retains two unresolved exceptions, so matching all suggestions never implies a completed bank reconciliation.
- Opening scenarios do not feed reports, create journals or carry forward years. Only customer debit/supplier credit balances, fixed sample profiles and balance-sheet accounts are demonstrated.
- Review/persona selection and company access are local presentation rules; actual authenticated authorization, durable audit, approval delivery and CA sign-off are absent. Actual approval always remains disabled.
- CA checklist and role matrix do not synchronize real permissions or editable Batch 2 setup. No real readiness is inferred.
- Session data is discarded on reset/exit/refresh. Fixed illustrative UGX precision remains; no unapproved financial policy or tax treatment is applied.
- Existing bundle-size/deep-link hosting limitations remain. The auxiliary dispatch browser teardown issue observed in Batch 4 was not changed or rerun here; existing operational source/hash and workflow checks passed.

## Batch 6 final QA recommendations

1. Run an end-to-end review matrix for all five batches, covering keyboard-only navigation, focus restoration, long references, small/mobile/tablet layouts, filtering, reset/exit/refresh and every disabled financial action.
2. Repeat adversarial arithmetic and state-transition checks: boundaries/precision, cross-document allocations, report reconciliation, matching reuse, stale opening revisions, self-review, wrong company, unassigned reviewers and unsaved changes. Add randomized valid/invalid datasets where useful.
3. Consolidate acceptance evidence and test commands; inspect production artifacts and request traces to confirm no preview activation, data/persistence leakage or API transport. Resolve the pre-existing auxiliary dispatch browser teardown issue before relying on that runner for final QA.
4. Review fictional period/currency/tax/account classifications and scenario boundaries with the CA, collecting decisions without enabling posting or real policy changes. Keep real authentication/entitlement/operational regression checks in the release checklist.
5. Prepare a separate integration-readiness backlog for approved contracts, authorization, durable audit, bank imports and actual approval/posting. Do not start those integrations as part of final frontend QA without separate approval.

Stopped after Batch 5 for review.
