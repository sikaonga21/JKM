import { Copy, FileText, MoreHorizontal, PencilLine, Send, Trash2, CheckCircle2, XCircle } from "lucide-react"
import type { Quotation } from "@/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/common/StatusBadge"
import { DOCUMENT_KINDS } from "@/lib/constants"
import { calculateTotals } from "@/lib/calc"
import { formatCurrency, formatDate } from "@/lib/format"

interface QuotationTableProps {
  quotations: Quotation[]
  currency: string
  onOpen: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (quote: Quotation) => void
  onStatusChange: (id: string, status: Quotation["status"]) => void
}

export function QuotationTable({
  quotations,
  currency,
  onOpen,
  onDuplicate,
  onDelete,
  onStatusChange,
}: QuotationTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[150px]">Reference</TableHead>
          <TableHead>Client</TableHead>
          <TableHead className="hidden md:table-cell w-[120px]">Issued</TableHead>
          <TableHead className="hidden lg:table-cell w-[120px]">Valid until</TableHead>
          <TableHead className="w-[120px]">Status</TableHead>
          <TableHead className="w-[140px] text-right">Total</TableHead>
          <TableHead className="w-[52px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {quotations.map((quote) => {
          const { total, itemCount } = calculateTotals(quote)
          return (
            <TableRow
              key={quote.id}
              className="group cursor-pointer"
              onClick={() => onOpen(quote.id)}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter") onOpen(quote.id)
              }}
            >
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-content-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-brand-50 group-hover:text-brand-700">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium tabular">{quote.number}</p>
                    <p className="text-xs text-muted-foreground">{DOCUMENT_KINDS[quote.kind].label}</p>
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <p className="truncate font-medium">{quote.client.name || "Unnamed client"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[quote.client.company, quote.client.location].filter(Boolean).join(" · ") ||
                    `${itemCount} ${itemCount === 1 ? "item" : "items"}`}
                </p>
              </TableCell>

              <TableCell className="hidden md:table-cell text-sm text-muted-foreground tabular">
                {formatDate(quote.date)}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground tabular">
                {quote.kind === "invoice" ? "—" : formatDate(quote.validUntil)}
              </TableCell>

              <TableCell>
                <StatusBadge quote={quote} />
              </TableCell>

              <TableCell className="text-right font-semibold tabular">
                {formatCurrency(total, currency)}
              </TableCell>

              <TableCell onClick={(event) => event.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions for ${quote.number}`}
                      className="opacity-60 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onSelect={() => onOpen(quote.id)}>
                      <PencilLine />
                      Open
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onDuplicate(quote.id)}>
                      <Copy />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Mark as</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => onStatusChange(quote.id, "sent")}>
                      <Send />
                      Sent
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onStatusChange(quote.id, "accepted")}>
                      <CheckCircle2 />
                      Accepted
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onStatusChange(quote.id, "declined")}>
                      <XCircle />
                      Declined
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem destructive onSelect={() => onDelete(quote)}>
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
