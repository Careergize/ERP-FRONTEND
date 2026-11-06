# Finance repository boundaries and preservation

ERP-FRONTEND and ERP-BACKEND are independent checkouts. Infrastructure source is
prepared at `ERP/Navapack-Finance` for Careergize/Navapack-Finance; the older
`ERP/finance` runtime/history directory is not a release source tree.

Frontend Finance unit checks only read their own checkout. Gateway baseline data
is owned in scripts/fixtures instead of an untracked sibling. Backend diagnostic
tests own scripts/Test-FinanceConnectivity.ps1 instead of reading ERP/finance.

Cross-repository preservation is a separate required release job, never an
implicit sibling lookup or an optional fallback inside unit tests:

```
node scripts/check-finance-cross-repository.mjs --backend-root C:/checkouts/ERP-BACKEND --finance-root C:/checkouts/Navapack-Finance
```

CI must explicitly check out all three reviewed revisions and pass their absolute
roots. Missing arguments/files, a changed hash, or diverging diagnostic copies
fails the integration job. This command checks 559 hash assertions across the
three manifests plus diagnostic copy parity. Unit checks still enforce all local
operational hashes, routes, sidebar constants and fictional-data invariants.

scripts/fixtures/finance-preservation-review.json records original/new hashes and
paths. The two approved foundation files, backend fixture/test path repairs and
the infrastructure runner/ignore changes were reviewed and rebaselined. All 159
vendored upstream source hashes retain their original bytes at their new paths.
The 35 removed targets were local credentials/version state, backups/generated
base recipe and upstream .git metadata; no operational/native source assertion
was removed. Runtime-secret preservation is not a valid source release test.

Do not regenerate baselines automatically in CI. Future intentional changes need
a reviewed delta and source/behavioral evidence; unexpected changes must fail.
The native/infrastructure source lock independently checks exact vendor inventory.

Release validation evidence and exact path inventories are summarized in
release-readiness.md and release-readiness-inventory.json. Generated browser
screenshots, build products and raw logs are ignored and retained as local/CI
artifacts. Existing generated artifacts were removed from Git indexes only;
their local files and repository history remain intact.
