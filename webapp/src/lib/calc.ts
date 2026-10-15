import type { Quotation } from "@/types"
import { parseISODate } from "./format"

export interface Totals {
  subtotal: number
  taxableBase: number
  discount: number
  tax: number
  total: number
  itemCount: number
}

/** The single source of truth for money. Dashboard and editor both use it,
 *  so a quote can never total differently in two places.
 *
 *  Order of operations: discount comes off the subtotal first, then VAT is
 *  charged on the discounted taxable portion — the way ZRA expects it. */
export function calculateTotals(quote: Quotation): Totals {
  const subtotal = quote.items.reduce((sum, item) => sum + lineTotal(item.qty, item.unitPrice), 0)
  const taxableSubtotal = quote.items.reduce(
    (sum, item) => sum + (item.taxable ? lineTotal(item.qty, item.unitPrice) : 0),
    0,
  )

  const rawDiscount =
    quote.discountMode === "percent"
      ? (subtotal * clamp(quote.discountValue, 0, 100)) / 100
      : Math.max(0, quote.discountValue || 0)
  const discount = Math.min(rawDiscount, subtotal)

  // Spread the discount proportionally so the taxable base shrinks with it.
  const discountRatio = subtotal > 0 ? discount / subtotal : 0
  const taxableBase = taxableSubtotal * (1 - discountRatio)
  const tax = taxableBase * ((quote.taxRate || 0) / 100)

  return {
    subtotal: round(subtotal),
    taxableBase: round(taxableBase),
    discount: round(discount),
    tax: round(tax),
    total: round(subtotal - discount + tax),
    itemCount: quote.items.length,
  }
}

export function lineTotal(qty: number, unitPrice: number): number {
  return (Number(qty) || 0) * (Number(unitPrice) || 0)
}

export function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number(value) || 0))
}

/** A document is expired once its validity date has passed and nobody has
 *  accepted or declined it. Invoices do not expire. */
export function isExpired(quote: Quotation, now = new Date()): boolean {
  if (quote.kind === "invoice") return false
  if (quote.status === "accepted" || quote.status === "declined") return false
  const until = parseISODate(quote.validUntil)
  if (!until) return false
  until.setHours(23, 59, 59, 999)
  return until.getTime() < now.getTime()
}

export function daysUntil(iso: string, now = new Date()): number | null {
  const date = parseISODate(iso)
  if (!date) return null
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((date.getTime() - start.getTime()) / 86_400_000)
}

/** Flags that block sending a document — surfaced in the editor, never blocking. */
export function validate(quote: Quotation): string[] {
  const issues: string[] = []
  if (!quote.client.name.trim()) issues.push("Client name is empty")
  if (quote.items.length === 0) issues.push("No line items")
  if (quote.items.some((item) => !item.description.trim())) issues.push("An item has no description")
  if (quote.items.some((item) => item.qty <= 0)) issues.push("An item has zero quantity")
  if (quote.items.length > 0 && quote.items.every((item) => item.unitPrice <= 0)) {
    issues.push("All items are priced at zero")
  }
  return issues
}
