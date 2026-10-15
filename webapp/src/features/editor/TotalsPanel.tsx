import { Percent } from "lucide-react"
import type { Quotation } from "@/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { calculateTotals } from "@/lib/calc"
import { formatCurrency, formatNumber } from "@/lib/format"

interface TotalsPanelProps {
  quote: Quotation
  currency: string
  onChange: (patch: Partial<Quotation>) => void
}

export function TotalsPanel({ quote, currency, onChange }: TotalsPanelProps) {
  const totals = calculateTotals(quote)

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="field-label">Discount</Label>
          <div className="flex gap-2">
            {/* A segmented control, not tabs — there are no panels to switch. */}
            <div
              role="group"
              aria-label="Discount type"
              className="inline-flex h-10 items-center gap-1 rounded-xl bg-muted p-1"
            >
              <ModeButton
                active={quote.discountMode === "amount"}
                onClick={() => onChange({ discountMode: "amount" })}
                label={`Discount as an amount in ${currency}`}
              >
                {currency}
              </ModeButton>
              <ModeButton
                active={quote.discountMode === "percent"}
                onClick={() => onChange({ discountMode: "percent" })}
                label="Discount as a percentage"
              >
                <Percent className="h-3.5 w-3.5" />
              </ModeButton>
            </div>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={quote.discountMode === "percent" ? 100 : undefined}
              step="0.01"
              value={quote.discountValue}
              onChange={(event) => onChange({ discountValue: Number(event.target.value) || 0 })}
              onFocus={(event) => event.target.select()}
              className="flex-1 text-right tabular"
              aria-label="Discount value"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="field-label">VAT rate (%)</Label>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step="0.5"
            value={quote.taxRate}
            onChange={(event) => onChange({ taxRate: Number(event.target.value) || 0 })}
            onFocus={(event) => event.target.select()}
            className="text-right tabular"
            aria-label="VAT rate"
          />
        </div>
      </div>

      <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="font-medium tabular">{formatNumber(totals.subtotal)}</dd>
        </div>
        {totals.discount > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              Discount{quote.discountMode === "percent" ? ` (${quote.discountValue}%)` : ""}
            </dt>
            <dd className="font-medium tabular text-destructive">− {formatNumber(totals.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">VAT ({quote.taxRate}%)</dt>
          <dd className="font-medium tabular">{formatNumber(totals.tax)}</dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-border pt-3">
          <dt className="font-semibold uppercase tracking-wide">Total</dt>
          <dd className="text-xl font-bold">{formatCurrency(totals.total, currency)}</dd>
        </div>
      </dl>
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        "inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        active ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}
