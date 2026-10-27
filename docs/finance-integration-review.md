# Finance integration review — 27 October 2026

Status: review followed by an authorized local implementation. See the active
[accounting implementation and remaining limits](../../../Backend/accounting/README.md).
The findings below describe the pre-implementation review.
This review does not establish what is currently deployed or certify existing balances.

## Findings

| Requirement | Current source evidence | Missing work |
| --- | --- | --- |
| Customer ledger | Invoice drafts/calculations in `src/lib/invoices.ts`; persisted invoice snapshots through `InvoicesContext` and Backend `erp/operational_records.py` | Normalized posted invoices, customer subledger, receipts, allocations, opening balances, ageing, credits/refunds |
| Supplier ledger | Backend `erp/models.py` has purchase orders/lines and goods receipts | Supplier bills, stable supplier relationships, payables, payment allocations, returns/debit adjustments |
| Integrated accounting | Operational saves and retained supporting-entry revisions exist | Chart of accounts, balanced journals, posting rules, accounting dates, period locks, reversals, reconciliation |
| Cash/bank and expenses | FinanceDashboard explicitly labels expenses and collections unavailable | Cash/bank account registers, transfers, receipts/payments, expense vouchers/categories, reconciliation |
| Inventory valuation | RawMovement records material/date/direction/quantity; finished stock has quantity opening balances and purchase receipts | Cost layers, approved valuation method, opening values, COGS, manufacturing WIP/finished-goods costs, adjustments |
| Reports | FinanceDashboard aggregates invoice totals by currency | P&L, cash flow, balance sheet, trial balance, customer/supplier ledgers, financial sales/purchase/expense/cash-bank reports |

The `accounts` Django app currently manages users, roles and permissions; it is not
an accounting general ledger. Existing shared-entry JSON persistence is not an
appropriate substitute for normalized financial transactions and posting constraints.

Source review covered the active adjacent `Backend`, its model/URL definitions,
purchase/GRN code and invoice validation, plus frontend finance/invoice components.
Earlier persistence documentation is historical context; actual current invoice
validation exists and must be preserved during migration.

## Proposed integration

Add an accounting application in the active Backend, connected to the current
frontend. Keep a single financial posting service used by operational commands.
Reports read posted journal entries and linked subledgers, not browser calculations.

Core records:

- Legal entity, fiscal periods and configured reporting currency.
- Chart of accounts with account types and control-account flags.
- Cash/bank accounts, tied to their ledger accounts and currencies.
- Posted journal headers/lines with business date, source document/revision,
  debit/credit amounts, base-currency amounts, FX snapshot and authenticated actor.
- Customer invoices/lines, supplier bills/lines, credit adjustments and reversals.
- Receipts/payments with explicit allocations to invoices/bills; optional line-level
  allocation when required to identify materials funded by a supplier payment.
- Expenses, categories, supporting references and approved tax treatment.
- Quantity/value inventory events, cost layers or averages, WIP/production costs.
- Approved opening balances and reconciled import batches.

Use stable customer/supplier/item IDs with immutable document snapshots. Do not
merge entities merely because names match. Existing supplier names require an
explicit mapping review before historical financial import.

## Proposed posting events, subject to confirmation

| Event | Proposed accounting effect | Inventory effect |
| --- | --- | --- |
| Quotation / sales order / purchase order | No financial posting | Demand/planning only |
| Posted sales invoice | Customer receivable, sales and applicable tax accounts | No second quantity deduction if dispatch already moved stock |
| Confirmed dispatch | COGS and inventory value under the approved recognition rule | One exact stock deduction |
| Supplier bill | Supplier payable and inventory/expense/tax or goods-received clearing | Receipt matching prevents duplicate stock receipts |
| Goods receipt before bill | Inventory and goods-received clearing when valuation is known | Accepted quantity only, once |
| Customer receipt | Cash/bank and customer receivable or customer advance | None |
| Supplier payment | Supplier payable or advance and cash/bank | None; allocations link to bill items |
| Expense voucher | Expense/asset/tax and cash/bank or payable | Only if explicitly an inventory purchase |
| Production issue/completion | Raw materials → WIP → finished goods with approved cost inputs | Preserve the approved operational quantity workflow |
| Credit / return / reversal | Linked reversing entries and controlled inventory return where applicable | Explicit linked event, never deletion |

A supplier payment can settle several bills; a bill can receive partial payments.
Keep the bill-to-item trace for all allocations. If the client needs exact funding
of particular lines rather than bill-level traceability, persist line-level amounts;
do not infer an arbitrary allocation from a bill's item list.

## Controls and report definitions

Every posting must balance debits/credits in reporting currency, use Decimal money,
and commit operational document, journal, allocations and inventory value atomically.
Require unique source-event keys and idempotent command handling. Lock affected
rows for allocations/valuation, reject over-allocation and stale writes, and enforce
server permissions. Posted documents are corrected through linked credits/reversals.
Closed periods reject backdated posting. Pending/draft documents do not affect reports.

Customer/supplier ledgers show opening balance, dated item/document detail, invoice
or bill amount, allocated payments and running/closing balance. Date filters retain
the opening balance before the selected range. Separately show unapplied advances.

Sales/purchase reports retain product/item, party, quantity/unit, net amount, tax and
gross amount; define recognition date consistently with the posted source. Expense
reports group by category. Cash/bank reports show opening, movements and closing.
P&L and cash flow cover a selected period; balance sheet and trial balance are as of
a date. All support day/month/year selection. Original currencies remain visible;
company-level statements require the approved base currency and FX policy.

Reconcile receivables/payables control accounts to customer/supplier subledgers,
inventory control to valuation, cash/bank controls to account registers, trial-balance
debits to credits and balance-sheet assets to liabilities plus equity.

## Delivery sequence after answers

1. Confirm decisions below, map accounts/roles, and reconcile a cutover opening trial
   balance with customer/supplier balances and inventory quantities/values.
2. Build normalized ledger, posting/reversal services, permissions, period locks and
   migration tooling; do not automatically backfill unverified historical documents.
3. Connect invoices, bills/GRNs, receipts, payments, expenses, cash/bank and production
   costing. Existing screens call these commands; users do not re-enter journals.
4. Add ledgers, allocations, ageing and all requested reports with source-document
   drill-down, date filters and exports.
5. Verify transaction rollback, duplicate retries, concurrent allocation/stock posting,
   returns, partial payments, FX, opening balances, period boundaries and end-to-end
   report reconciliation on PostgreSQL; then reconcile deployment cutover totals.

## Decisions required from the client

1. Legal entity/country, reporting currency, fiscal-year start and accounting cutover date.
2. Accrual reporting and invoice/dispatch recognition; approved inventory valuation
   method (weighted average/FIFO) and manufacturing/WIP cost treatment.
3. VAT/LED/withholding requirements, rates and recoverable/nonrecoverable purchase tax;
   existing commercial pricing logic is not proof of approved tax-account mapping.
4. Opening trial balance, customer/supplier unpaid-document balances, cash/bank
   balances and inventory values; whether existing posted history should be imported.
5. Cash/bank/mobile-money accounts, advance/partial payment rules, currencies/FX, and
   whether supplier-payment item traceability requires explicit line allocation.
6. Who may prepare/post/reverse transactions, approve payments and close/reopen periods.

No accounting code, database migration, historical posting or deployment was performed
as part of this review. The client explicitly requested clarification before development
where requirements or existing behavior are uncertain.
