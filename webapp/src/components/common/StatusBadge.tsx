import { CheckCircle2, Clock, FileEdit, Send, XCircle } from "lucide-react"
import type { Quotation } from "@/types"
import { Badge } from "@/components/ui/badge"
import { STATUS_META } from "@/lib/constants"
import { isExpired } from "@/lib/calc"

const ICONS = {
  draft: FileEdit,
  sent: Send,
  accepted: CheckCircle2,
  declined: XCircle,
} as const

interface StatusBadgeProps {
  quote: Quotation
  /** Hides the icon for dense contexts such as table rows on mobile. */
  compact?: boolean
}

/** Shows the stored status, unless the document has quietly lapsed. */
export function StatusBadge({ quote, compact }: StatusBadgeProps) {
  if (isExpired(quote)) {
    return (
      <Badge tone="warning">
        {!compact && <Clock className="h-3 w-3" />}
        Expired
      </Badge>
    )
  }

  const meta = STATUS_META[quote.status]
  const Icon = ICONS[quote.status]
  return (
    <Badge tone={meta.tone}>
      {!compact && <Icon className="h-3 w-3" />}
      {meta.label}
    </Badge>
  )
}
