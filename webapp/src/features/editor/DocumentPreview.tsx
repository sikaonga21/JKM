import { forwardRef } from "react"
import type { Quotation, Settings } from "@/types"
import { BrandMark } from "@/components/layout/BrandMark"
import { DOCUMENT_KINDS } from "@/lib/constants"
import { calculateTotals, isExpired, lineTotal } from "@/lib/calc"
import { amountInWords, formatDate, formatNumber } from "@/lib/format"

interface DocumentPreviewProps {
  quote: Quotation
  settings: Settings
  /** Only the off-screen capture copy carries the print id. */
  id?: string
}

/**
 * The printed sheet. Always light, always A4, never bound to app theme —
 * what is captured here is exactly what lands in the PDF and on paper.
 */
export const DocumentPreview = forwardRef<HTMLDivElement, DocumentPreviewProps>(function DocumentPreview(
  { quote, settings, id },
  ref,
) {
  const { company, currency } = settings
  const totals = calculateTotals(quote)
  const kind = DOCUMENT_KINDS[quote.kind]
  const expired = isExpired(quote)
  const contact = [company.phone, company.email, company.website].filter(Boolean)

  return (
    <div ref={ref} id={id} className="paper font-sans text-[10.5px] leading-relaxed text-slate-900">
      {/* Letterhead ------------------------------------------------- */}
      <header className="flex items-start justify-between gap-8 border-b-2 border-slate-900 pb-5">
        <div className="flex items-start gap-3">
          <BrandMark logo={company.logo} name={company.name} variant="paper" className="h-11 w-11" />
          <div>
            <h1 className="text-[19px] font-extrabold uppercase leading-tight tracking-wide text-slate-900">
              {company.name}
            </h1>
            {company.tagline && <p className="mt-0.5 text-[10px] text-slate-500">{company.tagline}</p>}
            <div className="mt-1.5 space-y-0.5 text-[9.5px] text-slate-600">
              {company.address && <p>{company.address}</p>}
              {contact.length > 0 && <p>{contact.join("  ·  ")}</p>}
              {company.tpin && <p>TPIN: {company.tpin}</p>}
            </div>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[22px] font-bold uppercase leading-none tracking-[0.14em] text-slate-900">
            {kind.heading}
          </p>
          <p className="mt-2 font-mono text-[11px] font-medium text-slate-700">{quote.number}</p>
          {expired && (
            <p className="mt-1.5 inline-block rounded border border-amber-400 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
              Expired
            </p>
          )}
        </div>
      </header>

      {/* Parties ----------------------------------------------------- */}
      <section className="mt-6 flex justify-between gap-10">
        <div className="max-w-[60%]">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
            {quote.kind === "invoice" ? "Invoice to" : "Quotation for"}
          </p>
          <p className="mt-1.5 text-[13px] font-bold text-slate-900">{quote.client.name || "—"}</p>
          <div className="mt-0.5 space-y-0.5 text-[10px] text-slate-600">
            {quote.client.company && <p>{quote.client.company}</p>}
            {quote.client.location && <p>{quote.client.location}</p>}
            {quote.client.phone && <p>{quote.client.phone}</p>}
            {quote.client.email && <p>{quote.client.email}</p>}
          </div>
        </div>

        <dl className="shrink-0 space-y-1 text-right text-[10px]">
          <div className="flex justify-between gap-6">
            <dt className="text-slate-500">Date issued</dt>
            <dd className="font-semibold tabular">{formatDate(quote.date)}</dd>
          </div>
          {quote.kind !== "invoice" && (
            <div className="flex justify-between gap-6">
              <dt className="text-slate-500">Valid until</dt>
              <dd className="font-semibold tabular">{formatDate(quote.validUntil)}</dd>
            </div>
          )}
          {quote.poNumber && (
            <div className="flex justify-between gap-6">
              <dt className="text-slate-500">P.O. number</dt>
              <dd className="font-semibold tabular">{quote.poNumber}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Logistics strip --------------------------------------------- */}
      <section className="mt-5 grid grid-cols-4 overflow-hidden rounded border border-slate-200">
        {[
          { label: "Salesperson", value: quote.salesperson },
          { label: "Ship date", value: quote.shipDate ? formatDate(quote.shipDate) : "" },
          { label: "Ship via", value: quote.shipVia },
          { label: "Terms", value: quote.terms },
        ].map((cell, index) => (
          <div
            key={cell.label}
            className={`px-3 py-2 ${index < 3 ? "border-r border-slate-200" : ""}`}
          >
            <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-slate-400">{cell.label}</p>
            <p className="mt-0.5 truncate text-[10px] font-medium text-slate-800">{cell.value || "—"}</p>
          </div>
        ))}
      </section>

      {/* Line items --------------------------------------------------- */}
      <table className="mt-5 w-full border-collapse">
        <thead>
          <tr className="bg-slate-900 text-white">
            <th className="w-9 px-2 py-2 text-left text-[9px] font-bold uppercase tracking-wider">#</th>
            <th className="px-2 py-2 text-left text-[9px] font-bold uppercase tracking-wider">Description</th>
            <th className="w-20 px-2 py-2 text-right text-[9px] font-bold uppercase tracking-wider">Qty</th>
            <th className="w-24 px-2 py-2 text-right text-[9px] font-bold uppercase tracking-wider">Unit price</th>
            <th className="w-12 px-2 py-2 text-center text-[9px] font-bold uppercase tracking-wider">VAT</th>
            <th className="w-28 px-2 py-2 text-right text-[9px] font-bold uppercase tracking-wider">Amount</th>
          </tr>
        </thead>
        <tbody>
          {quote.items.map((item, index) => (
            <tr key={item.id} className="border-b border-slate-200 align-top">
              <td className="px-2 py-2 text-[10px] text-slate-400 tabular">{index + 1}</td>
              <td className="px-2 py-2 text-[10.5px] text-slate-800">{item.description || "—"}</td>
              <td className="px-2 py-2 text-right text-[10.5px] text-slate-700 tabular">
                {formatNumber(item.qty).replace(/\.00$/, "")} {item.unit}
              </td>
              <td className="px-2 py-2 text-right text-[10.5px] text-slate-700 tabular">
                {formatNumber(item.unitPrice)}
              </td>
              <td className="px-2 py-2 text-center text-[10px] text-slate-500">{item.taxable ? "Yes" : "—"}</td>
              <td className="px-2 py-2 text-right text-[10.5px] font-semibold text-slate-900 tabular">
                {formatNumber(lineTotal(item.qty, item.unitPrice))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals ------------------------------------------------------- */}
      <section className="mt-5 flex justify-between gap-8">
        <div className="max-w-[55%] flex-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Amount in words</p>
          <p className="mt-1 text-[10px] font-medium italic text-slate-700">
            {amountInWords(totals.total, currency)} only
          </p>

          {quote.notes && (
            <div className="mt-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Notes</p>
              <p className="mt-1 whitespace-pre-line text-[10px] text-slate-600">{quote.notes}</p>
            </div>
          )}
        </div>

        <div className="w-60 shrink-0">
          <dl className="space-y-1.5 text-[10.5px]">
            <div className="flex justify-between">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="font-medium tabular">{formatNumber(totals.subtotal)}</dd>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-slate-600">
                <dt>
                  Discount
                  {quote.discountMode === "percent" ? ` (${quote.discountValue}%)` : ""}
                </dt>
                <dd className="font-medium tabular">− {formatNumber(totals.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-500">VAT ({quote.taxRate}%)</dt>
              <dd className="font-medium tabular">{formatNumber(totals.tax)}</dd>
            </div>
            <div className="mt-2 flex items-baseline justify-between border-t-2 border-slate-900 pt-2">
              <dt className="text-[11px] font-bold uppercase tracking-wide">Total</dt>
              <dd className="text-[15px] font-extrabold tabular">
                {currency} {formatNumber(totals.total)}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Payment + sign-off ------------------------------------------- */}
      <section className="mt-6 grid grid-cols-2 gap-6">
        <div className="rounded border border-slate-200 bg-slate-50 p-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Banking details</p>
          <dl className="mt-1.5 space-y-0.5 text-[9.5px] text-slate-700">
            <Row label="Bank" value={company.bank.bankName} />
            <Row label="Account name" value={company.bank.accountName} />
            <Row label="Account no." value={company.bank.accountNumber} />
            <Row label="Branch" value={company.bank.branch} />
            <Row label="Sort code" value={company.bank.sortCode} />
            <Row label="Swift" value={company.bank.swiftCode} />
            <Row label="Bank code" value={company.bank.bankCode} />
          </dl>
        </div>

        <div className="flex flex-col justify-between">
          {quote.termsAndConditions && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Terms &amp; conditions</p>
              <p className="mt-1 whitespace-pre-line text-[9px] leading-snug text-slate-600">
                {quote.termsAndConditions}
              </p>
            </div>
          )}
          <div className="mt-6">
            <div className="h-10 border-b border-slate-400" />
            <p className="mt-1 text-[9px] text-slate-500">
              Authorised signature — for and on behalf of {company.name}
            </p>
          </div>
        </div>
      </section>

      <footer className="mt-6 border-t border-slate-200 pt-2 text-center text-[8.5px] text-slate-400">
        {kind.heading} {quote.number} · Issued {formatDate(quote.date)} · Thank you for your business
      </footer>
    </div>
  )
})

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium tabular">{value}</dd>
    </div>
  )
}
