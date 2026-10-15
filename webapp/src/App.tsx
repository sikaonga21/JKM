import { useCallback, useEffect, useRef, useState } from "react"
import { Toaster, toast } from "sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppHeader } from "@/components/layout/AppHeader"
import { TeamLogin } from "@/components/auth/TeamLogin"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { Dashboard } from "@/features/dashboard/Dashboard"
import { Editor } from "@/features/editor/Editor"
import { SettingsDialog } from "@/features/settings/SettingsDialog"
import { useStore } from "@/hooks/useStore"
import { useTheme } from "@/hooks/useTheme"
import { useHotkeys } from "@/hooks/useHotkeys"
import { calculateTotals } from "@/lib/calc"
import { buildBackup, downloadFile, parseBackup, toCSV } from "@/lib/storage"
import { formatDate, toISODate } from "@/lib/format"
import type { Quotation } from "@/types"

export default function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/auth")
      .then(async (response) => {
        const result = (await response.json()) as { authenticated?: boolean; error?: string }
        if (!response.ok) throw new Error(result.error ?? "Could not verify the team session.")
        if (!cancelled) setAuthenticated(result.authenticated === true)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setAuthError(error instanceof Error ? error.message : "Could not connect to the sign-in service.")
        }
      })
      .finally(() => {
        if (!cancelled) setCheckingSession(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (password: string) => {
    setAuthError(null)
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(result.error ?? "Sign in failed.")
      setAuthenticated(true)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not connect to the sign-in service.")
    }
  }, [])

  const signOut = useCallback(async () => {
    await fetch("/api/auth", { method: "DELETE" }).catch(() => undefined)
    setAuthenticated(false)
  }, [])

  if (checkingSession) {
    return <main className="app-canvas grid min-h-screen place-items-center text-sm text-muted-foreground">Checking secure session…</main>
  }
  if (!authenticated) return <TeamLogin error={authError} onSubmit={signIn} />
  return <Workspace onSignOut={signOut} />
}

function Workspace({ onSignOut }: { onSignOut: () => void }) {
  const store = useStore()
  const { theme, resolved, setTheme } = useTheme()

  const [editing, setEditing] = useState<Quotation | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Quotation | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const createNew = useCallback(() => setEditing(store.newQuotation()), [store])

  const open = useCallback(
    (id: string) => {
      const quote = store.quotations.find((q) => q.id === id)
      if (quote) setEditing(quote)
    },
    [store.quotations],
  )

  const duplicate = useCallback(
    (id: string) => {
      const copy = store.duplicate(id)
      if (copy) toast.success("Duplicated", { description: `Created ${copy.number}.` })
    },
    [store],
  )

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return
    store.deleteQuotation(pendingDelete.id)
    toast.success("Deleted", { description: `${pendingDelete.number} was removed.` })
    setPendingDelete(null)
  }, [pendingDelete, store])

  const exportBackup = useCallback(() => {
    const payload = buildBackup(store.quotations, store.settings)
    downloadFile(`jkm-backup-${toISODate(new Date())}.json`, JSON.stringify(payload, null, 2))
    toast.success("Backup downloaded", {
      description: `${store.quotations.length} document${store.quotations.length === 1 ? "" : "s"} exported.`,
    })
  }, [store.quotations, store.settings])

  const importBackup = useCallback(
    async (file: File | undefined) => {
      if (!file) return
      try {
        const { quotations, settings } = parseBackup(await file.text(), store.settings)
        const added = store.mergeIn(quotations)
        if (settings) store.setSettings(settings)
        toast.success("Backup imported", {
          description: `${added} new, ${quotations.length - added} updated.`,
        })
      } catch (error) {
        toast.error("Could not read that backup", {
          description: error instanceof Error ? error.message : "The file is not valid JSON.",
        })
      }
    },
    [store],
  )

  const exportCsv = useCallback(() => {
    const rows: (string | number)[][] = [
      ["Reference", "Type", "Status", "Client", "Company", "Location", "Issued", "Valid until", "Items", "Subtotal", "Discount", "VAT", "Total", "Currency"],
      ...store.quotations.map((quote) => {
        const totals = calculateTotals(quote)
        return [
          quote.number,
          quote.kind,
          quote.status,
          quote.client.name,
          quote.client.company,
          quote.client.location,
          formatDate(quote.date),
          quote.kind === "invoice" ? "" : formatDate(quote.validUntil),
          totals.itemCount,
          totals.subtotal,
          totals.discount,
          totals.tax,
          totals.total,
          store.settings.currency,
        ]
      }),
    ]
    downloadFile(`jkm-documents-${toISODate(new Date())}.csv`, toCSV(rows), "text/csv;charset=utf-8")
    toast.success("CSV exported")
  }, [store.quotations, store.settings.currency])

  useHotkeys({
    "mod+n": () => {
      if (!editing) createNew()
    },
  })

  return (
    <TooltipProvider delayDuration={300}>
      <div className="app-canvas min-h-screen">
        {store.loading && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-background/90 text-sm text-muted-foreground">
            Loading shared company data…
          </div>
        )}
        <AppHeader
          companyName={store.settings.company.name}
          logo={store.settings.company.logo}
          theme={theme}
          resolvedTheme={resolved}
          onThemeChange={setTheme}
          onOpenSettings={() => setSettingsOpen(true)}
          onExportBackup={exportBackup}
          onImportBackup={() => importRef.current?.click()}
          onExportCsv={exportCsv}
          onSignOut={onSignOut}
        />

        {store.syncError && (
          <div className="border-b border-warning/30 bg-warning/10 px-4 py-2 text-center text-xs text-warning no-print">
            Cloud sync is unavailable. Changes may only be saved in this browser; export a backup before closing the tab.
          </div>
        )}
        {store.storageError && (
          <div className="border-b border-warning/30 bg-warning/10 px-4 py-2 text-center text-xs text-warning no-print">
            This browser could not save its local backup. Export a backup before closing the tab.
          </div>
        )}

        {editing ? (
          <Editor
            key={editing.id}
            initial={editing}
            settings={store.settings}
            onSave={(quote) => store.saveQuotation(quote)}
            onClose={() => setEditing(null)}
          />
        ) : (
          <Dashboard
            quotations={store.quotations}
            currency={store.settings.currency}
            onCreateNew={createNew}
            onOpen={open}
            onDuplicate={duplicate}
            onDelete={setPendingDelete}
            onStatusChange={store.updateStatus}
          />
        )}

        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            void importBackup(event.target.files?.[0])
            event.target.value = ""
          }}
        />

        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          settings={store.settings}
          onSave={store.setSettings}
        />

        <ConfirmDialog
          open={pendingDelete !== null}
          onOpenChange={(open) => !open && setPendingDelete(null)}
          title="Delete this document?"
          description={`${pendingDelete?.number ?? ""} for ${pendingDelete?.client.name || "an unnamed client"} will be permanently removed from shared company records. This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={confirmDelete}
        />

        <Toaster
          theme={resolved}
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{ className: "no-print" }}
        />
      </div>
    </TooltipProvider>
  )
}
