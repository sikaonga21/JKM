import { describe, expect, it } from "vitest"
import { duplicateQuotation, normalizeQuotation, parseBackup, toCSV } from "./storage"
import { addDays } from "./format"
import { DEFAULT_SETTINGS } from "./constants"

/** A document exactly as the first version of the app stored it. */
const legacyQuote = {
  id: "legacy-1",
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
  invoiceFor: "Mwansa Phiri",
  location: "LUSAKA",
  date: "2025-09-06",
  salesperson: "JK",
  poNumber: "PO-12",
  shipDate: "",
  shipVia: "",
  terms: "",
  items: [{ id: "x", qty: 3, description: "16mm bare copper", unitPrice: 120, taxable: true }],
  discount: 50,
}

describe("normalizeQuotation", () => {
  const migrated = normalizeQuotation({ ...legacyQuote }, DEFAULT_SETTINGS)

  it("moves the flat client fields into the client record", () => {
    expect(migrated.client.name).toBe("Mwansa Phiri")
    expect(migrated.client.location).toBe("LUSAKA")
  })

  it("reads the old flat discount as a cash discount", () => {
    expect(migrated.discountMode).toBe("amount")
    expect(migrated.discountValue).toBe(50)
  })

  it("fills in fields the old model never had", () => {
    expect(migrated.items[0].unit).toBe("pcs")
    expect(migrated.number).toMatch(/^JKM-Q-\d{4}-\d{4}$/)
    expect(migrated.validUntil).toBe(addDays("2025-09-06", 30))
    expect(migrated.taxRate).toBe(16)
    expect(migrated.status).toBe("draft")
  })

  it("keeps the original id so an edited document is not duplicated", () => {
    expect(migrated.id).toBe("legacy-1")
  })

  it("drops retired keys instead of carrying them forever", () => {
    expect(migrated).not.toHaveProperty("invoiceFor")
    expect(migrated).not.toHaveProperty("discount")
  })

  it("survives junk input", () => {
    const empty = normalizeQuotation({}, DEFAULT_SETTINGS)
    expect(empty.items).toHaveLength(1)
    expect(empty.client.name).toBe("")
  })
})

describe("duplicateQuotation", () => {
  const source = normalizeQuotation({ ...legacyQuote }, DEFAULT_SETTINGS)
  const copy = duplicateQuotation(source, { ...DEFAULT_SETTINGS, nextNumber: 7 })

  it("issues a fresh identity", () => {
    expect(copy.id).not.toBe(source.id)
    expect(copy.items[0].id).not.toBe(source.items[0].id)
    expect(copy.number).toMatch(/-0007$/)
    expect(copy.status).toBe("draft")
  })

  it("does not share line items with the original", () => {
    copy.items[0].qty = 99
    expect(source.items[0].qty).toBe(3)
  })
})

describe("parseBackup", () => {
  it("accepts a full backup file", () => {
    const file = JSON.stringify({
      app: "jkm-quotations",
      version: 2,
      quotations: [legacyQuote],
      settings: { ...DEFAULT_SETTINGS, currency: "USD" },
    })
    const result = parseBackup(file, DEFAULT_SETTINGS)
    expect(result.quotations).toHaveLength(1)
    expect(result.settings?.currency).toBe("USD")
  })

  it("accepts a bare array of documents", () => {
    const result = parseBackup(JSON.stringify([legacyQuote]), DEFAULT_SETTINGS)
    expect(result.quotations).toHaveLength(1)
    expect(result.settings).toBeNull()
  })

  it("rejects a file that holds no documents", () => {
    expect(() => parseBackup(JSON.stringify({ hello: "world" }), DEFAULT_SETTINGS)).toThrow()
  })
})

describe("toCSV", () => {
  it("escapes commas and quotes", () => {
    expect(toCSV([["a,b", 'say "hi"']])).toBe('"a,b","say ""hi"""')
  })
})
