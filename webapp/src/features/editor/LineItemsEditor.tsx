import { ChevronDown, ChevronUp, Copy, GripVertical, Plus, Trash2 } from "lucide-react"
import { v4 as uuid } from "uuid"
import type { LineItem } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { UNITS } from "@/lib/constants"
import { lineTotal } from "@/lib/calc"
import { formatNumber } from "@/lib/format"
import { createLineItem } from "@/lib/storage"

interface LineItemsEditorProps {
  items: LineItem[]
  onChange: (items: LineItem[]) => void
}

export function LineItemsEditor({ items, onChange }: LineItemsEditorProps) {
  const update = (id: string, patch: Partial<LineItem>) =>
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)))

  const remove = (id: string) => {
    const next = items.filter((item) => item.id !== id)
    // A document with no rows cannot be priced — always keep one.
    onChange(next.length ? next : [createLineItem()])
  }

  const duplicate = (id: string) => {
    const index = items.findIndex((item) => item.id === id)
    if (index === -1) return
    const copy = { ...items[index], id: uuid() }
    onChange([...items.slice(0, index + 1), copy, ...items.slice(index + 1)])
  }

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="hidden grid-cols-[28px_1fr_112px_84px_132px_52px_92px] items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground lg:grid">
          <span />
          <span>Description</span>
          <span>Qty</span>
          <span>Unit</span>
          <span className="text-right">Unit price</span>
          <span className="text-center">VAT</span>
          <span className="text-right">Amount</span>
        </div>

        <div className="divide-y divide-border">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="group grid grid-cols-2 items-center gap-2 px-3 py-3 transition-colors hover:bg-muted/30 lg:grid-cols-[28px_1fr_112px_84px_132px_52px_92px]"
            >
              <div className="col-span-2 flex items-center justify-between lg:col-span-1 lg:justify-center">
                <span className="flex items-center gap-1 text-xs text-muted-foreground lg:hidden">
                  <GripVertical className="h-3.5 w-3.5" />
                  Item {index + 1}
                </span>
                <div className="flex items-center gap-0.5 lg:flex-col lg:gap-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-5 w-5 text-muted-foreground"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label="Move item up"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-5 w-5 text-muted-foreground"
                    disabled={index === items.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label="Move item down"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <Input
                value={item.description}
                onChange={(event) => update(item.id, { description: event.target.value })}
                placeholder="e.g. 35mm × 4C armoured cable"
                className="col-span-2 h-9 lg:col-span-1"
                aria-label={`Description for item ${index + 1}`}
              />

              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={item.qty}
                onChange={(event) => update(item.id, { qty: Number(event.target.value) || 0 })}
                onFocus={(event) => event.target.select()}
                className="h-9 text-right tabular"
                aria-label={`Quantity for item ${index + 1}`}
              />

              <Select value={item.unit} onValueChange={(unit) => update(item.id, { unit })}>
                <SelectTrigger className="h-9 px-2.5" aria-label={`Unit for item ${index + 1}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={item.unitPrice}
                onChange={(event) => update(item.id, { unitPrice: Number(event.target.value) || 0 })}
                onFocus={(event) => event.target.select()}
                className="h-9 text-right tabular"
                aria-label={`Unit price for item ${index + 1}`}
              />

              <div className="flex items-center justify-start gap-2 lg:justify-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Checkbox
                        checked={item.taxable}
                        onCheckedChange={(checked) => update(item.id, { taxable: checked === true })}
                        aria-label={`Charge VAT on item ${index + 1}`}
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Charge VAT on this line</TooltipContent>
                </Tooltip>
                <span className="text-xs text-muted-foreground lg:hidden">VAT</span>
              </div>

              <div className="flex items-center justify-end gap-1">
                <span className="text-sm font-semibold tabular">
                  {formatNumber(lineTotal(item.qty, item.unitPrice))}
                </span>
                <div className="flex opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={() => duplicate(item.id)}
                    aria-label={`Duplicate item ${index + 1}`}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(item.id)}
                    aria-label={`Remove item ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button variant="outline" size="sm" className="gap-2" onClick={() => onChange([...items, createLineItem()])}>
        <Plus className="h-4 w-4" />
        Add item
      </Button>
    </div>
  )
}
