import type { DocumentKind, DocumentStatus, Settings } from "@/types"

export const STORAGE_KEYS = {
  quotations: "jkm.quotations.v2",
  settings: "jkm.settings.v1",
  theme: "jkm.theme.v1",
  /** The pre-restructure key, read once so existing drafts survive. */
  legacyQuotations: "jkm_quotations",
} as const

/** Zambian standard-rated VAT at the time of writing. Editable in Settings. */
export const DEFAULT_TAX_RATE = 16

export const UNITS = ["pcs", "m", "roll", "box", "set", "pair", "kg", "L", "hr", "lot"] as const

export const DOCUMENT_KINDS: Record<DocumentKind, { label: string; heading: string; short: string }> = {
  quotation: { label: "Quotation", heading: "Quotation", short: "Q" },
  proforma: { label: "Proforma invoice", heading: "Proforma Invoice", short: "PF" },
  invoice: { label: "Invoice", heading: "Invoice", short: "INV" },
}

export const STATUS_META: Record<DocumentStatus, { label: string; tone: "neutral" | "info" | "success" | "danger" }> = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Sent", tone: "info" },
  accepted: { label: "Accepted", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
}

export const DEFAULT_SETTINGS: Settings = {
  company: {
    name: "JKM Distributors",
    tagline: "Electrical cables, hardware & general supplies",
    address: "Lusaka, Zambia",
    phone: "",
    email: "",
    website: "",
    tpin: "",
    logo: "",
    bank: {
      bankName: "First National Bank (FNB)",
      accountName: "JKM DISTRIBUTORS",
      accountNumber: "62536121966",
      branch: "",
      sortCode: "",
      swiftCode: "FIRNZMLXX",
      bankCode: "260016",
    },
  },
  defaultTaxRate: DEFAULT_TAX_RATE,
  currency: "ZMW",
  defaultValidityDays: 30,
  defaultTerms: "50% deposit, balance on delivery",
  defaultTermsAndConditions:
    "Prices are subject to change without notice. Goods remain the property of JKM Distributors until paid for in full. Delivery timelines are estimates and subject to stock availability.",
  numberPrefix: "JKM",
  nextNumber: 1,
}
