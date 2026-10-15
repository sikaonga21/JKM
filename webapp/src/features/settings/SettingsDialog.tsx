import { useRef, useState } from "react"
import { Building2, ImageUp, Landmark, RotateCcw, SlidersHorizontal, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { Settings } from "@/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Field, TextareaField } from "@/components/common/Field"
import { BrandMark } from "@/components/layout/BrandMark"
import { DEFAULT_SETTINGS } from "@/lib/constants"

const MAX_LOGO_BYTES = 400_000

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: Settings
  onSave: (settings: Settings) => void
}

export function SettingsDialog({ open, onOpenChange, settings, onSave }: SettingsDialogProps) {
  const [draft, setDraft] = useState<Settings>(settings)
  const [wasOpen, setWasOpen] = useState(open)
  const fileRef = useRef<HTMLInputElement>(null)

  // Reopening after a cancel should not show the abandoned edits. Adjusting
  // state during render beats an effect here — no second render pass.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setDraft(settings)
  }

  const setCompany = (patch: Partial<Settings["company"]>) =>
    setDraft((prev) => ({ ...prev, company: { ...prev.company, ...patch } }))

  const setBank = (patch: Partial<Settings["company"]["bank"]>) =>
    setDraft((prev) => ({ ...prev, company: { ...prev.company, bank: { ...prev.company.bank, ...patch } } }))

  const pickLogo = (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Logo is too large", { description: "Use an image under 400 KB — it is stored in this browser." })
      return
    }
    const reader = new FileReader()
    reader.onload = () => setCompany({ logo: String(reader.result) })
    reader.onerror = () => toast.error("Could not read that image")
    reader.readAsDataURL(file)
  }

  const save = () => {
    onSave(draft)
    onOpenChange(false)
    toast.success("Settings saved")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Company details, banking and document defaults. These appear on every document you issue.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="company" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="self-start">
            <TabsTrigger value="company">
              <Building2 className="h-4 w-4" />
              Company
            </TabsTrigger>
            <TabsTrigger value="bank">
              <Landmark className="h-4 w-4" />
              Banking
            </TabsTrigger>
            <TabsTrigger value="defaults">
              <SlidersHorizontal className="h-4 w-4" />
              Defaults
            </TabsTrigger>
          </TabsList>

          <div className="scrollbar-slim -mx-1 mt-4 max-h-[55vh] overflow-y-auto px-1">
            <TabsContent value="company" className="space-y-4">
              <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-4">
                <BrandMark logo={draft.company.logo} name={draft.company.name} className="h-14 w-14" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Logo</p>
                  <p className="text-xs text-muted-foreground">PNG or SVG, under 400 KB. Optional.</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(event) => pickLogo(event.target.files?.[0])}
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => fileRef.current?.click()}>
                    <ImageUp className="h-4 w-4" />
                    Upload
                  </Button>
                  {draft.company.logo && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove logo"
                      onClick={() => setCompany({ logo: "" })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Company name"
                  value={draft.company.name}
                  onChange={(event) => setCompany({ name: event.target.value })}
                  containerClassName="sm:col-span-2"
                />
                <Field
                  label="Tagline"
                  value={draft.company.tagline}
                  onChange={(event) => setCompany({ tagline: event.target.value })}
                  containerClassName="sm:col-span-2"
                />
                <Field
                  label="Address"
                  value={draft.company.address}
                  onChange={(event) => setCompany({ address: event.target.value })}
                  containerClassName="sm:col-span-2"
                />
                <Field
                  label="Phone"
                  value={draft.company.phone}
                  onChange={(event) => setCompany({ phone: event.target.value })}
                />
                <Field
                  label="Email"
                  type="email"
                  value={draft.company.email}
                  onChange={(event) => setCompany({ email: event.target.value })}
                />
                <Field
                  label="Website"
                  value={draft.company.website}
                  onChange={(event) => setCompany({ website: event.target.value })}
                />
                <Field
                  label="TPIN"
                  value={draft.company.tpin}
                  onChange={(event) => setCompany({ tpin: event.target.value })}
                  hint="Shown under your address on every document."
                />
              </div>
            </TabsContent>

            <TabsContent value="bank" className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Bank"
                value={draft.company.bank.bankName}
                onChange={(event) => setBank({ bankName: event.target.value })}
                containerClassName="sm:col-span-2"
              />
              <Field
                label="Account name"
                value={draft.company.bank.accountName}
                onChange={(event) => setBank({ accountName: event.target.value })}
              />
              <Field
                label="Account number"
                value={draft.company.bank.accountNumber}
                onChange={(event) => setBank({ accountNumber: event.target.value })}
                className="tabular"
              />
              <Field
                label="Branch"
                value={draft.company.bank.branch}
                onChange={(event) => setBank({ branch: event.target.value })}
              />
              <Field
                label="Sort code"
                value={draft.company.bank.sortCode}
                onChange={(event) => setBank({ sortCode: event.target.value })}
                className="tabular"
              />
              <Field
                label="Swift code"
                value={draft.company.bank.swiftCode}
                onChange={(event) => setBank({ swiftCode: event.target.value })}
                className="tabular"
              />
              <Field
                label="Bank code"
                value={draft.company.bank.bankCode}
                onChange={(event) => setBank({ bankCode: event.target.value })}
                className="tabular"
              />
            </TabsContent>

            <TabsContent value="defaults" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="VAT rate (%)"
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={draft.defaultTaxRate}
                  onChange={(event) => setDraft({ ...draft, defaultTaxRate: Number(event.target.value) || 0 })}
                  className="tabular"
                  hint="Applied to new documents."
                />
                <Field
                  label="Currency code"
                  value={draft.currency}
                  onChange={(event) => setDraft({ ...draft, currency: event.target.value.toUpperCase().slice(0, 3) })}
                  hint="ISO code, e.g. ZMW or USD."
                />
                <Field
                  label="Validity (days)"
                  type="number"
                  min={1}
                  max={365}
                  value={draft.defaultValidityDays}
                  onChange={(event) =>
                    setDraft({ ...draft, defaultValidityDays: Math.max(1, Number(event.target.value) || 1) })
                  }
                  className="tabular"
                />
                <Field
                  label="Reference prefix"
                  value={draft.numberPrefix}
                  onChange={(event) => setDraft({ ...draft, numberPrefix: event.target.value.toUpperCase() })}
                  hint={`Next: ${draft.numberPrefix}-Q-${new Date().getFullYear()}-${String(draft.nextNumber).padStart(4, "0")}`}
                />
                <Field
                  label="Next number"
                  type="number"
                  min={1}
                  value={draft.nextNumber}
                  onChange={(event) => setDraft({ ...draft, nextNumber: Math.max(1, Number(event.target.value) || 1) })}
                  className="tabular"
                  containerClassName="sm:col-span-2"
                />
                <Field
                  label="Default payment terms"
                  value={draft.defaultTerms}
                  onChange={(event) => setDraft({ ...draft, defaultTerms: event.target.value })}
                  containerClassName="sm:col-span-2"
                />
              </div>
              <TextareaField
                label="Default terms & conditions"
                value={draft.defaultTermsAndConditions}
                onChange={(event) => setDraft({ ...draft, defaultTermsAndConditions: event.target.value })}
                rows={4}
              />
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="border-t border-border pt-4 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground"
            onClick={() => setDraft({ ...DEFAULT_SETTINGS, nextNumber: draft.nextNumber })}
          >
            <RotateCcw className="h-4 w-4" />
            Reset to defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save settings</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
