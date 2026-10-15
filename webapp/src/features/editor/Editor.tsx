import { useCallback, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Download,
  Eye,
  Loader2,
  type LucideIcon,
  PenLine,
  Printer,
  Save,
} from "lucide-react"
import { toast } from "sonner"
import type { Quotation, Settings } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { StatusBadge } from "@/components/common/StatusBadge"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { useHotkeys } from "@/hooks/useHotkeys"
import { calculateTotals, validate } from "@/lib/calc"
import { DOCUMENT_KINDS } from "@/lib/constants"
import { formatCurrency, slugify } from "@/lib/format"
import { exportElementToPDF } from "@/lib/pdf"
import { DetailsForm } from "./DetailsForm"
import { LineItemsEditor } from "./LineItemsEditor"
import { TotalsPanel } from "./TotalsPanel"
import { PreviewPane } from "./PreviewPane"
import { CaptureSheet } from "./CaptureSheet"

interface EditorProps {
  initial: Quotation
  settings: Settings
  onSave: (quote: Quotation) => void
  onClose: () => void
}

export function Editor({ initial, settings, onSave, onClose }: EditorProps) {
  const [quote, setQuote] = useState<Quotation>(initial)
  const [dirty, setDirty] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  const totals = useMemo(() => calculateTotals(quote), [quote])
  const issues = useMemo(() => validate(quote), [quote])

  const patch = useCallback((changes: Partial<Quotation>) => {
    setQuote((prev) => ({ ...prev, ...changes }))
    setDirty(true)
  }, [])

  const patchClient = useCallback((changes: Partial<Quotation["client"]>) => {
    setQuote((prev) => ({ ...prev, client: { ...prev.client, ...changes } }))
    setDirty(true)
  }, [])

  const save = useCallback(() => {
    onSave(quote)
    setDirty(false)
    toast.success("Saved", { description: `${quote.number} is up to date.` })
  }, [onSave, quote])

  const close = useCallback(() => {
    if (dirty) {
      setConfirmDiscard(true)
      return
    }
    onClose()
  }, [dirty, onClose])

  const saveAndClose = useCallback(() => {
    onSave(quote)
    setDirty(false)
    onClose()
  }, [onClose, onSave, quote])

  const downloadPdf = useCallback(async () => {
    const element = sheetRef.current
    if (!element) return
    setExporting(true)
    try {
      const name = `${slugify(quote.number, "document")}-${slugify(quote.client.name, "client")}.pdf`
      const pages = await exportElementToPDF(element, name)
      toast.success("PDF ready", { description: `${name} · ${pages} page${pages === 1 ? "" : "s"}` })
    } catch (error) {
      toast.error("Could not generate the PDF", {
        description: error instanceof Error ? error.message : "Try printing to PDF instead.",
      })
    } finally {
      setExporting(false)
    }
  }, [quote.client.name, quote.number])

  useHotkeys({
    "mod+s": () => save(),
    "mod+p": () => window.print(),
  })

  const kind = DOCUMENT_KINDS[quote.kind]

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* Toolbar ---------------------------------------------------- */}
      <div className="sticky top-16 z-30 border-b border-border bg-background/85 backdrop-blur-xl no-print">
        <div className="container flex h-14 items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-2 shrink-0" onClick={close}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Documents</span>
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {quote.client.name || `New ${kind.label.toLowerCase()}`}
              </p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">{quote.number}</p>
            </div>
            <StatusBadge quote={quote} compact />
            {dirty && (
              <Badge tone="warning" className="hidden sm:inline-flex">
                Unsaved
              </Badge>
            )}
            {issues.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="hidden sm:inline-flex">
                    <Badge tone="danger" className="cursor-help">
                      <AlertTriangle className="h-3 w-3" />
                      {issues.length}
                    </Badge>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <ul className="list-disc space-y-0.5 pl-3.5">
                    {issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <p className="hidden text-right text-sm font-semibold tabular lg:block">
              {formatCurrency(totals.total, settings.currency)}
            </p>
            <Separator orientation="vertical" className="mx-1 hidden h-6 lg:block" />

            <ToolbarButton icon={Printer} label="Print" onClick={() => window.print()} />
            <ToolbarButton
              icon={exporting ? Loader2 : Download}
              label="PDF"
              onClick={downloadPdf}
              disabled={exporting}
              spinning={exporting}
            />
            <Button size="sm" className="gap-2" onClick={save} disabled={!dirty}>
              {dirty ? <Save className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              {dirty ? "Save" : "Saved"}
            </Button>
          </div>
        </div>
      </div>

      {/* Panes ------------------------------------------------------- */}
      <div className="container flex-1 py-6">
        {/* Desktop: edit on the left, live sheet on the right. */}
        <div className="hidden gap-8 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,620px)]">
          <div className="space-y-8 pb-16">
            <DetailsForm
              quote={quote}
              defaultValidityDays={settings.defaultValidityDays}
              onChange={patch}
              onClientChange={patchClient}
            />
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Line items</h3>
                <p className="text-xs text-muted-foreground">
                  {totals.itemCount} {totals.itemCount === 1 ? "line" : "lines"} · VAT applies only where ticked.
                </p>
              </div>
              <LineItemsEditor items={quote.items} onChange={(items) => patch({ items })} />
            </section>
            <TotalsPanel quote={quote} currency={settings.currency} onChange={patch} />
          </div>

          <div className="relative">
            <div className="sticky top-36 max-h-[calc(100vh-10rem)] overflow-y-auto scrollbar-slim pb-6 pr-1">
              <PreviewPane quote={quote} settings={settings} />
            </div>
          </div>
        </div>

        {/* Narrow screens: the same two panes, as tabs. */}
        <Tabs defaultValue="edit" className="xl:hidden">
          <TabsList className="mb-5 w-full">
            <TabsTrigger value="edit" className="flex-1">
              <PenLine className="h-4 w-4" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex-1">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-8 pb-16">
            <DetailsForm
              quote={quote}
              defaultValidityDays={settings.defaultValidityDays}
              onChange={patch}
              onClientChange={patchClient}
            />
            <section className="space-y-4">
              <h3 className="text-sm font-semibold">Line items</h3>
              <LineItemsEditor items={quote.items} onChange={(items) => patch({ items })} />
            </section>
            <TotalsPanel quote={quote} currency={settings.currency} onChange={patch} />
          </TabsContent>

          <TabsContent value="preview" className="pb-16">
            <PreviewPane quote={quote} settings={settings} />
          </TabsContent>
        </Tabs>
      </div>

      <CaptureSheet ref={sheetRef} quote={quote} settings={settings} />

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Save before leaving?"
        description="This document has changes that have not been saved yet."
        confirmLabel="Save and close"
        cancelLabel="Keep editing"
        onConfirm={saveAndClose}
      />
    </div>
  )
}

interface ToolbarButtonProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
  spinning?: boolean
}

function ToolbarButton({ icon: Icon, label, onClick, disabled, spinning }: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" onClick={onClick} disabled={disabled}>
          <Icon className={spinning ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
