import { useCallback, useEffect, useState } from "react"
import type { Theme } from "@/types"
import { STORAGE_KEYS } from "@/lib/constants"

const THEMES: Theme[] = ["light", "dark", "system"]

function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.theme) as Theme | null
    return stored && THEMES.includes(stored) ? stored : "system"
  } catch {
    return "system"
  }
}

function prefersDark(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)
  const [resolved, setResolved] = useState<"light" | "dark">(() =>
    readStoredTheme() === "system" ? (prefersDark() ? "dark" : "light") : (readStoredTheme() as "light" | "dark"),
  )

  useEffect(() => {
    const apply = () => {
      const next = theme === "system" ? (prefersDark() ? "dark" : "light") : theme
      document.documentElement.classList.toggle("dark", next === "dark")
      document.documentElement.style.colorScheme = next
      setResolved(next)
    }
    apply()

    if (theme !== "system") return
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    try {
      window.localStorage.setItem(STORAGE_KEYS.theme, next)
    } catch {
      /* theme preference is a nicety — ignore storage failures */
    }
  }, [])

  const toggle = useCallback(() => {
    setTheme(resolved === "dark" ? "light" : "dark")
  }, [resolved, setTheme])

  return { theme, resolved, setTheme, toggle }
}
