import type { Quotation } from "@/types"
import { Field, FieldShell, TextareaField } from "@/components/common/Field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DOCUMENT_KINDS, STATUS_META } from "@/lib/constants"
import { addDays, formatDate } from "@/lib/format"
import { daysUntil } from "@/lib/calc"

interface DetailsFormProps {
  quote: Quotation
  defaultValidityDays: number
  onChange: (patch: Partial<Quotation>) => void
  onClientChange: (patch: Partial<Quotation["client"]>) => void
}

const KIND_TAGS: Record<Quotation["kind"], string> = { quotation: "Q", proforma: "PF", invoice: "INV" }

export function DetailsForm({ quote, defaultValidityDays, onChange, onClientChange }: DetailsFormProps) {
  const remaining = daysUntil(quote.validUntil)

  /** Switching type retags an auto-generated reference, but leaves a
   *  hand-edited one alone. */
  const changeKind = (kind: Quotation["kind"]) => {
    const number = quote.number.replace(/-(Q|PF|INV)-/, `-${KIND_TAGS[kind]}-`)
    onChange({ kind, number })
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <SectionHeading title="Document" subtitle="What this is and where it stands." />
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldShell label="Type">
            <Select value={quote.kind} onValueChange={(value) => changeKind(value as Quotation["kind"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DOCUMENT_KINDS).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldShell>

          <FieldShell label="Status">
            <Select
              value={quote.status}
              onValueChange={(status) => onChange({ status: status as Quotation["status"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_META).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldShell>

          <Field
            label="Reference"
            value={quote.number}
            onChange={(event) => onChange({ number: event.target.value })}
            className="font-mono text-sm"
          />

          <Field
            label="Date issued"
            type="date"
            value={quote.date}
            onChange={(event) =>
              onChange({
                date: event.target.value,
                validUntil: addDays(event.target.value, defaultValidityDays),
              })
            }
            className="tabular"
          />

          {quote.kind !== "invoice" && (
            <Field
              label="Valid until"
              type="date"
              value={quote.validUntil}
              onChange={(event) => onChange({ validUntil: event.target.value })}
              className="tabular"
              containerClassName="sm:col-span-2"
              hint={
                remaining === null
                  ? undefined
                  : remaining < 0
                    ? `Expired ${Math.abs(remaining)} day${Math.abs(remaining) === 1 ? "" : "s"} ago (${formatDate(quote.validUntil)})`
                    : `${remaining} day${remaining === 1 ? "" : "s"} remaining`
              }
            />
          )}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading title="Client" subtitle="Who the document is addressed to." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Client name"
            value={quote.client.name}
            onChange={(event) => onClientChange({ name: event.target.value })}
            placeholder="e.g. Mwansa Phiri"
            containerClassName="sm:col-span-2"
          />
          <Field
            label="Company"
            value={quote.client.company}
            onChange={(event) => onClientChange({ company: event.target.value })}
            placeholder="Optional"
          />
          <Field
            label="Location"
            value={quote.client.location}
            onChange={(event) => onClientChange({ location: event.target.value })}
            placeholder="Lusaka"
          />
          <Field
            label="Phone"
            type="tel"
            value={quote.client.phone}
            onChange={(event) => onClientChange({ phone: event.target.value })}
            placeholder="+260 …"
          />
          <Field
            label="Email"
            type="email"
            value={quote.client.email}
            onChange={(event) => onClientChange({ email: event.target.value })}
            placeholder="name@example.com"
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading title="Order details" subtitle="Shown in the strip under the client block." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Salesperson"
            value={quote.salesperson}
            onChange={(event) => onChange({ salesperson: event.target.value })}
          />
          <Field
            label="P.O. number"
            value={quote.poNumber}
            onChange={(event) => onChange({ poNumber: event.target.value })}
          />
          <Field
            label="Ship date"
            type="date"
            value={quote.shipDate}
            onChange={(event) => onChange({ shipDate: event.target.value })}
            className="tabular"
          />
          <Field
            label="Ship via"
            value={quote.shipVia}
            onChange={(event) => onChange({ shipVia: event.target.value })}
            placeholder="e.g. Own transport"
          />
          <Field
            label="Payment terms"
            value={quote.terms}
            onChange={(event) => onChange({ terms: event.target.value })}
            containerClassName="sm:col-span-2"
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading title="Notes & conditions" subtitle="Printed at the foot of the document." />
        <TextareaField
          label="Notes to the client"
          value={quote.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
          placeholder="Delivery arrangements, stock availability, anything worth saying."
          rows={3}
        />
        <TextareaField
          label="Terms & conditions"
          value={quote.termsAndConditions}
          onChange={(event) => onChange({ termsAndConditions: event.target.value })}
          rows={4}
        />
      </section>
    </div>
  )
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  )
}
