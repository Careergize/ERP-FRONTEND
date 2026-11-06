> Historical Batch 2 review. Current transaction implementation and validation are in the [Batch 3 report](finance-ui-preview-batch3.md).

# Finance UI preview — Batch 2 review

6 November 2026 · Asia/Calcutta

Batch 2 is complete for frontend review only. No commit, push or deployment. Batch 3 has not started.

## Screens completed

- Accounting Setup: editable fictional company/jurisdiction, base currency and fiscal dates; progress checklist; CA reviewer configuration and pending approval indicators. Saving configuration does not approve or activate anything.
- Chart of Accounts: indented parent/child hierarchy, account types/groups, search/type/group filters, add/edit drafts and details drawer. Unique codes, compatible group parents, cycle prevention, child consistency and existing ledger mapping protection are validated.
- Tax Configuration: rate/template listing and filter, illustrative rates, named tax templates, liability ledger mappings, validated add/edit drafts and details. All tax values remain illustrative until CA approval.
- Customer and Supplier Accounting: profile list and detail views, customer/supplier filtering, credit-day and terms editing, currency and account mapping, separate receivable/payable snapshots. Credit-term drafts do not recalculate historical balances.
- Banking Masters: fictional bank list and details, currency, ledger mapping, add/edit drafts and fictional-reference validation.

The existing Navapack presentation shell, typography, colors, Card, page header, drawer and restricted controls are reused. No duplicate Sales, Inventory or Invoice modules were introduced. Batch 1 Dashboard retains its existing data, period selection, search, pagination, drawer, simulated states and financial restrictions.

## Isolation and behavior

All master fixtures and validation are centralized in `src/finance/masterData.ts`; context owns typed, session-only drafts. Reset, exit or refresh discards them. Setup base currency is a configuration draft and does not convert the Dashboard or pre-existing sample balances. CA reviewer text is a demo configuration label; approval always remains pending. Master mapping rules are illustrative UI conventions, not actual Navapack policies.

The preview still requires development mode, the explicit VITE_FINANCE_UI_PREVIEW=true flag and user entry. Its rendering branch remains before authentication and operational providers. Recursive dependency inspection covers 25 modules and rejects transports, browser persistence and live contexts. Browser auditing records zero API requests, including during draft writes with synthetic stored credentials. Production denies preview and excludes its fictional fixture. No demo data reaches Django or ERPNext in these validated paths. Posting, approval, activation, export and email controls remain disabled.

## Changed-file inventory for this batch

All paths are relative to `frontend/`.

New source:

- `src/finance/masterData.ts` — types, fixtures, validation.
- `src/finance/FinanceMastersContext.tsx` — in-memory draft state.
- `src/pages/FinancePreview/FinancialMastersPage.tsx` — five screens and local forms.

Modified source and checks:

- `src/finance/FinanceDemoContext.tsx` — nests master draft provider within reset lifecycle.
- `src/finance/navigation.ts` — removes completed masters from future-module list.
- `src/pages/FinancePreview/FinancePreviewRoutes.tsx` — adds approved routes.
- `src/components/finance/preview/FinancePreviewLayout.tsx` — master navigation and route-aware active links; Dashboard anchors use client navigation.
- `scripts/check-finance-preview.mjs` — master fixture, hierarchy and mapping validation checks; original preservation assertions retained.
- `scripts/check-finance-preview-browser.mjs` — actual add/edit/invalid-input/search/filter/detail/reset checks for Batch 2 and desktop/mobile capture.

Documentation:

- `docs/finance-ui-preview-batch2.md` — this report.
- `docs/finance-ui-preview.md` — links historical Batch 1 report to this report.
- `docs/DEVELOPMENT_STATUS.md` — current Batch 2 scope.
- `docs/DATA_MODELS.md` — demo models and reset semantics.
- `docs/BUSINESS_RULES.md` — illustrative validation boundaries.
- `CHANGELOG.md` — Batch 2 entry.

Generated evidence: `docs/evidence/finance-preview-batch2/` contains Dashboard desktop/mobile, five screen desktop/mobile and four detail-drawer mobile PNGs (16 files). Build validation also refreshes ignored dist/cache/TypeScript metadata. No backend, authentication, entitlement, operational, Frappe, Docker, database, dependency or environment files were edited. A Git status/diff could not be obtained: this mounted workspace has no `.git` directory and Git fails while resolving the ancestor drive root; this inventory records files written during this batch.

## Validation results

Passed:

- TypeScript: `node node_modules/typescript/bin/tsc --noEmit --incremental false`.
- Production: `npm run build`, with VITE_FINANCE_UI_PREVIEW=true for the final run; preview remains denied in production.
- `check-finance-preview.mjs`: original 15 protected-file hashes, operational route/sidebar constants, 25 isolated dependencies, demo fixtures, abort, monetary checks, chart and restricted actions; new master fixtures, new valid account, duplicate codes, self/descendant cycles, child/group compatibility, mapping integrity, invalid rates/terms/bank references.
- `check-finance-preview-browser.mjs`: Batch 1 interactions preserved; five screens at 1440×1000 and 390×844; setup validation/save; each master add/edit/validation/search/filter/details; draft retention across routes; reset; zero API requests; unchanged synthetic tokens; production and flag-off denial; no runtime/console errors.
- `check-finance-gateway.mjs` and `check-finance-gateway-browser.mjs`: entitlement guards, original navigation, errors/retry, stale-user cancellation, revocation and unavailable launch behavior preserved.
- Existing `check-auth.mjs`, `check-accounting.mjs`, `check-led-finance.mjs`, `check-integrated-operations.mjs`, `check-sales-fulfillment.mjs`, `check-inventory-workflows.mjs`, `check-quality.mjs`, `check-production-workflow-errors.mjs`.

Screenshots were captured from local headless Edge; representative desktop setup/accounts/tax and mobile party/bank/drawer captures were visually reviewed. No document-width mobile overflow was detected. The existing mobile sidebar scrolls within its own navigation region. Browser checks use disposable profiles and block API/external HTTPS; existing shell font requests are allowed in request auditing. No real credentials or endpoints were used. Backend suites were not run because no backend code changed; preserved backend files are verified by the existing hash checks.

## Remaining issues and Batch 3 recommendation

No failing checks remain. Existing production bundle size warning persists. Existing relative-base production deep-link hosting behavior remains unverified; this preview remains development-only. Drafts intentionally have no durable persistence, live CA workflow or real accounting effect. Tax templates currently demonstrate a named single-rate mapping; compound tax sequencing and jurisdiction policy require CA-approved requirements before expansion.

For Batch 3 review, propose session-only payment/receipt and journal-entry drafts with explicit debit/credit balancing, currency/rounding validation, account compatibility, preview review state and immutable sample history. Reuse existing operational invoice references where appropriate rather than creating another sales/invoice module. Keep posting/approval disabled and API integration deferred until separately approved contracts and CA policy are available. Stop here for Batch 2 review.
