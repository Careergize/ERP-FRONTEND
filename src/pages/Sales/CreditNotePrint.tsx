import type { CreditNote } from '@/lib/salesManagement';
import { amountInWords } from '@/lib/invoices';

/** Same browser-print/Save-as-PDF approach as QuotationPrint; no fake PDF download. */
export function creditNoteWatermark(note:CreditNote) {
  return ['Draft','Submitted','Pending Approval'].includes(note.status)?'DRAFT':note.status==='Approved'?'APPROVED PREVIEW — NOT ISSUED':note.status.toUpperCase();
}
export function CreditNotePrint({note}:{note:CreditNote}) {
  const company=note.invoice.company,currency=note.invoice.currency;
  return <section aria-label="Credit note print document" className="space-y-4 border p-5">
    <p className="sales-document-watermark border-2 border-gray-500 p-2 text-center text-xl font-bold">{creditNoteWatermark(note)}</p>
    <header className="grid gap-4 border-b pb-3 sm:grid-cols-2"><div><h3 className="text-xl font-semibold">{company?.name||'Company details not supplied on original invoice'}</h3><p className="whitespace-pre-wrap">{company?.address||'Address not supplied'}</p><p>Tax ID: {company?.taxId||'Not supplied'}</p><p>{company?.email||'Email not supplied'} · {company?.contact||'Contact not supplied'}</p></div><div><h2 className="text-xl font-semibold">Credit Note</h2><p>Number: {note.number}</p><p>Date: {note.date}</p><p>Approval status: {note.status} (frontend preview)</p></div></header>
    <p>Customer: {note.invoice.customer}</p><p>Original invoice: {note.invoice.number} · {note.invoice.date}</p><p>Sales Order: {note.invoice.orderNumber||note.invoice.orderId||'Not supplied'} · Sales Return: {note.returnNumber}</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Returned item','Quantity','Unit','Original unit price','Net / Taxable value','VAT adjustment','LED adjustment','Total credit'].map(label=><th className="border p-2" key={label}>{label}</th>)}</tr></thead><tbody><tr>{[note.line.product,note.quantity,note.line.unit,note.line.unitPrice.toFixed(2),note.net.toFixed(2),note.vat.toFixed(2),note.led.toFixed(2),`${currency} ${note.total.toFixed(2)}`].map((value,i)=><td className="border p-2" key={i}>{value}</td>)}</tr></tbody></table></div>
    <p>Original price basis: {note.invoice.taxMode}. VAT and applicable LED adjustments reproduce the approved return’s frozen invoice allocation; no new tax rule is applied.</p><p className="text-lg font-semibold">Total credit value: {currency} {note.total.toFixed(2)}</p><p>{amountInWords(note.total,currency)}</p><p>Reason: {note.reason}</p><p>Remarks: {note.remarks}</p>
    <p className="font-semibold">Frontend preview only. No official credit note has been issued or posted. Browser Save as PDF preserves this preview label; permanent authorization and issuance require backend integration.</p>
  </section>;
}
