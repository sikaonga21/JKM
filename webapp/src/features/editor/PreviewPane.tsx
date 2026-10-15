import { useEffect, useRef, useState } from "react"
import type { Quotation, Settings } from "@/types"
import { cn } from "@/lib/utils"
import { DocumentPreview } from "./DocumentPreview"

/** Width of an A4 sheet at the browser's nominal 96dpi. */
const A4_WIDTH_PX = 794
const A4_HEIGHT_PX = 1123

interface PreviewPaneProps {
  quote: Quotation
  settings: Settings
  className?: string
}

/**
 * Shows the sheet at true A4 proportions, scaled down to whatever width the
 * column has. Exports do not read this element — they use the off-screen
 * CaptureSheet, which is always full size.
 */
export function PreviewPane({ quote, settings, className }: PreviewPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [sheetHeight, setSheetHeight] = useState(A4_HEIGHT_PX)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const measure = () => {
      const available = container.clientWidth
      setScale(Math.min(1, available / A4_WIDTH_PX))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // A long quotation runs past one page — reserve the real height so the
  // scroll container does not clip it.
  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet) return
    const observer = new ResizeObserver(() => setSheetHeight(sheet.offsetHeight))
    observer.observe(sheet)
    setSheetHeight(sheet.offsetHeight)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className={cn("w-full", className)}>
      <div
        className="preview-scaler origin-top"
        style={{ transform: `scale(${scale})`, height: sheetHeight * scale }}
      >
        <div ref={sheetRef} className="w-[794px] rounded-sm shadow-paper ring-1 ring-black/5">
          <DocumentPreview quote={quote} settings={settings} />
        </div>
      </div>
    </div>
  )
}
