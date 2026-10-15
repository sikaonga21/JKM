/** Every document the app can issue. Same shape, different wording on the page. */
export type DocumentKind = "quotation" | "proforma" | "invoice"

/** Where a document sits in its lifecycle. `expired` is derived, never stored. */
export type DocumentStatus = "draft" | "sent" | "accepted" | "declined"

export type DiscountMode = "amount" | "percent"

export interface LineItem {
  id: string
  qty: number
  /** Unit of measure — metres of cable, rolls, pieces. */
  unit: string
  description: string
  unitPrice: number
  taxable: boolean
}

export interface Client {
  name: string
  company: string
  location: string
  phone: string
  email: string
}

export interface Quotation {
  id: string
  /** Human-facing reference, e.g. JKM-Q-2026-0042. */
  number: string
  kind: DocumentKind
  status: DocumentStatus

  createdAt: number
  updatedAt: number

  client: Client
  /** YYYY-MM-DD */
  date: string
  /** YYYY-MM-DD — past this date the document reads as expired. */
  validUntil: string

  salesperson: string
  poNumber: string
  shipDate: string
  shipVia: string
  terms: string

  items: LineItem[]

  /** Percentage, e.g. 16 for Zambian VAT. Captured per document so old
   *  documents keep the rate they were issued under. */
  taxRate: number
  discountMode: DiscountMode
  /** A kwacha amount or a percentage, depending on `discountMode`. */
  discountValue: number

  notes: string
  termsAndConditions: string
}

export interface BankDetails {
  bankName: string
  accountName: string
  accountNumber: string
  branch: string
  sortCode: string
  swiftCode: string
  bankCode: string
}

export interface CompanyProfile {
  name: string
  tagline: string
  address: string
  phone: string
  email: string
  website: string
  /** Taxpayer Identification Number (ZRA). */
  tpin: string
  /** Data URL of an uploaded logo, or empty. */
  logo: string
  bank: BankDetails
}

export interface Settings {
  company: CompanyProfile
  defaultTaxRate: number
  currency: string
  /** Days added to the issue date to get the default validity. */
  defaultValidityDays: number
  defaultTerms: string
  defaultTermsAndConditions: string
  numberPrefix: string
  nextNumber: number
}

export type Theme = "light" | "dark" | "system"

/** What the dashboard filters on — document status plus the derived `expired`. */
export type StatusFilter = "all" | DocumentStatus | "expired"
