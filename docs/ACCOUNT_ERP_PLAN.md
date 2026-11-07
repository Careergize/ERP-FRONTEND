# AccountERP implementation and gaps

Architecture reviewed: React/TypeScript frontend uses the adjacent active Django Backend accounting app, not the separate monorepo foundation. Existing transactional journals, source events, invoice settlement, permissions and reports are reused.

Module plan: accounting uses existing Finance; CRM reuses customer masters and quotations; inventory reuses finished/raw stock and valuation; procurement reuses PO/GRN and supplier billing; sales reuses quotation/order/dispatch and atomic cash/credit settlement; manufacturing reuses models, job cards, costing and raw issue to WIP.

Implemented: AccountERP dashboard/sidebar entry and route, existing /finance compatibility, Connected modules tab and accounting shortcuts. No duplicate financial posting or new ledger store. Existing source capture remains explicit; missing costs/FX/mappings remain queued. No live database edits or deployment.

Remaining brief requirements include full CRM leads, advanced warehouse/serial/expiry/FIFO workflows, RFQ comparison, bank statement matching, budgets, full expense approvals, multi-company access, full GST reporting and complete production valuation/server QC lifecycle. The navigation hub does not implement those capabilities.
