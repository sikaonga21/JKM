import { useMemo } from "react"
import { ArrowDownRight, ArrowUpRight, CircleDollarSign, Clock3, FileStack, Trophy } from "lucide-react"
import type { Quotation } from "@/types"
import { calculateTotals, daysUntil, isExpired } from "@/lib/calc"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"

interface StatTileProps {
  label: string
  value: string
  caption?: string
  delta?: { value: number; period: string } | null
  icon: typeof FileStack
}

/** Stat tile: label, value, optional delta. A handful of headline numbers is a
 *  KPI row, not a chart — and the value keeps proportional figures, since
 *  tabular digits look loose at display sizes. */
function StatTile({ label, value, caption, delta, icon: Icon }: StatTileProps) {
  const up = (delta?.value ?? 0) >= 0
  const DeltaIcon = up ? ArrowUpRight : ArrowDownRight

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs transition-shadow hover:shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="grid h-8 w-8 place-content-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-brand-50 group-hover:text-brand-700">
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <p className="mt-3 text-2xl font-semibold leading-none tracking-tight">{value}</p>

      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta && Number.isFinite(delta.value) && (
          <span className={cn("inline-flex items-center gap-0.5 font-medium", up ? "text-success" : "text-destructive")}>
            <DeltaIcon className="h-3.5 w-3.5" />
            {up ? "+" : ""}
            {Math.round(delta.value)}%
          </span>
        )}
        {caption && <span className="text-muted-foreground">{caption}</span>}
      </div>
    </div>
  )
}

export function StatTiles({ quotations, currency }: { quotations: Quotation[]; currency: string }) {
  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()

    let openValue = 0
    let acceptedThisMonth = 0
    let acceptedLastMonth = 0
    let expiringSoon = 0

    for (const quote of quotations) {
      const { total } = calculateTotals(quote)
      const expired = isExpired(quote)
      const updated = new Date(quote.updatedAt)

      if (!expired && (quote.status === "draft" || quote.status === "sent")) {
        openValue += total
      }

      if (quote.status === "accepted") {
        const sameMonth = updated.getMonth() === thisMonth && updated.getFullYear() === thisYear
        const prev = new Date(thisYear, thisMonth - 1, 1)
        const lastMonth = updated.getMonth() === prev.getMonth() && updated.getFullYear() === prev.getFullYear()
        if (sameMonth) acceptedThisMonth += total
        if (lastMonth) acceptedLastMonth += total
      }

      if (!expired && quote.status === "sent") {
        const days = daysUntil(quote.validUntil)
        if (days !== null && days >= 0 && days <= 7) expiringSoon++
      }
    }

    const delta =
      acceptedLastMonth > 0 ? ((acceptedThisMonth - acceptedLastMonth) / acceptedLastMonth) * 100 : null

    return { openValue, acceptedThisMonth, acceptedLastMonth, expiringSoon, delta }
  }, [quotations])

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        label="Open pipeline"
        value={formatCurrency(stats.openValue, currency)}
        caption="Drafts and sent quotes"
        icon={CircleDollarSign}
      />
      <StatTile
        label="Accepted this month"
        value={formatCurrency(stats.acceptedThisMonth, currency)}
        caption="vs last month"
        delta={stats.delta === null ? null : { value: stats.delta, period: "last month" }}
        icon={Trophy}
      />
      <StatTile
        label="Documents"
        value={String(quotations.length)}
        caption={quotations.length === 1 ? "saved document" : "saved documents"}
        icon={FileStack}
      />
      <StatTile
        label="Expiring within 7 days"
        value={String(stats.expiringSoon)}
        caption="Sent, awaiting a reply"
        icon={Clock3}
      />
    </div>
  )
}
