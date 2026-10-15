import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Quotation, Settings } from "@/types"
import { STORAGE_KEYS } from "@/lib/constants"
import {
  createQuotation,
  duplicateQuotation,
  loadQuotations,
  loadSettings,
  normalizeQuotation,
  normalizeSettings,
  writeJSON,
} from "@/lib/storage"

type CloudData = { settings: unknown; quotations: unknown }

async function sendCloudData(method: "PUT" | "DELETE", data: object): Promise<void> {
  const response = await fetch("/api/data", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error("Cloud data could not be saved")
}

/**
 * Owns company data, hydrates from the shared database, and keeps local backups.
 */
export function useStore() {
  const [settings, setSettingsState] = useState<Settings>(() => loadSettings())
  const [quotations, setQuotations] = useState<Quotation[]>(() => loadQuotations(loadSettings()))
  const [storageError, setStorageError] = useState(false)
  const [syncError, setSyncError] = useState(false)
  const [loading, setLoading] = useState(true)
  const firstRun = useRef(true)
  const localData = useRef({ settings, quotations })

  const saveCloud = useCallback(async (data: object) => {
    try {
      await sendCloudData("PUT", data)
      setSyncError(false)
    } catch {
      setSyncError(true)
    }
  }, [])

  const deleteCloud = useCallback(async (deleteIds: string[]) => {
    try {
      await sendCloudData("DELETE", { deleteIds })
      setSyncError(false)
    } catch {
      setSyncError(true)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      try {
        const response = await fetch("/api/data")
        if (!response.ok) throw new Error("Cloud data could not be loaded")
        const data = (await response.json()) as CloudData
        const remoteSettings = data.settings ? normalizeSettings(data.settings as Partial<Settings>) : null
        const remoteQuotations = Array.isArray(data.quotations)
          ? data.quotations
              .filter((quote): quote is Record<string, unknown> => typeof quote === "object" && quote !== null)
              .map((quote, index) => normalizeQuotation(quote, remoteSettings ?? localData.current.settings, index))
          : []

        if (remoteSettings || remoteQuotations.length > 0) {
          if (cancelled) return
          const nextSettings = remoteSettings ?? localData.current.settings
          const remoteIds = new Set(remoteQuotations.map((quote) => quote.id))
          const localOnlyQuotations = localData.current.quotations.filter((quote) => !remoteIds.has(quote.id))
          if (localOnlyQuotations.length > 0) {
            await sendCloudData("PUT", { quotations: localOnlyQuotations })
          }
          const nextQuotations = [...remoteQuotations, ...localOnlyQuotations].sort((left, right) => right.createdAt - left.createdAt)
          setSettingsState(nextSettings)
          setQuotations(nextQuotations)
          writeJSON(STORAGE_KEYS.settings, nextSettings)
          writeJSON(STORAGE_KEYS.quotations, nextQuotations)
        } else {
          await sendCloudData("PUT", localData.current)
        }
        if (!cancelled) setSyncError(false)
      } catch {
        if (!cancelled) setSyncError(true)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    // Skip the very first pass: nothing has changed yet, and the legacy key is
    // still the only copy until the user edits something.
    if (firstRun.current) {
      firstRun.current = false
      if (quotations.length > 0) writeJSON(STORAGE_KEYS.quotations, quotations)
      return
    }
    const ok = writeJSON(STORAGE_KEYS.quotations, quotations)
    setStorageError(!ok)
  }, [quotations])

  useEffect(() => {
    writeJSON(STORAGE_KEYS.settings, settings)
  }, [settings])

  const saveQuotation = useCallback((quote: Quotation) => {
    const stamped = { ...quote, updatedAt: Date.now() }
    const isNew = !quotations.some((item) => item.id === stamped.id)
    setQuotations((prev) => {
      const index = prev.findIndex((q) => q.id === stamped.id)
      if (index === -1) {
        return [stamped, ...prev]
      }
      const next = [...prev]
      next[index] = stamped
      return next
    })
    const nextSettings = isNew ? { ...settings, nextNumber: settings.nextNumber + 1 } : settings
    if (isNew) setSettingsState(nextSettings)
    void saveCloud({ quotations: [stamped], ...(isNew ? { settings: nextSettings } : {}) })
    return stamped
  }, [quotations, saveCloud, settings])

  const deleteQuotation = useCallback((id: string) => {
    setQuotations((prev) => prev.filter((q) => q.id !== id))
    void deleteCloud([id])
  }, [deleteCloud])

  const duplicate = useCallback(
    (id: string) => {
      const source = quotations.find((q) => q.id === id)
      if (!source) return null
      const copy = duplicateQuotation(source, settings)
      setQuotations((prev) => [copy, ...prev])
      const nextSettings = { ...settings, nextNumber: settings.nextNumber + 1 }
      setSettingsState(nextSettings)
      void saveCloud({ settings: nextSettings, quotations: [copy] })
      return copy
    },
    [quotations, saveCloud, settings],
  )

  const updateStatus = useCallback((id: string, status: Quotation["status"]) => {
    const existing = quotations.find((quote) => quote.id === id)
    if (!existing) return
    const updated = { ...existing, status, updatedAt: Date.now() }
    setQuotations((prev) => prev.map((quote) => (quote.id === id ? updated : quote)))
    void saveCloud({ quotations: [updated] })
  }, [quotations, saveCloud])

  const newQuotation = useCallback(() => createQuotation(settings), [settings])

  const setSettings = useCallback((next: Settings) => {
    setSettingsState(next)
    void saveCloud({ settings: next })
  }, [saveCloud])

  const replaceAll = useCallback((next: Quotation[], nextSettings?: Settings | null) => {
    const nextIds = new Set(next.map((quote) => quote.id))
    const deletedIds = quotations.filter((quote) => !nextIds.has(quote.id)).map((quote) => quote.id)
    setQuotations(next)
    if (deletedIds.length) void deleteCloud(deletedIds)
    const settingsToSave = nextSettings ?? settings
    if (nextSettings) setSettingsState(nextSettings)
    void saveCloud({ quotations: next, settings: settingsToSave })
  }, [deleteCloud, quotations, saveCloud, settings])

  const mergeIn = useCallback((incoming: Quotation[]) => {
    const byId = new Map(quotations.map((quote) => [quote.id, quote]))
    let added = 0
    for (const quote of incoming) {
      if (!byId.has(quote.id)) added++
      byId.set(quote.id, quote)
    }
    setQuotations([...byId.values()].sort((a, b) => b.createdAt - a.createdAt))
    void saveCloud({ quotations: incoming })
    return added
  }, [quotations, saveCloud])

  return useMemo(
    () => ({
      quotations,
      settings,
      storageError,
      syncError,
      loading,
      saveQuotation,
      deleteQuotation,
      duplicate,
      updateStatus,
      newQuotation,
      setSettings,
      replaceAll,
      mergeIn,
    }),
    [
      quotations,
      settings,
      storageError,
      syncError,
      loading,
      saveQuotation,
      deleteQuotation,
      duplicate,
      updateStatus,
      newQuotation,
      setSettings,
      replaceAll,
      mergeIn,
    ],
  )
}

export type Store = ReturnType<typeof useStore>
