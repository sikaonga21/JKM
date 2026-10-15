import { useMemo, useRef, useState } from "react"
import { FilePlus2, FileSearch, Plus, Search, SlidersHorizontal, X } from "lucide-react"
import type { Quotation, StatusFilter } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EmptyState } from "@/components/common/EmptyState"
import { calculateTotals, isExpired } from "@/lib/calc"
import { useHotkeys } from "@/hooks/useHotkeys"
import { StatTiles } from "./StatTiles"
import { QuotationTable } from "./QuotationTable"

type SortKey = "recent" | "oldest" | "value-desc" | "value-asc" | "client"

const SORT_LABELS: Record<SortKey, string> = {
  recent: "Newest first",
  oldest: "Oldest first",
  "value-desc": "Highest value",
  "value-asc": "Lowest value",
  client: "Client A–Z",
}

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All statuses",
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
}

interface DashboardProps {
  quotations: Quotation[]
  currency: string
  onCreateNew: () => void
  onOpen: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (quote: Quotation) => void
  onStatusChange: (id: string, status: Quotation["status"]) => void
}

export function Dashboard({
  quotations,
  currency,
  onCreateNew,
  onOpen,
  onDuplicate,
  onDelete,
  onStatusChange,
}: DashboardProps) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [sort, setSort] = useState<SortKey>("recent")
  const searchRef = useRef<HTMLInputElement>(null)

  useHotkeys({
    "/": () => searchRef.current?.focus(),
  })

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()

    const filtered = quotations.filter((quote) => {
      if (status !== "all") {
        const expired = isExpired(quote)
        if (status === "expired" ? !expired : expired || quote.status !== status) return false
      }
      if (!needle) return true
      return [
        quote.number,
        quote.client.name,
        quote.client.company,
        quote.client.location,
        quote.poNumber,
        quote.salesperson,
        ...quote.items.map((item) => item.description),
      ]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(needle))
    })

    // Sorting returns a new array — mutating state in place made the dashboard
    // re-render inconsistently.
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return a.createdAt - b.createdAt
        case "value-desc":
          return calculateTotals(b).total - calculateTotals(a).total
        case "value-asc":
          return calculateTotals(a).total - calculateTotals(b).total
        case "client":
          return (a.client.name || "~").localeCompare(b.client.name || "~")
        default:
          return b.createdAt - a.createdAt
      }
    })
  }, [quotations, query, status, sort])

  const filtersActive = query.trim() !== "" || status !== "all"

  return (
    <div className="container space-y-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quotations, proforma and invoices — saved on this device.
          </p>
        </div>
        <Button onClick={onCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          New quotation
          <kbd className="ml-1 hidden rounded border border-white/25 px-1.5 py-0.5 font-sans text-[10px] font-medium opacity-80 sm:inline">
            Ctrl N
          </kbd>
        </Button>
      </div>

      <StatTiles quotations={quotations} currency={currency} />

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="flex flex-col gap-3 border-b border-border bg-muted/30 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search reference, client, item…"
              className="pl-9 pr-9"
              aria-label="Search documents"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-content-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
              <SelectTrigger className="w-[150px]" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
              <SelectTrigger className="w-[160px]" aria-label="Sort documents">
                <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SORT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {quotations.length === 0 ? (
          <EmptyState
            icon={FilePlus2}
            title="No documents yet"
            description="Create your first quotation. Everything is stored locally in this browser, and you can export a backup at any time."
            action={
              <Button onClick={onCreateNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Create first quotation
              </Button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title="Nothing matches those filters"
            description="Try a different search term, or clear the filters to see every document."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("")
                  setStatus("all")
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <QuotationTable
              quotations={visible}
              currency={currency}
              onOpen={onOpen}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
            />
            <div className="border-t border-border bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
              Showing {visible.length} of {quotations.length}
              {filtersActive ? " (filtered)" : ""} · press{" "}
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-sans text-[10px]">/</kbd> to
              search
            </div>
          </>
        )}
      </section>
    </div>
  )
}
