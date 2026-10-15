import { describe, expect, it } from "vitest"
import { calculateTotals, isExpired, validate } from "./calc"
import { addDays, amountInWords, formatNumber, toISODate } from "./format"
import { createQuotation } from "./storage"
import { DEFAULT_SETTINGS } from "./constants"
import type { Quotation } from "@/types"

const today = toISODate(new Date())

/** 10 m of cable at 250 (VAT applies) plus 2 wheelbarrows at 900 (zero-rated). */
function sampleQuote(overrides: Partial<Quotation> = {}): Quotation {
  return {
    ...createQuotation(DEFAULT_SETTINGS),
    taxRate: 16,
    items: [
      { id: "a", qty: 10, unit: "m", description: "35mm x 4C armoured cable", unitPrice: 250, taxable: true },
      { id: "b", qty: 2, unit: "pcs", description: "Wheelbarrow", unitPrice: 900, taxable: false },
    ],
    ...overrides,
  }
}

describe("calculateTotals", () => {
  it("sums every line into the subtotal", () => {
    expect(calculateTotals(sampleQuote()).subtotal).toBe(4300)
  })

  it("charges VAT only on lines marked taxable", () => {
    expect(calculateTotals(sampleQuote()).tax).toBe(400)
  })

  it("applies the discount before VAT, so the taxable base shrinks with it", () => {
    const totals = calculateTotals(sampleQuote({ discountMode: "amount", discountValue: 430 }))
    expect(totals.discount).toBe(430)
    expect(totals.tax).toBe(360)
    expect(totals.total).toBe(4230)
  })

  it("treats a percentage discount as the equivalent cash discount", () => {
    const cash = calculateTotals(sampleQuote({ discountMode: "amount", discountValue: 430 }))
    const percent = calculateTotals(sampleQuote({ discountMode: "percent", discountValue: 10 }))
    expect(percent.total).toBe(cash.total)
  })

  it("never discounts past zero", () => {
    const totals = calculateTotals(sampleQuote({ discountMode: "amount", discountValue: 99_999 }))
    expect(totals.discount).toBe(4300)
    expect(totals.total).toBe(0)
  })

  it("handles a document with no lines", () => {
    expect(calculateTotals(sampleQuote({ items: [] })).total).toBe(0)
  })
})

describe("isExpired", () => {
  const lapsed = addDays(today, -1)

  it("expires a sent quote once its validity passes", () => {
    expect(isExpired(sampleQuote({ status: "sent", validUntil: lapsed }))).toBe(true)
  })

  it("leaves a decided quote alone", () => {
    expect(isExpired(sampleQuote({ status: "accepted", validUntil: lapsed }))).toBe(false)
    expect(isExpired(sampleQuote({ status: "declined", validUntil: lapsed }))).toBe(false)
  })

  it("never expires an invoice", () => {
    expect(isExpired(sampleQuote({ kind: "invoice", status: "sent", validUntil: lapsed }))).toBe(false)
  })

  it("counts the final day as still valid", () => {
    expect(isExpired(sampleQuote({ status: "sent", validUntil: today }))).toBe(false)
  })
})

describe("validate", () => {
  it("flags the things that stop a document going out", () => {
    const issues = validate(sampleQuote({ items: [{ id: "a", qty: 0, unit: "pcs", description: "", unitPrice: 0, taxable: true }] }))
    expect(issues).toContain("Client name is empty")
    expect(issues).toContain("An item has no description")
    expect(issues).toContain("An item has zero quantity")
  })

  it("passes a complete document", () => {
    const quote = sampleQuote()
    quote.client.name = "Acme Construction"
    expect(validate(quote)).toEqual([])
  })
})

describe("amountInWords", () => {
  it.each([
    [4700, "Four Thousand Seven Hundred Kwacha"],
    [1234.56, "One Thousand Two Hundred and Thirty-Four Kwacha and Fifty-Six Ngwee"],
    [15, "Fifteen Kwacha"],
    [2_000_000, "Two Million Kwacha"],
    [0, "Zero Kwacha"],
  ])("writes %s as words", (amount, expected) => {
    expect(amountInWords(amount, "ZMW")).toBe(expected)
  })
})

describe("formatNumber", () => {
  it("always shows two decimal places", () => {
    expect(formatNumber(1234.5)).toBe("1,234.50")
  })
})
