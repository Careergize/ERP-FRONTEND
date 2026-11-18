# Batch 6 full test results

6 November 2026 · Frontend/fixture-only validation. No live financial services or backend suite execution.

## Final status

- TypeScript no-emit check: PASS.
- Production `npm run build` with preview flag true: PASS; existing >500 kB bundle warning remains.
- Consolidated preservation/accounting/browser suite: **26/26 PASS**, no timeout, all exit codes zero.
- Supplemental expanded browser audit: all 22 routes plus namespace root denied in both flag-off and production modes; zero API requests; PASS.

Run `node scripts/check-finance-final-suite.mjs --browser` from `frontend/` after `npm run build` (the runner uses installed Edge unless CHROME_PATH is supplied). Browser startup may need local loopback permission in restricted environments. The runner writes per-check logs and machine-readable results.

## Per-check results

- **PASS** — `node scripts/check-finance-preview.mjs`; exit 0; 2.04s; [log](evidence/finance-preview-batch6/check-finance-preview.log).
- **PASS** — `node scripts/check-finance-transactions.mjs`; exit 0; 2.53s; [log](evidence/finance-preview-batch6/check-finance-transactions.log).
- **PASS** — `node scripts/check-finance-reports.mjs`; exit 0; 2.45s; [log](evidence/finance-preview-batch6/check-finance-reports.log).
- **PASS** — `node scripts/check-finance-administration.mjs`; exit 0; 1.86s; [log](evidence/finance-preview-batch6/check-finance-administration.log).
- **PASS** — `node scripts/check-finance-final.mjs`; exit 0; 2.30s; [log](evidence/finance-preview-batch6/check-finance-final.log).
- **PASS** — `node scripts/check-finance-gateway.mjs`; exit 0; 3.76s; [log](evidence/finance-preview-batch6/check-finance-gateway.log).
- **PASS** — `node scripts/check-auth.mjs`; exit 0; 1.82s; [log](evidence/finance-preview-batch6/check-auth.log).
- **PASS** — `node scripts/check-accounting.mjs`; exit 0; 4.42s; [log](evidence/finance-preview-batch6/check-accounting.log).
- **PASS** — `node scripts/check-led-finance.mjs`; exit 0; 1.99s; [log](evidence/finance-preview-batch6/check-led-finance.log).
- **PASS** — `node scripts/check-integrated-operations.mjs`; exit 0; 1.76s; [log](evidence/finance-preview-batch6/check-integrated-operations.log).
- **PASS** — `node scripts/check-sales-fulfillment.mjs`; exit 0; 2.06s; [log](evidence/finance-preview-batch6/check-sales-fulfillment.log).
- **PASS** — `node scripts/check-inventory-workflows.mjs`; exit 0; 1.38s; [log](evidence/finance-preview-batch6/check-inventory-workflows.log).
- **PASS** — `node scripts/check-quality.mjs`; exit 0; 2.03s; [log](evidence/finance-preview-batch6/check-quality.log).
- **PASS** — `node scripts/check-production-workflow-errors.mjs`; exit 0; 1.73s; [log](evidence/finance-preview-batch6/check-production-workflow-errors.log).
- **PASS** — `node scripts/check-quotations.mjs`; exit 0; 1.82s; [log](evidence/finance-preview-batch6/check-quotations.log).
- **PASS** — `node scripts/check-sales-management.mjs`; exit 0; 3.21s; [log](evidence/finance-preview-batch6/check-sales-management.log).
- **PASS** — `node scripts/check-job-cards.mjs`; exit 0; 2.01s; [log](evidence/finance-preview-batch6/check-job-cards.log).
- **PASS** — `node scripts/check-order-drafts.mjs`; exit 0; 2.42s; [log](evidence/finance-preview-batch6/check-order-drafts.log).
- **PASS** — `node scripts/check-job-drafts.mjs`; exit 0; 2.31s; [log](evidence/finance-preview-batch6/check-job-drafts.log).
- **PASS** — `node scripts/check-procurement.mjs`; exit 0; 1.97s; [log](evidence/finance-preview-batch6/check-procurement.log).
- **PASS** — `node scripts/check-currency-display.mjs`; exit 0; 1.30s; [log](evidence/finance-preview-batch6/check-currency-display.log).
- **PASS** — `node scripts/check-catalogue-integration.mjs`; exit 0; 2.16s; [log](evidence/finance-preview-batch6/check-catalogue-integration.log).
- **PASS** — `node scripts/check-baseline-contracts.mjs`; exit 0; 1.77s; [log](evidence/finance-preview-batch6/check-baseline-contracts.log).
- **PASS** — `node scripts/check-finance-preview-browser.mjs`; exit 0; 38.26s; [log](evidence/finance-preview-batch6/check-finance-preview-browser.log).
- **PASS** — `node scripts/check-finance-gateway-browser.mjs`; exit 0; 8.94s; [log](evidence/finance-preview-batch6/check-finance-gateway-browser.log).
- **PASS** — `node scripts/check-dispatch-sale-browser.mjs`; exit 0; 20.45s; [log](evidence/finance-preview-batch6/check-dispatch-sale-browser.log).

## Evidence and scope

- [Machine-readable suite results](evidence/finance-preview-batch6/full-suite-results.json).
- [Production build log](evidence/finance-preview-batch6/build.log).
- [Expanded namespace browser run](evidence/finance-preview-batch6/namespace-browser.log).
- [Network and production audit](evidence/finance-preview-batch6/isolation-production-audit.json).
- [22-route / 88 viewport accessibility audit](evidence/finance-preview-batch6/route-accessibility-audit.json).

The consolidated suite includes three browser checks: full Preview, existing entitlement/gateway and existing dispatch/invoice. The additional namespace run repeats the Preview suite with the strengthened 23-path production/flag-off assertions and writes explicit request/denial evidence. Its log is separate from the original consolidated run.

## Accounting and isolation findings

Dashboard/report revenue 13,500; cost plus expenses 5,750; surplus/current-year earnings 7,750; bank 100,250; receivable/payable 11,500/6,750. Original reference document amounts and due-date/settlement logic reconcile. All 310 report-date invariants still pass. Matching and draft saves cannot change immutable report/Dashboard baselines. Opening balancing and maker/checker/company/revision restrictions pass. Bank difference 400 and two exceptions remain intentional.

Original 15 protected hashes and the 566-file operational/backend/Docker preservation baseline pass. No assertion or preservation hash was relaxed. Obsolete independent Dashboard number expectations were updated to the reconciled baseline and strengthened with direct cross-screen equality tests.

## Failures investigated and resolved

- The new gate copy initially displayed the currency code before entry, conflicting with the retained no-snapshot-before-entry assertion. The gate uses generic illustrative-currency wording; the existing assertion remains unchanged.
- Initial synthetic Enter events lacked the native carriage-return text payload. The harness now sends complete Enter events and asserts trigger focus; no mouse-click fallback was substituted.
- Keyboard Tab traversal then exposed modal focus escaping. The shared Preview drawer now explicitly contains Tab/Shift+Tab and restores its trigger. The same assertions pass across all 11 editor types.
- The older dispatch browser runner used a nonexistent workstation-specific Chromium path and could remain active in teardown. The test now defaults to installed Edge, disables test-only HMR and closes idle HTTP connections. Workflow assertions are intact, and the final run exited zero normally.

## Limits of these results

Focused DOM and Chromium accessibility-tree/keyboard checks cover names, labels, images, headings, IDs/ARIA references, states, modal focus and document overflow. They are not a full WCAG certification, color-contrast audit, real screen-reader study or cross-engine test. Operational/browser preservation uses synthetic contexts and byte hashes; it does not certify a deployed backend, database, authentication service or native accounting site.
