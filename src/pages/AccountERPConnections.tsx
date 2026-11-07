import { Card } from '@/components/ui/Card';

const modules = [
  { name: 'CRM & customers', detail: 'Use saved customer identities and quotations; the same customer ledger receives the invoice.', links: [['/quotations', 'Quotations'], ['/masters', 'Customer masters']] },
  { name: 'Sales', detail: 'Quotation → approved order → dispatch → invoice. Cash settlement posts a receipt; credit remains receivable. Orders alone are not revenue.', links: [['/sales-orders', 'Sales orders'], ['/sales', 'Sales management'], ['/stock', 'Dispatch / Stock OUT']] },
  { name: 'Inventory & warehouse', detail: 'Receipts and issues feed valuation. Dispatch posts cost of goods sold when costs are available, without deducting physical stock again.', links: [['/stock', 'Finished goods'], ['/raw-materials', 'Raw materials'], ['/track-trace', 'Track & Trace']] },
  { name: 'Procurement & purchases', detail: 'Purchase order → accepted GRN → inventory value. Create the actual supplier bill in Purchase Bills; placing an order alone does not create a payable.', links: [['/procurement', 'Procurement planner'], ['/purchase-orders', 'Purchase orders'], ['/goods-received-notes', 'GRNs']] },
  { name: 'Manufacturing & production', detail: 'Reuse saved models, job cards and costing. Approved raw-material issues feed work in progress; missing valuation inputs remain visible in Posting Queue.', links: [['/job-cards', 'Job cards'], ['/production-models', 'Production models'], ['/costing', 'Costing']] },
] as const;

export function AccountERPConnections({ pending, onSection }: { pending: number; onSection: (section: string) => void }) {
  return <section className="space-y-4" aria-label="Connected ERP modules">
    <Card><h2 className="text-lg font-semibold">One connected accounting book</h2><p className="mt-2 text-sm text-gray-600">Financial totals come from posted backend journals. These modules reuse the existing operational records and accounting integration. Screen access and posting actions remain subject to your existing permissions.</p>
      <div className="mt-4 flex flex-wrap gap-2">{[['Analysis','Posted sales & vouchers'],['Ledgers','Customer / supplier balances'],['Purchase Bills','Supplier billing'],['Reports','Financial statements'],['Posting Queue',`Posting queue (${pending})`]].map(([section,label])=><button key={section} className="rounded-lg border px-3 py-2 text-sm" onClick={()=>onSection(section)}>{label}</button>)}</div>
    </Card>
    <div className="grid gap-4 lg:grid-cols-2">{modules.map(module=><Card key={module.name}><h3 className="font-semibold">{module.name}</h3><p className="mt-2 text-sm text-gray-600">{module.detail}</p><div className="mt-3 flex flex-wrap gap-3">{module.links.map(([href,label])=><a key={href} className="text-sm text-navy underline" href={href}>{label}</a>)}</div></Card>)}</div>
    <Card><h3 className="font-semibold">When a sale is missing</h3><p className="mt-2 text-sm text-gray-600">Confirm that dispatch and its invoice were saved, check the report dates and customer ledger, then review Posting Queue for missing FX, costs or mappings. For eligible older saved records, use the explicit capture action in Posting Queue after confirming the accounting cutover. Refresh the dashboard to load the latest postings.</p></Card>
  </section>;
}
