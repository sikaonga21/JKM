import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Quotation, Settings } from "@/types"
import { STORAGE_KEYS } from "@/lib/constants"
import {
  createQuotation,
  duplicateQuotation,
  loadQuotations,
  loadSettings,
  writeJSON,
} from "@/lib/storage"

/**
 * Owns every persisted document and the company settings.
 *
 * Load happens once, synchronously, in `useState` initialisers — an effect-based
 * load races the save effect and can write an empty list over real data.
 */
export function useStore() {
  const [settings, setSettingsState] = useState<Settings>(() => loadSettings())
  const [quotations, setQuotations] = useState<Quotation[]>(() => loadQuotations(loadSettings()))
  const [storageError, setStorageError] = useState(false)
  const firstRun = useRef(true)

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
    let isNew = false
    setQuotations((prev) => {
      const index = prev.findIndex((q) => q.id === stamped.id)
      if (index === -1) {
        isNew = true
        return [stamped, ...prev]
      }
      const next = [...prev]
      next[index] = stamped
      return next
    })
    // A new document consumes the next number in the sequence.
    setSettingsState((prev) => (isNew ? { ...prev, nextNumber: prev.nextNumber + 1 } : prev))
    return stamped
  }, [])

  const deleteQuotation = useCallback((id: string) => {
    setQuotations((prev) => prev.filter((q) => q.id !== id))
  }, [])

  const duplicate = useCallback(
    (id: string) => {
      const source = quotations.find((q) => q.id === id)
      if (!source) return null
      const copy = duplicateQuotation(source, settings)
      setQuotations((prev) => [copy, ...prev])
      setSettingsState((prev) => ({ ...prev, nextNumber: prev.nextNumber + 1 }))
      return copy
    },
    [quotations, settings],
  )

  const updateStatus = useCallback((id: string, status: Quotation["status"]) => {
    setQuotations((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status, updatedAt: Date.now() } : q)),
    )
  }, [])

  const newQuotation = useCallback(() => createQuotation(settings), [settings])

  const setSettings = useCallback((next: Settings) => setSettingsState(next), [])

  const replaceAll = useCallback((next: Quotation[], nextSettings?: Settings | null) => {
    setQuotations(next)
    if (nextSettings) setSettingsState(nextSettings)
  }, [])

  const mergeIn = useCallback((incoming: Quotation[]) => {
    let added = 0
    setQuotations((prev) => {
      const byId = new Map(prev.map((q) => [q.id, q]))
      for (const quote of incoming) {
        if (!byId.has(quote.id)) added++
        byId.set(quote.id, quote)
      }
      return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt)
    })
    return added
  }, [])

  return useMemo(
    () => ({
      quotations,
      settings,
      storageError,
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
