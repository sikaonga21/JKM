import { useEffect, useRef } from "react"

type Handler = (event: KeyboardEvent) => void

/**
 * Binds Ctrl/Cmd shortcuts. Keys are written as "mod+s" or "mod+shift+n".
 * Shortcuts that would fire while typing are suppressed unless the binding
 * uses a modifier, so "/" can focus search without hijacking the keyboard.
 */
export function useHotkeys(bindings: Record<string, Handler>) {
  // Kept in a ref so re-registering the listener is not needed when a
  // handler closes over new state.
  const ref = useRef(bindings)
  useEffect(() => {
    ref.current = bindings
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)

      const mod = event.ctrlKey || event.metaKey
      const combo = [mod && "mod", event.shiftKey && "shift", event.altKey && "alt", event.key.toLowerCase()]
        .filter(Boolean)
        .join("+")

      const handler = ref.current[combo]
      if (!handler) return
      if (typing && !mod) return

      event.preventDefault()
      handler(event)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])
}
