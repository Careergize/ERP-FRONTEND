# Business Rules

## Sales approval, QC and print continuation — 28 October 2026

No user, including Admin, may review their own created/edited/submitted Sales preview. QC roles record Pass/Fail/Hold and inspected quantities; full QC pass still requires separate stock authorization. Draft/pending credit-note prints carry DRAFT; approved session previews cannot be issued as official documents.

## Sales Management frontend — 28 October 2026

Sales returns must select an invoiced line and fit remaining approved-return quantity; approval rechecks capacity. Rejected/cancelled documents have no financial effect. Approved returns reduce sales once; their credit notes add no duplicate adjustment. Units/currencies remain separate, balances exclude receivables and no stock is restocked. See [Sales rules](sales-management.md).

## Spares independent opening approval — 28 October 2026

Spares opening stock requires an explicit request and a different explicitly authorized reviewer, including for superusers. Direct openings and master opening_stock bypasses are rejected. Pending/rejected balances remain null; explicit zero is posted only on approval. Existing initialized movements retain existing rules. See [implementation, exact files and verification](../../backend/inventory/SPARES_OPENING_APPROVAL.md).

## Catalogue backend integration — 28 October 2026

Classified Consumables codes are allocated by the backend and immutable. Catalogue posting needs item-view plus movement-add permission; no role grants are inferred. Openings are explicit, unknown remains unknown, duplicates replay, overdrafts/backdated shortages reject, and code/category edits preserve identity. Ledger labels post no accounting entries. See [implementation and validation](../../backend/inventory/CATALOGUE_INTEGRATION.md).

## Separate Spares and Consumables — 28 October 2026

Spare-classified demo records cannot be edited, reclassified or posted via Consumables. They remain intact for review and are excluded from Consumables operational totals/reports. Legacy office filters do not rewrite classifications. See [scope and verification](consumables-frontend.md#spares--consumables-separation--28-october-2026).

## Consumables auto-code and audit preparation — 28 October 2026

Existing Consumables codes are immutable in the UI; category changes preserve identities. Provisional allocations are not reused within the retained demo session. Missing audit identities/dates are never inferred; ledger labels remain configurable UI metadata. See [scope and verification](consumables-frontend.md#auto-code-and-audit-preparation-follow-up--28-october-2026).

## Consumables frontend — 28 October 2026

Consumables demo issues cannot exceed stock at any chronological point. Units/openings lock after movement; low stock is positive stock at or below minimum, with zero-stock alerts separate. Ledger mapping is metadata only. See [scope and validation](consumables-frontend.md).


## Accounting — 27 October 2026

Only posted, balanced journals affect statements. Source events post once; quotations
and purchase orders alone do not create sales/payables. Dispatch quantity moves once,
with a separate cost-value posting. Allocations retain party/currency/item identity,
reject excess amounts and expose unapplied advances. Missing costs/FX/LED mapping
remain in Posting Queue. Closed periods reject dated postings. Reversals preserve
original evidence. See [implemented rules and limits](../../../Backend/accounting/README.md).

## Recycling Module 2 — 26 October 2026

Whole bags convert at 40 kg/bag, matching the supplied July sheet. Price/kg and
currency are explicit per entry. Monthly reports exclude voids and separate rates
and currencies; corrections retain history and require reasons. This register
does not consume purchases or post raw stock. See [Module 2](recycled-materials.md).

## Recycling Module 1 — 25 October 2026

Waste Purchases is the first of four separate recycling workflows. Authorized users can add unique material names for future entries. Purchase summaries use saved entry dates, separate kg/pcs and currencies, and exclude voided entries. Corrections require reasons and preserve management history. Purchase entry does not post stock or payments. See [details](recycling-purchases.md).

## Supporting-record persistence — 25 October 2026

A supporting-record save is confirmed only after the backend accepts it. Conflicts and failures remain explicitly unsaved; management may inspect retained accepted versions. Supporting snapshots cannot authorize stock posting, production/QC releases, quotation delivery or invoice issue.

Scope, pending authority proposal, verification and limitations: [persistence status](../../../Backend/PERSISTENCE_STATUS.md).

## Local workflow and registers update — 23 October 2026

Quotation is optional. Draft preparation does not authorize production. Order approval and Job Card creation are separate; standalone production requires documented authorization. Consumables are register-only; spare posting awaits Procurement/Stores mapping.

See [implementation, checks and blockers](spares-consumables-implementation.md).

## Quotation-first orders and Sales Order approval — 23 October 2026

Current flow: saved Quotation → Sales Order awaiting approval → Production Manager
or Admin approval → automatic manufacturing Job Card and planned costing sheet.
This replaces the earlier order-first automatic quotation/allocation behavior.
The existing quotation review and customer-response UI still precedes conversion.
Manual selling prices may be entered without a preliminary costing estimate;
linked estimates retain their approval/model checks. Job Card costing is reviewed
after creation, before production approval and Store material issue.

New orders must identify an exact saved quotation revision and retain its lines,
prices, units, customer, tax/discount and LED snapshot. Direct order creation is
rejected by the API. Order approval is persisted with actor/time, limited to
Production Manager/Admin, atomic with job creation and safe to retry. Stock-only
orders create no Job Card. Existing-item manufacture still requires known zero
stock, rechecked at approval. Standalone manual production Job Cards remain allowed.

Sales Orders offers “Start with quotation”; the old new-order route opens Quotations.
Stock OUT new-sale entry saves a quotation first. Dispatch against an existing
order requires Sales Order approval. Finished-goods dispatch remains browser-session
state; this change does not add database persistence to dispatch or customer responses.
Migration erp.0015 grants the Sales Order approval permission to PM/Admin roles.


Manufacturing workflow steps can be chosen and ordered manually per Sales Order item;
the model route is only a default when no override is supplied. Explicit empty overrides
are invalid. Each process can run on a selected compatible active machine, and repeated
processes have distinct step IDs. Per-order planned step quantities are copied unchanged;
only model-template quantities use batch scaling. PM edits remain locked after approval.

## Shared Sales Order and production handoff — 21 October 2026

Receptionist/Admin creates direct Sales Orders. Selecting an existing stock item needs
no Job Card. A manufacturing line requires a saved model revision, configured material
recipe, ordered process route and delivery date. Optional allocation creates one parent
Job Card with only manufacturing lines, submitted immediately for PM review. Every
manufacturing line must have configured requirements even when allocation is deferred.
Required materials = per-batch recipe × order quantity / explicit model production
output per batch. Output units must match the Sales Order exactly; mass percentages
require explicit compatible mass units and must sum to 100. No guessed ctn↔kg yield.

Process steps are user-defined and reusable. Each product selects and orders its own
steps; model revisions and old job snapshots remain separate. PM can correct pending
specifications/due dates, materials and route; quantity/unit remain tied to the order.
Only PM/Admin approves; only Store/Admin issues approved requirements. Server permissions,
not submitted role strings, authorize actions. Positive partial issues may not exceed
approved remaining requirements or known raw availability. Unknown opening stock must
be resolved. Raw OUT, issue quantities and audit/status commit together; stale workflow
versions fail without a second deduction. Manual procurement stock is untouched.
Production/QC beyond this handoff retains existing frontend checks; server-owned QC
holds/release persistence remain a separate pending scope.

## Goods Received Notes — 21 October 2026

New POs await GRN by default. The explicit immediate-receipt option posts all ordered
quantities at PO save and prevents later GRN stock posting against those lines.
GRN received quantity includes damaged goods. Accepted Stock IN = received - damaged;
missing goods add no stock and stay outstanding for later deliveries. Cumulative
received quantity, including damage, cannot exceed ordered quantity; missing reports
cannot exceed the balance after the current delivery. Missing reports do not close
or deduct the outstanding PO balance. Replacement goods require a valid outstanding
order; GRN entry does not authorize an over-receipt.

Each GRN records server number, receipt date, PO/supplier, ordered/previously received/
received/damaged/missing quantities, remarks and server-recorded receiving user. The
optional authorized-person name is a declared document field, not an approval grant.
PO/GRN lines are immutable; idempotent retries do not repost stock. Receipt date must
be between the PO/stock opening dates and today. Server permissions control access.

## Purchase order entry — 21 October 2026

Purchases require at least one item, positive quantities, explicit
units/currency and nonnegative prices. Expected delivery cannot precede order date.
New purchases await GRN by default; explicit immediate receipts add stock on the purchase date. From
stock requires an exact existing variant/unit; Manual entry creates a new variant,
including its category and optional subgroup/size/brand/packing/customer identity.
Duplicate manual variants require From stock selection. Each PO immediate receipt or accepted GRN commits atomically, and retries never add stock twice. Future purchase dates and dates
before a selected variant's opening are rejected. New variants start with zero opening;
unknown historical openings stay unknown. Earlier draft entries are not backfilled.
PO entry does not post payments, modify Raw Material or change procurement forecasts.
Approval, amendment, tax and freight remain outside entry. Server model permissions
control access. Production/QC receipt approval rules are unchanged.

## Raw stock autofill on grade selection - 17 October 2026

Selecting a grade for a new procurement plan now prefills Stock in Store from its current Raw Material balance (opening + IN - OUT), supplied by the procurement API with one aggregate query. Known zero stays zero and unknown opening stays unknown. A saved plan keeps its manually entered balance, including an explicitly unknown balance; only new plans prefill from Raw Material for review. Raw receipts/issues are not changed by selecting or saving a plan. Frontend build and procurement checks pass; all 15 inventory API/migration tests pass.

## Manual procurement tracking — 21 October 2026

Daily and monthly consumption are manually entered planning figures only. Saved stock
stays exactly as entered, regardless of elapsed days, refreshes or consumption-rate
changes. Coverage = entered stock / daily consumption; estimated stock-until and
order-by dates start from the saved stock date. Editing preserves that quantity/date
until manually changed. New plans may prefill raw stock for review; saved zero/unknown
stock remains zero/unknown. Planner saves never post Raw Material or finished-goods
movements. Expected deliveries only affect forecast coverage.

## Procurement plan entry - 17 October 2026

Procurement entry allows daily or monthly planning consumption; editing one calculates the other using consumption days (26 default). The canonical saved value remains monthly consumption at six decimal places; editing days preserves the most recently entered daily or monthly basis. Zero retains the existing observed Stock OUT mode. Live store stock remains read-only, and coverage/stock-up-to/order-by values are calculated. Adding a plan uses the existing exact material identity and updates its single versioned database plan.

## Procurement planner persistence - 17 October 2026

Raw Material and Procurement data is stored in the active Backend database. Expected deliveries are distinct rows linked to exact material plans; each changed save records a versioned snapshot, preserving prior values even when a delivery is removed. Existing supplier/date/quantity fields are migrated without unit conversion. Stock and coverage remain derived from saved movements and settings; expected deliveries never add physical stock. The API retains shared-store permissions, exact units, positive quantities, known-balance issue limits, request retries and plan version checks. Admin views are read-only; demo sessions remain temporary.

## Persistent quotation drafts — 16 October 2026

Save Draft succeeds only after durable backend confirmation for real users. Saved drafts reload across page refresh and later sign-in under their owner. Same UUID edits update one row; conflicting versions fail with 409 instead of silently overwriting. Once a snapshot for that draft ID is submitted, changed content requires a new revision/UUID. Draft content cannot assert manager approval or authorize sending. Demo saves are explicitly labeled as session-only.


## User roles and quotation rejection — 16 October 2026

Only Project Manager or Production Manager roles with review permission may review quotations. Manager role assignment uses real database role records and does not grant user-administration access. Pending submissions can be approved or rejected with a nonblank reason. Rejected decisions cannot be overwritten, approved, sent or resubmitted as the same snapshot; submit a revised quotation. Approval never automatically sends. User create/change endpoints are superuser-only and never accept client superuser/staff flags.


## Editable quotation selling price — 16 October 2026

A draft custom quotation may override the public selling price manually. Approved current costing/model/customer/quantity/unit dependencies remain required. The manager reviews the entered selling price, and changing approved content still creates a new snapshot requiring approval.


## Quotation units and line totals — 16 October 2026

Quotation line total equals quantity × entered unit price, rounded to two decimals. Inclusive prices already contain VAT; exclusive prices add VAT once at document totals. The inclusive unit-price readout is informational and is never multiplied again to double-charge tax. New quotation snapshots require an active registered unit; mismatched unit ID/code is rejected. Stock units follow the exact product variant, and no kg/carton/piece conversions are inferred. Unit deactivation hides it from new selections without rewriting old documents.


## Quotation manager approval and saved customers — 16 October 2026

Quotation delivery requires submission and approval of the exact snapshot by a Production Manager with approval permission. Admin/Accounts/sales cannot bypass it; approval does not automatically send. Changed content needs new approval. New quotation customers are explicitly saved to the shared database master; existing contact edits on a quote do not overwrite the master.


## Quotation PDF delivery — 15 October 2026

PDF generation and delivery use only public customer/company/items/terms fields. Only checked Email/WhatsApp channels are submitted, after server approval of the exact unexpired immutable PDF snapshot. Provider acceptance is not recipient delivery or customer acceptance. Missing configuration prevents both selected channels from starting. Failed/unknown/pending results are explicit; exact request replay does not resend. The default WhatsApp recipient is +916282744675 and must be checked/edited for each intended recipient. No order, job or stock posting occurs. Photo-derived company/bank defaults are editable; no photographed signature is reproduced.


This separates verified frontend behavior from decisions still needing confirmation.

## Sales Orders

- Customer name and marketing person are required. Marketing Person identifies who brought the customer; it is currently recorded as a name.
- Customer type must be B2B or B2C; order date defaults to the browser's local current date and must parse as a valid date.
- Multiple items are supported; at least one selected item with ID/name and unit is required.
- Quantity must be finite and greater than zero. Editable unit price must be finite and nonnegative; zero is allowed.
- Line total = quantity x unit price, rounded to two decimals. Order total sums rounded line totals and rounds to two decimals.
- Requisition order is optional text. New orders start Draft with no job-card links. Fulfillment status is derived in the list/detail from ledger records.
- The form warns when requested quantity exceeds stock; this does not block an order.

## Inventory terminology and posting

Stock means Finished Goods only. Raw Material is separate production input inventory, classified as Virgin Material, Recycled Granules or Ink.
Stock IN/OUT belongs to the module where it is recorded.

Creating a Sales Order creates demand only: no physical Stock OUT and no automatic reservation. Explicit allocation is a separate operation. Never double-deduct stock.
Demand comparisons use unreserved stock; explicit allocation validates competing reservations cumulatively.
Required Qty = max(0, ordered quantity - max(0, available stock)).
Unknown stock, unlinked items and unit mismatches have no calculated shortage.

Balances = opening + IN - OUT, with six-decimal rounding. Monthly opening carries forward earlier movements; monthly IN/OUT use the selected month. Unknown opening or a month before the reference opening date produces an unknown balance, not zero. Do not add incompatible units.

Movement entry requires a selected product/material, date and positive finite quantity. The UI disallows dates before its reference opening date and fixes the unit from the selected record. Finished Goods OUT is blocked beyond known unreserved reference stock. Raw Material and Consumables retain their existing warning behavior.

Finished Goods Pieces means optional pieces per package in this frontend. It is positive whole-number metadata, initially unrecorded, edited on Stock IN and read-only on Stock OUT. It does not multiply stock quantities or infer counts from packaging dimensions. Raw Material uses Stock in Hand only as a display label; balances and stored categories are unchanged.

## Finished Goods and source fidelity

Categories are Carrier Bags, Flat Bags and Packing. Identity includes category, subgroup, customer, item details, size, brand, packing size and unit. Preserve stable IDs and source provenance; repeated identities must not be silently merged.
Legacy name matching is accepted only when unique for the unit. See [source interpretation](finished-goods-reference.md) for customer inheritance, inferred units and unknown Packing balances.

## Consumables

Categories are Imported Spare and Local Spare; units are Each, Both, Litres and Kilos. New records require a name, opening date and nonnegative opening balance. Minimum level is optional and nonnegative. Balances use opening + IN - OUT, separately per item/unit. After movements exist, edits cannot change unit, opening balance or opening date. Stock OUT over balance warns and remains allowed, matching the existing inventory simulation.

## Raw Material

Preserve specific client grades rather than replacing them with generic names such as HDPE Resin.
The extractor maps HDPE, PP, LDPE, LLDPE, MASTER BATCH and ADDITIVES to Virgin Material; INKS & SOLVENTS to Ink; RECYCLE MATERIAL and CRUSHED MATERIAL to Recycled Granules.
Workbook references supply input inventory; legacy recycled-granule demo records remain separately identified. Blank/unrecorded balances stay unknown.

## Production and other modules

Job Cards render ordered production-stage arrays per card/model. Legacy stage choices remain compatible; Receptionist, Production Manager and Admin can toggle pending stage requirements without changing model defaults. Active/completed stage records and completed jobs are protected; stages cannot be inserted before production already received or started. PM/Admin can add/remove/reorder draft custom routing; approved routing is locked and reapproval is limited to before issue/production.
Production Manager/Admin edit pending job fields and approve into StoreIssuePending, recording approval user/time. Store Keeper/Admin record full or partial material issues against remaining requirements; known availability limits each entry, unknown availability remains explicitly unrecorded. Partial issue permits production, but replenishment after production starts is not implemented. Legacy requirements are supplied frontend data; custom requirements derive from explicit revisioned recipe quantities and units, with PM review.
Production Operator/Production Manager/Admin record nonnegative stage quantities and valid timestamps. Previous required production stages must be complete. Completion passes output to the next stage: matching-unit input is prefilled/locked; differing-unit input requires explicit entry without an assumed conversion. Output/waste consistency and optional waste calculation apply only to matching units. Recycling quantity cannot exceed stage waste; no Recycling entry is posted.
All required production stages complete -> ReadyForStock. Produced quantity is final-stage output, not the sum of outputs across stages; waste totals stay separated by unit. Store Keeper/Admin confirms a positive accepted quantity up to final output and a valid batch date -> Completed. Linked jobs post accepted Finished Goods IN to shared session state after explicit QC confirmation. Partial receipt batches retain ReadyForStock until output is accounted for; raw stock remains unchanged. Unlinked legacy jobs cannot post a guessed product.
Delayed means browser-local today is later than requiredDate and the job is not Completed. It is a separate warning. Completed jobs retain all materials/stages/waste/history. JobCardsContext changes survive navigation and reset on refresh; new manufacturing actions are local only. Existing GET list/detail and PATCH stage requirements keep their existing endpoints, with explicit frontend fallback on failed writes.
Recycling currently displays waste and granule records; it does not post raw-material movements.
Legacy Costing displays supplied totals; entering a legacy exchange rate does not recalculate existing records. Custom costing calculates entered recipe/process costs and freezes exchange rates in estimate revisions.
See [sales fulfillment rules and unresolved decisions](sales-fulfillment.md) for the implemented frontend reservation/dispatch/receipt workflow and backend limitations.

## Custom costing and routing

Custom lines are independent; repeated manufacturing-item preparation is idempotent per line within one new parent Job Card. Recipes use actual quantities or proportions × explicit batch, with no inferred pieces/cartons-to-mass conversion. Rates, FX, costs, taxes and charges are entered configuration; workbook examples do not define permanent rates. Markup and gross margin remain distinct. Generated, job-linked or approved financial snapshots require a new revision for edits. Internal costing approval and customer acceptance are separate. PM/Admin may change routing before approval; approval freezes route/material snapshots. Routing changes mark costing for review; reapproval is available only before issue/production. Store issue remains frontend tracking. QC accepted output requires exact variant/unit mapping before frontend Stock IN. Actual Cost/Variance remain unavailable until consumption and expense data exist. See [rules, roles and workbook ambiguities](custom-costing-routing.md).

## Client-confirmed parent workflow — 13 October 2026

For newly prepared orders, one parent Job Card contains separate manufacturing items. Manual stock-source lines are excluded as an isolated mixed-order assumption. Every manufacturing line must be prepared before atomic parent approval. Items preserve independent products, quantities/units, costing and routes; the parent completes only when every item completes. Adding items after approval is blocked. Historical cards are preserved and require authorized migration before new items can be attached. New parent creation/approval does not move or reserve stock.

This is the relationship portion of phases 1–2 only. Confirmed-order amendment approval, production for stock, Supervisor/Manager finished approval and dispatch without mandatory reservation remain unimplemented. Earlier Store QC and allocation rules describe current legacy behavior, not the newly confirmed target. See sales-fulfillment.md for the explicit remaining scope.

## QC integration — 13 October 2026 (supersedes earlier Store-only QC receipt rules)

Physical raw receipt is not QC acceptance. Pending/rejected/conditionally accepted receipts remain physically recorded but are excluded from usable availability; unknown held balances cannot ordinary-issue. QC inspection targets exact receipt or item/stage/lot IDs. Independent review uses per-item acceptable answers and explicit numeric tolerances, including No for objectionable odour. Failed checks cannot become Passed; submitted answers/template snapshots are immutable. Correction/reinspection preserves original results; open NCs prevent release and independent verification closes actions.

Mandatory approved-route checkpoints and item-specific holds gate production while previous-stage completion still applies. Linked machines require verified checks; no product-name or machine-name linking is inferred. QC review/quality release never posts stock. Separate Production Manager/Admin final stock authorization bounds batch acceptance/rejection; Store/Admin receipt validates exact authorization/unit/lot and cumulative quantities. Held production batches cannot dispatch. Legacy historical movements remain unchanged, while new legacy-card transfers require explicit QC authorization. The earlier reservation-free dispatch phase remains pending; this QC change does not silently replace that allocation workflow.

QC Inspector records assigned drafts/submits; QC Supervisor independently reviews/releases/manages corrections; Admin configures templates and assignments. Frontend checks are not backend permissions. Source photographs and final authority policy still need confirmation. See quality.md for precise implemented behavior, proposed backend rules, exports and limitations; existing waste/recycling and USD/UGX costing rules remain applicable.

QC stock intake guard: Store must use the exact authorized Job Card receipt. Manual unbatched reference imports are Admin-only and blocked for products with active QC holds; they are a proposed legacy/import exception awaiting client confirmation, not an alternative manufactured receipt.

## Quotations and Proforma Invoice — 13 October 2026

Offers/proformas are separate from Sales Orders/tax invoices. Quotation creation/approval/sending/printing never creates production, reservations or physical stock movements. Internal approval is not customer acceptance. Commercial content freezes at approval; sent/model/costing/price/terms changes require a new revision and review. Accepted current unexpired/source-valid revisions alone may convert once through the existing order store. Preserve contact/terms/price/tax/model/costing/quote/prospect references; conversion does not automatically create a customer or Job Card. Direct orders remain supported; manufacturing still uses one parent Job Card per order.

Inclusive/exclusive VAT is explicit and configurable, with two-decimal line/tax/total rounding and full stored unit-price precision. Discount uses entered price basis; quote tax applies to the public net selling price once. Converted order/invoice paths honour the accepted basis/discount and show final invoice rounding reconciliation; direct-order behavior is unchanged. Commercial tolerance never authorizes excess dispatch/invoicing. UGX/18%/14-day defaults are editable examples requiring company confirmation, not immutable rules. Customer/prospect/company/terms data is shared session state; promotions are explicit and idempotent. Role choices, source-document limitations and exact workflow/backend rules are in quotations.md.

## Integrated operations — 15 October 2026 (supersedes earlier pending entries where stated)

Confirmed dispatch can post OUT without prior reservation; legacy allocation remains optional. Direct dispatch preserves batch/date/order bounds, QC holds, idempotency/reversal and zero outstanding reservation. Manual non-sales OUT requires purpose/reference/reason and Store/Admin; adjustment requires Admin confirmation. Orders/offers never move stock.

Conversions are positive product/model-specific effective versions; CTR/ctn/carton aliases never imply weight. New transactions freeze conversion facts; missing history remains unknown. Thresholds are per exact stock unit with critical≤minimum≤reorder≤target. Consumption uses unreversed confirmed dispatch history, never all OUT; sparse history has no forecast.

Financial snapshots distinguish entered inclusive/exclusive VAT and LED, percent vs saved-FX weight levy, markup vs gross margin, derived estimated COP vs evidenced actual COP. LED applicability remains explicit; new applicable records default to the client-confirmed MAX rule (2.5% versus USD 70/tonne × saved FX). The percentage base and VAT-on-LED remain pending/configurable; legacy modes apply only to historical snapshots. Historical quotation/order pricing remains unchanged.

Parent Job Cards remain one per order. Multiple append-only executions aggregate within approved stages; explicit final completion and existing QC/handover gates control progression. Source-scoped Generate Quotation reopens prior family; review rejection/change requests and immutable revisions retain history. Email drafts/mailto never mark Sent or claim delivery. Daily QC schedules are explicit idempotent session generation; weekly templates remain weekly and receipt/batch subjects are not auto-recurred as daily lots. KSEC remains inactive until configured. See [integrated report](sales-fulfillment.md#integrated-operations-update--15-october-2026) for formulas, metric definitions, permissions and outstanding policies.

## Client-confirmed LED MAX — 15 October 2026

LED = MAX(LED_Base × 2.5%, Eligible_KG/1,000 × USD 70 × saved USD→UGX). Higher of the Two is now the default for new applicable records. This supersedes prior statements that higher/lower selection awaits confirmation. **Percentage base remains pending clarification** and explicitly configurable; applicability and VAT-on-LED are not assumed. Both weight and FX/date are mandatory for the comparison; missing product/model KG conversion blocks finalization, never percentage-only fallback. Historical method/rate/base/FX/amount snapshots are preserved. LED is a separate commercial charge; existing base VAT basis is retained and additional VAT applies to LED only when explicitly configured. Source snapshots, not current exchange rates, flow through quotes/orders/partial invoices. See the updated sales-fulfillment report.
# Existing-item manufacturing — 23 October 2026

Sales Order manufacturing lines may use a manually entered custom product or an
existing finished-goods variant. Existing variants require exactly zero available
stock; positive, negative and unknown balances block manufacturing. Manufacture the
full ordered quantity, not a calculated shortage. A saved production model remains
required for the material recipe. Manual names are preserved when selecting a model.
The server checks persisted opening stock and purchase/GRN receipts on order creation
and deferred Job Card allocation. Already allocated retries retain idempotency.
Browser-only finished-goods movements/reservations are not persisted in that server
balance; they remain an integration limitation and cannot authorize server allocation.

# Manual Job Cards — 23 October 2026

Receptionist/Admin may create a production-for-stock Job Card without a Sales Order.
A saved model recipe, positive production quantity in its output unit, delivery date
on or after creation, and required routing are mandatory. Existing items retain the
known-zero-stock requirement. PM reviews/approves; Store issues materials through
the existing permissions and balance checks. Duplicate creation retries return the
same job; changed details with the same creation key conflict. No artificial Sales
Order or order-line reference is created.

# Operator-recorded wastage — 23 October 2026

Product creation does not define a waste percentage. Employees handling machines
record actual waste quantities and units against the production stage/run. Product
and routing editors omit default/planned waste percentages. New model revisions
saved through the editor omit those legacy defaults; new costing drafts do not
inherit product waste percentages. Explicit estimate allowances remain costing-only;
actual wastage is entered during production. Historical snapshots remain unchanged.

# Sales Order quotation generation — 23 October 2026

A new direct Sales Order automatically creates one linked draft Sales Quotation in
the same transaction. Generation copies saved quantities/prices/units, currency and
tax treatment; the sample VAT rate is not forced onto orders. Quotation-origin orders
reuse their existing quotation. Draft creation neither approves nor sends a document.
Template defaults are 14 days validity/delivery, 30 days credit and ±10% quantity
tolerance wording; review terms before sending. Tolerance does not authorize excess
dispatch/invoicing. Generated documents link back to their existing order and cannot
be converted into another order through the quotation UI.

# Planned Job Card costing — 23 October 2026

Manufacturing Job Card creation prepares planned costing after the job is saved,
for both Sales Order and manual production. Required material quantities/units and
process references come from that job, not a guessed spreadsheet conversion. Missing
prices, currencies or required exchange rates block costing approval, rather than
becoming zero. Genuine zero prices must be explicitly recorded. PM/Admin approves
each complete costing sheet before the parent Job Card is approved for material issue.
Routing/material corrections invalidate costing approval and preserve prior revisions.
Approved/issued Job Cards lock costing. Legacy records without costing are preserved;
pending legacy cards may explicitly create a sheet.

VAT-inclusive purchase prices use price/(1 + VAT rate). Currency changes require
explicit exchange rates. LED applies only when selected and uses the higher of 2.5%
on the declared base or USD 70 per tonne, with eligible kg, dated FX and explicit VAT
treatment. Piece/carton output requires a documented eligible-weight source. Four
selling-price comparisons use markup on cost, not gross margin. Wastage is recorded
by machine employees during production; no fixed product waste percentage or actual
final cost is invented at Job Card creation. Conflicting example overhead values are
not treated as authoritative rates. Units are saved on the product model/output batch.

# Stock OUT sales entry — 23 October 2026

Stock OUT sales may create a new stock-only Sales Order (Receptionist/Admin), or
confirm quantities against an existing order (Receptionist/Store/Admin). Existing
order rates/customer/tax details are retained. Multiple products and partial dispatch
are supported, with one row per selected order line and explicit batch/challan/date/
destination. Confirmation validates all lines against current stock, dated batch
balances, remaining order quantities and QC holds before publishing any movement.
No outstanding stock reservation is created by this form. Transfer/waste/adjustment
remain non-sales actions. Sales Order creation alone does not deduct physical stock.

VAT and LED are explicit commercial inputs; the reference's flat LED example does
not override the confirmed higher-of-the-two rule. Partial order discounts are
apportioned by selected line value. Dispatch commercial snapshots are not invoices.
Finished dispatch remains browser-session state until backend posting is integrated.

# Customer type and automatic order numbers — 23 October 2026

New Sales Order numbers are assigned by the backend, never manually entered or
guessed from a browser counter. Exact creation retries reuse that order number.
B2B sales expose VAT/LED inputs and totals; applicability/conversion and Higher-of-
the-Two LED validation remain explicit. B2C sales do not add VAT or LED. Switching
to B2C removes stale charge inputs/snapshots, and the server applies the same rule
to new direct orders. Existing accepted quotation/order snapshots are not silently
rewritten. B2C dispatch snapshots retain the saved item rates without adding charges.


## 29 October 2026 — Labour Job

Labour Job: record customer-owned material IN and OUT in kg. Active entries alone affect recorded balances; retain voided detail and revision history. Require reasons for correction/void; prohibit deletion. Do not infer charges or company stock postings. See [Labour Job](labour-jobs.md).


### 29 October 2026 - Labour Job options

Authorized Labour Job writers can add shared material and colour options without a movement. Saved names cannot be renamed/deleted; existing free-text movement names remain valid.


## 29 October 2026 - In-house waste delivery

In-house waste totals sum recorded active quantities; one active daily sheet per date. Monthly rates require currency confirmation; missing rates leave valuation unavailable. Corrections require reasons, voids are retained, deletion is prohibited. No automatic stock/accounting posting. See [scope](inhouse-waste.md).


### 29 October 2026 - Custom waste items

Custom Module 4 items have separate quantity and monthly rate fields. They contribute to all-waste totals and separate valuation rows; missing rates on positive quantities leave monetary totals unavailable. Saved item identities cannot be renamed/deleted.

### Customer profit and unbilled commitments — 30 October 2026

Customer profit uses posted reporting-currency income and actual attributed expense journals. A collection is not revenue, and a purchase is not necessarily COGS. Untagged income/costs remain an explicit company reconciliation bucket. Cost assignment reclassifies a bounded original expense amount on its posting date with balanced same-account entries; it does not repeat cash, cost, inventory or receivables. Assignments must follow source/prior assignment dates, respect period locks and be reversed before their source expense. New dispatch costs use the canonical order customer; existing unlinked costs need reviewed assignment.

Uninvoiced orders show current scope less source sales invoices / financial purchase bills dated through the report end. Quantities retain exact lines/units and money retains separate currencies. Commitment values use saved line rates before discounts, tax and levies. They are not posted income/payables or full historical order snapshots.

### Accounting groups and voucher masters — 30 October 2026

Group and ledger classifications must match; customer groups are assets and supplier groups liabilities. Parent group totals include descendants. GL controls and customer/supplier subledgers are reported separately to avoid double counting. Membership changes apply to all report periods without changing posted amounts.

Custom voucher types inherit a supported posting behavior and cannot bypass validation or permissions. Cost categories tag whole vouchers; they are separate from expense ledger accounts and customer cost assignment. Reversals preserve the original category. Journal vouchers must balance in reporting currency; controls require the correct party and inventory must use valuation commands. Currency masters do not supply FX or change the fixed reporting currency/two-decimal precision.
