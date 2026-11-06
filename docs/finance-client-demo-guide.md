# Navapack Finance client demonstration guide

6 November 2026 · Approximately 25–35 minutes. Local frontend demonstration only.

## Presenter preparation

1. From `F:/WORK/ERP/frontend`, use a local PowerShell session:

   ```powershell
   $env:VITE_FINANCE_UI_PREVIEW = 'true'
   npm run dev -- --host 127.0.0.1
   ```

2. Open the local URL printed by Vite with `/finance/preview`. Select **Open Finance UI preview**. No real login or credentials are needed; this does not grant Finance access. Production builds intentionally deny the preview.
3. Select **Reset preview** and wait for the Dashboard. Use a 1440px desktop window, then show a 390px mobile view. The existing sidebar scrolls independently; each of its 22 entries has a unique destination.
4. Tell the client: “Sample Packaging Co., all documents, bank details and users are fictional. Currency/tax values are illustrative. Draft saves and review/matching actions stay in memory. Posting, approval, activation, bank sync, email, print and exports are unavailable.”

Do not enter actual customer, bank, tax or employee details. Refresh/exit/reset discards local state. Setup/master edits are scenarios, not instructions to revalue or retarget the immutable ledger.

## 1. Finance Dashboard — 3 minutes

Use **June–6 November 2026**. Point out revenue **UGX 13,500**, expenses including cost of sales **5,750**, surplus **7,750**, bank **100,250**, receivables **11,500** and payables **6,750**. The as-of date is **6 November 2026**. These now come from the same fictional ledger as reports.

Switch to **September–6 November** and back. Expand **View chart values** for the accessible data table. Search recent references, use Next/Previous and open a reference drawer; Escape closes it and restores focus. Historical rows are **Reference snapshot**, not actual submitted records. Draft filters may legitimately show an empty result because posted history excludes editable drafts.

The Dashboard’s six-month range and a report’s default six-day range are different scopes. When comparing profit, set the same dates as shown below.

## 2. Accounting Setup and masters — 4 minutes

Open **Accounting Setup**. Show company details, illustrative jurisdiction, base currency, fiscal-year dates, setup checklist and CA configuration label. Leave UGX selected for this walkthrough. Optionally clear Company name and attempt a local save to show validation; restore it before continuing. Actual setup approval/activation stays disabled.

Open **Chart of Accounts**. Search `receivables`, filter groups/ledgers and open details. Add a local account with name `Sample demo clearing`, code `1300`, type Asset, parent Assets. Show duplicate-code and invalid-parent validation if needed. This is a draft, not a new real account.

Briefly show **Tax Configuration** (10% is an unapproved example, not Navapack policy), **Customer and Supplier Accounting** (baseline balances now align to aging) and **Banking Masters** (fictional references only). Profile terms and mapping drafts do not recalculate report balances.

## 3. Invoice accounting — 4 minutes

Open **Sales Invoice Accounting**, then `DEMO-SALES-REF-01`: gross **10,000**, historical fictional settlement **2,000**, snapshot outstanding **8,000**. It is read-only and links to a fictional operational source. Purchase reference `DEMO-PURCHASE-REF-01` similarly shows gross **6,000**, settlement **1,000**, outstanding **5,000**.

Select **New transaction draft**. Use reference `DEMO-CLIENT-SALE-01`, date `2026-11-06`, fictional source `DEMO-OP-SALES-01`, description `Sample accounting representation`, quantity `2`, unit price `1000`, tax `0`. Save total **2,000** locally. An optional 10% entry calculates **2,200**, explicitly illustrative until CA approval; restore zero if continuing with the 2,000 example.

Explain: “This represents the accounting side of an operational document. It does not create another Sales Order, Dispatch, stock movement or operational invoice. It is excluded from report totals.”

## 4. Receipts and payments — 3 minutes

Open **Receipt Entry** and prepare `DEMO-CLIENT-RECEIPT-01`, Sample customer Alpha, Fictional Example Bank, amount `1000`. Allocate to `DEMO-SALES-REF-01`. Try `1001` allocation first to show exact-total validation, then correct it to `1000` and save.

Show snapshot outstanding **8,000** and planned available **7,000**. This is a plan, not a real settlement: Dashboard/aging remain **11,500** because local drafts do not alter the immutable history. Show Payment Entry’s analogous supplier flow without executing a payment.

## 5. Journals and notes — 3 minutes

Prepare `DEMO-CLIENT-JOURNAL-01`. Choose Sample bank ledger, description `Illustrative debit`, debit `1000`; choose Sample receivables, description `Illustrative credit`, credit `999`. Attempt save to show imbalance, then change credit to `1000` and save locally. No actual ledger entry is posted.

If time permits, show a Credit Note of `100` linked to `DEMO-SALES-REF-01` with a fictional correction reason. A Debit Note links to the purchase invoice. Neither performs a physical return or changes stock. Notes, allocations and linked references validate together; there is no real approval.

## 6. Ledger and financial reports — 5 minutes

- General Ledger: select Receivables control for **1–6 November**. Opening **3,500 Dr**, debits **10,000**, credits **2,000**, closing **11,500 Dr**. Filter receipt rows; the running/closing balance retains full account history. Open linked invoice and settlement documents.
- Trial Balance: closing **140,250 Dr = 140,250 Cr**, November movements **23,500 Dr = Cr**. Group rows are subtotals and are excluded from grand totals.
- Profit and Loss: default **1–6 November** net profit **5,500**. For comparison with the Dashboard, change start to **2026-06-01** and end to **2026-11-06**: revenue **13,500**, cost plus operating expenses **5,750**, net **7,750**. Prior comparison is explicitly equal-length, and may be unavailable outside dataset coverage.
- Balance Sheet as of **6 November**: assets **134,500** = liabilities **6,750** + equity **127,750**; current-year earnings **7,750**.
- Receivables/Payables Aging: totals **11,500 / 6,750**, zero reconciliation difference. Click Sample customer Alpha or Sample supplier Beta, then an invoice. Explain due-date buckets; `90+` means more than 90 days. Settlements dated 3 November are excluded when the as-of date precedes them.

Show that the draft invoice, receipt, journal and note have not changed these totals. No print/export control is enabled.

## 7. Bank reconciliation — 3 minutes

Use Fictional Example Bank, statement period **1–6 November**. Opening **99,750**, statement closing **100,650**, ledger closing **100,250**, difference **400**.

Accept the receipt/payment suggestions or manually select the equal signed rows. Unmatch one, then match it again. Two pairs have matched net **1,000** and absolute amount **3,000**. The statement-only **−100** charge and ledger-only **−500** expense remain intentionally unmatched. Say: “These are deliberate demonstration exceptions. Zero explained residual does not mean reconciliation is complete, and matching never posts a fee or changes the ledger.”

Show filters and explain that they affect visible tables only; summaries cover the full statement period. Do not try to remove the UGX 400 difference through an invented journal or real bank connection.

## 8. Opening review and CA Administration — 4 minutes

Open **Opening Balances**, Sample Packaging Co., fiscal year 2026. Baseline debit and credit are **120,000**: bank **100,000**, inventory **20,000**, capital credit **120,000**. Save locally. Review and correction with the maker selected is rejected; assign Sample independent checker to prepare the review presentation. The entry becomes read-only while awaiting demo review.

Request a local correction as that assigned checker, with a fictional reason. Resave a correction and explain that independent review must happen again. Actual approval and posting stay disabled. Company/year choices are separate scenarios, with no automatic carry-forward or effect on the reports.

Open **Finance Administration**. Show four fictional personas, company access and the permission matrix. These are not real users or permissions. Mark the four CA checklist items and save. The screen must still say **Activation remains blocked**, policy approval pending and actual Finance unavailable. Show the local audit drawer; it is session history only.

## Close and reset

Demonstrate one mobile screen, keyboard Tab/Shift+Tab in an editor and Escape/focus restoration. The **Preview display states** disclosure can simulate loading/empty/error on every module; switch back to ready without implying an API request. Use Reset preview to discard all drafts/matches/review/checklist changes, or Exit preview to return to the entry gate.

End with: “The frontend is ready for a controlled local client demonstration. Live accounting integration, policy approval, authenticated independent review and financial posting are separate future work.” Use the [readiness matrix](finance-integration-readiness.md) and [roadmap](finance-integration-roadmap.md) for the technical discussion, not as evidence of available APIs.
