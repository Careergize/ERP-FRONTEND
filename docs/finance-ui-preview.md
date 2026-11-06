> Historical Batch 1 report. Batch 2 is now implemented; see [Batch 2 review report](finance-ui-preview-batch2.md) for current scope, inventory and evidence.

# Finance UI preview — Batch 1

6 November 2026 · Asia/Calcutta

## Scope and result

Implemented only the development-only Finance Preview Foundation and Dashboard in the existing Navapack React project. Batch 2 has not started. No backend, Frappe, Docker, database, migration, credential, dependency or production configuration changes. No commit, push or deployment.

The preview is a separate rendering branch before authentication and operational Context providers. It neither changes nor grants FinanceEntitlement. Existing availability/posting/launch restrictions remain unchanged, confirmed by protected-file hashes and existing gateway tests. The existing `/finance`, `/finance/login`, `/finance/erpnext` and operational route declarations are preserved. Native financial record creation, posting, approval, activation, email, print and export are not implemented.

## Open locally

From `F:\WORK\ERP\frontend`, in a local PowerShell session:

```powershell
$env:VITE_FINANCE_UI_PREVIEW = 'true'
npm run dev
```

Open http://localhost:5173/finance/preview and select **Open Finance UI preview**. If Vite selects another port because 5173 is occupied, use the URL it prints. Close the server/session when finished; no `.env` file needs changing. Refresh or Exit preview requires explicit entry again. Production builds deny the namespace even if the flag is supplied during build. The preview module and fictional transaction fixture are excluded from the production JavaScript output.

## Implemented behavior

- Shared AppShellFrame preserves existing layout classes, branding, sidebar appearance and operational callbacks. The original AppShell remains the live adapter for authentication, pending saves, role navigation and entitlement.
- Finance & Accounts is the client-facing integration label. Existing URLs and internal identifiers remain compatible.
- The preview uses a fictional persona with no live permissions; it does not authenticate or impersonate a real user.
- Persistent Demo Data banner and explicit entry gate; no token or operational state reads inside preview dependencies.
- Typed, independently cloned in-memory fixtures for Sample Packaging Co.; all record IDs have DEMO prefixes. Currency is illustrative UGX with integer, zero-decimal amounts. No real company, tax or currency policy is implied.
- Revenue, expenses, operating surplus and cash/bank KPIs; selectable three/six-month trend, labeled revenue/expense SVG chart and accessible data table.
- Receivables/payables and overdue summaries, separate as-of balance snapshots, cash accounts and recent fictional transactions. Recent activity is explicitly not a complete ledger and is not the source for period totals.
- Search, status filter, pagination and a native modal transaction detail drawer with keyboard dismissal and restored trigger focus.
- Dashboard anchor navigation; future modules listed as planned, without functioning routes or configuration screens.
- Disabled posting, approval, activation, email and financial export actions. No financial mutation controls or server-save messages.
- Reset/exit discard preview state. Local loading, empty and error state demonstrations are available in a disclosure panel.
- No new libraries. Shared Card and StatusBadge are reused. API transport, operational stores and browser persistence are prohibited by a dependency-graph test.

## Exact changed-file inventory

All paths below are relative to `F:\WORK\ERP\frontend`.

### New files

- `src/components/layout/AppShellFrame.tsx`
- `src/components/finance/preview/FinanceChart.tsx`
- `src/components/finance/preview/FinanceDataTable.tsx`
- `src/components/finance/preview/FinanceDetailDrawer.tsx`
- `src/components/finance/preview/FinanceFilters.tsx`
- `src/components/finance/preview/FinanceKpiCard.tsx`
- `src/components/finance/preview/FinancePageHeader.tsx`
- `src/components/finance/preview/FinancePreviewGate.tsx`
- `src/components/finance/preview/FinancePreviewLayout.tsx`
- `src/components/finance/preview/FinanceRestrictedAction.tsx`
- `src/components/finance/preview/FinanceStatusBadge.tsx`
- `src/components/finance/preview/FinanceViewState.tsx`
- `src/finance/FinanceDemoContext.tsx`
- `src/finance/mockData.ts`
- `src/finance/mockService.ts`
- `src/finance/navigation.ts`
- `src/finance/service.ts`
- `src/finance/types.ts`
- `src/pages/FinancePreview/FinancePreviewRoutes.tsx`
- `src/pages/FinancePreview/DashboardPage.tsx`
- `scripts/check-finance-preview.mjs`
- `scripts/check-finance-preview-browser.mjs`
- `scripts/finance-preview-baseline.json`
- `docs/finance-ui-preview.md`

### Modified existing files

- `src/App.tsx`
- `src/components/layout/AppShell.tsx`
- `src/pages/ERPNextFinanceDashboard.tsx`
- `src/components/finance/FinanceReadinessPanel.tsx`
- `src/components/finance/FinanceSetupGuide.tsx`
- `scripts/check-finance-gateway.mjs`
- `scripts/check-finance-gateway-browser.mjs`
- `docs/DEVELOPMENT_STATUS.md`
- `docs/BACKEND_TODO.md`
- `docs/DATA_MODELS.md`
- `docs/BUSINESS_RULES.md`
- `CHANGELOG.md`

Source change purposes: App adds the fail-closed preview branch; AppShell delegates presentation; three existing Finance components receive neutral client-facing wording. The existing gateway tests change only their expected posting wording. Documentation and the two new tests record this increment. The baseline JSON records pre-edit protected-file hashes, existing routes and sidebar constants; it does not contain secrets.

Generated build output, TypeScript build metadata and Vite caches were refreshed by validation. Browser evidence is kept under the OS temporary directory `navapack-finance-preview-batch1/desktop.png` and `mobile.png`, not deployed assets. These are generated artifacts, separate from the source inventory.

## Validation

Passed checks:

- `node scripts/check-finance-preview.mjs`: 15 protected files unchanged; existing routes and sidebar constants preserved; DEV + explicit flag before live providers; recursive scan of 22 preview dependencies excludes API transports, persistence and operational contexts; independent fixture copies; abort behavior; monetary bounds and fixture consistency; labeled chart; disabled financial actions.
- `node scripts/check-finance-preview-browser.mjs`: actual application with explicit-entry gate; zero accounting API requests even with stored synthetic access token; no token changes; flag-off denial; production denial; fixture excluded from production JS; period/search/pagination; empty filtered results; modal Escape/focus restoration; 390px mobile overflow; simulated error/reset; exit/reload gate; no JS runtime exceptions or console errors observed.
- Existing `check-finance-gateway.mjs` and `check-finance-gateway-browser.mjs`: original entitlement/loading/error/retry/revocation/stale-user/launch-unavailable UI behavior preserved.
- Existing `check-auth.mjs`, `check-accounting.mjs`, `check-led-finance.mjs`.
- Existing `check-integrated-operations.mjs`, `check-sales-fulfillment.mjs`, `check-inventory-workflows.mjs`, `check-quality.mjs`, `check-production-workflow-errors.mjs`.
- TypeScript: `node node_modules/typescript/bin/tsc --noEmit --incremental false`.
- Production build: `npm run build`, deliberately also checked with VITE_FINANCE_UI_PREVIEW=true to verify that a development flag cannot enable production preview.
- Desktop/mobile screenshots visually inspected. Horizontal table scrolling is contained; chart values have an accessible textual equivalent.

No new regressions observed in these checks. The existing main-bundle warning above 500 kB remains. No backend test suite was rerun for this frontend-only increment; backend preservation is checked through byte hashes. Historical backend/PowerShell failures are not claimed fixed.

Test iterations caught and resolved a line-ending normalization issue in the new preservation test, an unreachable preview chunk initially emitted in production, detail-drawer focus restoration and cramped mobile transaction columns. These are resolved in the final implementation.

## Test/hosting limitations

Browser tests use disposable Edge profiles and local Vite servers, then close them. API and external HTTPS requests are blocked; inherited Google font URLs from the existing HTML shell are allowed in request auditing but are not evidence of accounting connectivity. No real user credentials or financial services are used.

The project already uses Vite `base: './'`. Direct deep links served by bare Vite production preview require asset-path routing by the host. The production-gate browser test supplies a test-only base URL in its local HTML response to emulate that asset routing. No production HTML/configuration was changed, and deployed deep-link behavior was not tested. This increment is local development only.

## Remaining work requiring separate approval

Batch 2 and later modules remain unimplemented. Forms/validation for accounting setup, masters and transactions will be added with their batches, rather than empty placeholder editors now. No CA workflow is functional.

Future live integration still needs approved Django module contracts, identity/company/action authorization, native permissions, validation and approval policy. No interface should infer live authorization or setup readiness from the demonstration. Configuration reads and mutations, idempotency/outbox, posting and ledger cutover remain separately approved work.
