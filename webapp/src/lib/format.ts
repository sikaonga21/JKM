/** Formatting helpers. Everything the user reads as a number comes through here. */

export function formatCurrency(amount: number, currency = "ZMW"): string {
  try {
    return new Intl.NumberFormat("en-ZM", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0)
  } catch {
    return `${currency} ${formatNumber(amount)}`
  }
}

/** Bare number for table cells that already sit under a currency column. */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat("en-ZM", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

export function formatDate(value: string | number | undefined | null): string {
  if (!value) return "—"
  const date = typeof value === "number" ? new Date(value) : parseISODate(value)
  if (!date || Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date)
}

export function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.round(diff / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(timestamp)
}

/** Parses YYYY-MM-DD as local time — `new Date(str)` would read it as UTC. */
export function parseISODate(value: string): Date | null {
  if (!value) return null
  const [y, m, d] = value.split("-").map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function toISODate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso) ?? new Date()
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
]
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

function chunkToWords(n: number): string {
  if (n === 0) return ""
  if (n < 20) return ONES[n]
  if (n < 100) {
    const rest = n % 10
    return TENS[Math.floor(n / 10)] + (rest ? `-${ONES[rest]}` : "")
  }
  const rest = n % 100
  return `${ONES[Math.floor(n / 100)]} Hundred${rest ? ` and ${chunkToWords(rest)}` : ""}`
}

/** "Four Thousand Two Hundred Kwacha and Fifty Ngwee" — standard on ZM invoices. */
export function amountInWords(amount: number, currency = "ZMW"): string {
  const unitNames: Record<string, [string, string]> = {
    ZMW: ["Kwacha", "Ngwee"],
    USD: ["Dollars", "Cents"],
    GBP: ["Pounds", "Pence"],
    EUR: ["Euros", "Cents"],
    ZAR: ["Rand", "Cents"],
  }
  const [major, minor] = unitNames[currency] ?? [currency, "Cents"]

  const safe = Math.max(0, Math.round((amount || 0) * 100) / 100)
  const whole = Math.floor(safe)
  const fraction = Math.round((safe - whole) * 100)

  if (whole === 0 && fraction === 0) return `Zero ${major}`

  const scales = ["", "Thousand", "Million", "Billion"]
  const parts: string[] = []
  let remaining = whole
  let scale = 0

  while (remaining > 0 && scale < scales.length) {
    const chunk = remaining % 1000
    if (chunk) parts.unshift(`${chunkToWords(chunk)}${scales[scale] ? ` ${scales[scale]}` : ""}`)
    remaining = Math.floor(remaining / 1000)
    scale++
  }

  const wholeWords = parts.join(" ") || "Zero"
  const fractionWords = fraction ? ` and ${chunkToWords(fraction)} ${minor}` : ""
  return `${wholeWords} ${major}${fractionWords}`
}

/** Safe, readable filename stem for exports. */
export function slugify(value: string, fallback = "document"): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || fallback
}
