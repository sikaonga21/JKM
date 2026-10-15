import { v4 as uuid } from "uuid"
import type { Quotation, Settings } from "@/types"
import { DEFAULT_SETTINGS, STORAGE_KEYS } from "./constants"
import { addDays, toISODate } from "./format"

/** localStorage can throw (private mode, quota, blocked cookies), so every
 *  access is guarded and the app keeps working in memory if it fails. */
function readJSON<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function createLineItem(): Quotation["items"][number] {
  return { id: uuid(), qty: 1, unit: "pcs", description: "", unitPrice: 0, taxable: true }
}

export function formatDocumentNumber(settings: Settings, kind: Quotation["kind"], sequence: number): string {
  const tag = kind === "invoice" ? "INV" : kind === "proforma" ? "PF" : "Q"
  return `${settings.numberPrefix}-${tag}-${new Date().getFullYear()}-${String(sequence).padStart(4, "0")}`
}

export function createQuotation(settings: Settings): Quotation {
  const today = toISODate(new Date())
  return {
    id: uuid(),
    number: formatDocumentNumber(settings, "quotation", settings.nextNumber),
    kind: "quotation",
    status: "draft",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    client: { name: "", company: "", location: "", phone: "", email: "" },
    date: today,
    validUntil: addDays(today, settings.defaultValidityDays),
    salesperson: "",
    poNumber: "",
    shipDate: "",
    shipVia: "",
    terms: settings.defaultTerms,
    items: [createLineItem()],
    taxRate: settings.defaultTaxRate,
    discountMode: "amount",
    discountValue: 0,
    notes: "",
    termsAndConditions: settings.defaultTermsAndConditions,
  }
}

export function duplicateQuotation(source: Quotation, settings: Settings): Quotation {
  const today = toISODate(new Date())
  return {
    ...source,
    id: uuid(),
    number: formatDocumentNumber(settings, source.kind, settings.nextNumber),
    status: "draft",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    date: today,
    validUntil: addDays(today, settings.defaultValidityDays),
    client: { ...source.client },
    items: source.items.map((item) => ({ ...item, id: uuid() })),
  }
}

const KINDS = ["quotation", "proforma", "invoice"] as const
const STATUSES = ["draft", "sent", "accepted", "declined"] as const

/** Fills in anything a stored document is missing, including documents written
 *  by the first version of this app, which had a flat client and no numbering. */
export function normalizeQuotation(raw: Record<string, unknown>, settings: Settings, index = 0): Quotation {
  const base = createQuotation(settings)
  const legacyClient = typeof raw.invoiceFor === "string" ? raw.invoiceFor : ""
  const legacyLocation = typeof raw.location === "string" ? raw.location : ""
  const client = (raw.client ?? {}) as Partial<Quotation["client"]>
  const date = typeof raw.date === "string" && raw.date ? raw.date : base.date

  const items = Array.isArray(raw.items)
    ? (raw.items as Record<string, unknown>[]).map((item) => ({
        id: typeof item.id === "string" ? item.id : uuid(),
        qty: Number(item.qty) || 0,
        unit: typeof item.unit === "string" ? item.unit : "pcs",
        description: typeof item.description === "string" ? item.description : "",
        unitPrice: Number(item.unitPrice) || 0,
        taxable: item.taxable !== false,
      }))
    : base.items

  const legacyDiscount = Number(raw.discount) || 0
  const text = (key: string, fallback = "") =>
    typeof raw[key] === "string" ? (raw[key] as string) : fallback

  // Fields are copied one by one rather than spread: a wholesale spread drags
  // retired keys (invoiceFor, location, discount) into storage forever.
  return {
    ...base,
    id: typeof raw.id === "string" ? raw.id : base.id,
    number:
      typeof raw.number === "string" && raw.number
        ? raw.number
        : formatDocumentNumber(settings, "quotation", settings.nextNumber + index),
    kind: KINDS.includes(raw.kind as Quotation["kind"]) ? (raw.kind as Quotation["kind"]) : "quotation",
    status: STATUSES.includes(raw.status as Quotation["status"]) ? (raw.status as Quotation["status"]) : "draft",
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Number(raw.createdAt) || Date.now(),
    client: {
      name: client.name ?? legacyClient,
      company: client.company ?? "",
      location: client.location ?? legacyLocation,
      phone: client.phone ?? "",
      email: client.email ?? "",
    },
    date,
    validUntil:
      typeof raw.validUntil === "string" && raw.validUntil
        ? raw.validUntil
        : addDays(date, settings.defaultValidityDays),
    salesperson: text("salesperson"),
    poNumber: text("poNumber"),
    shipDate: text("shipDate"),
    shipVia: text("shipVia"),
    terms: text("terms", base.terms),
    items: items.length ? items : [createLineItem()],
    taxRate: raw.taxRate === undefined ? settings.defaultTaxRate : Number(raw.taxRate) || 0,
    discountMode: raw.discountMode === "percent" ? "percent" : "amount",
    discountValue: raw.discountValue === undefined ? legacyDiscount : Number(raw.discountValue) || 0,
    notes: typeof raw.notes === "string" ? raw.notes : "",
    termsAndConditions:
      typeof raw.termsAndConditions === "string" ? raw.termsAndConditions : settings.defaultTermsAndConditions,
  }
}

export function normalizeSettings(raw: Partial<Settings> | null): Settings {
  if (!raw) return { ...DEFAULT_SETTINGS, company: { ...DEFAULT_SETTINGS.company, bank: { ...DEFAULT_SETTINGS.company.bank } } }
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    company: {
      ...DEFAULT_SETTINGS.company,
      ...(raw.company ?? {}),
      bank: { ...DEFAULT_SETTINGS.company.bank, ...(raw.company?.bank ?? {}) },
    },
    nextNumber: Math.max(1, Number(raw.nextNumber) || 1),
  }
}

export function loadSettings(): Settings {
  return normalizeSettings(readJSON<Settings>(STORAGE_KEYS.settings))
}

export function loadQuotations(settings: Settings): Quotation[] {
  const current = readJSON<Record<string, unknown>[]>(STORAGE_KEYS.quotations)
  const source = current ?? readJSON<Record<string, unknown>[]>(STORAGE_KEYS.legacyQuotations)
  if (!Array.isArray(source)) return []
  return source.map((raw, index) => normalizeQuotation(raw, settings, index))
}

export interface BackupFile {
  app: "jkm-quotations"
  version: 2
  exportedAt: string
  settings: Settings
  quotations: Quotation[]
}

export function buildBackup(quotations: Quotation[], settings: Settings): BackupFile {
  return { app: "jkm-quotations", version: 2, exportedAt: new Date().toISOString(), settings, quotations }
}

/** Accepts a full backup file or a bare array of documents. */
export function parseBackup(
  text: string,
  fallbackSettings: Settings,
): { quotations: Quotation[]; settings: Settings | null } {
  const parsed = JSON.parse(text) as Partial<BackupFile> | Record<string, unknown>[]
  const rawQuotes = Array.isArray(parsed) ? parsed : parsed.quotations
  if (!Array.isArray(rawQuotes)) throw new Error("No quotations found in this file")

  const settings = !Array.isArray(parsed) && parsed.settings ? normalizeSettings(parsed.settings) : null
  const effective = settings ?? fallbackSettings
  return {
    quotations: (rawQuotes as Record<string, unknown>[]).map((raw, i) => normalizeQuotation(raw, effective, i)),
    settings,
  }
}

export function downloadFile(filename: string, contents: string, type = "application/json") {
  const blob = new Blob([contents], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function toCSV(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "")
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
        })
        .join(","),
    )
    .join("\n")
}
