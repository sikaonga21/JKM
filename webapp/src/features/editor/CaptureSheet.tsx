import { forwardRef } from "react"
import { createPortal } from "react-dom"
import type { Quotation, Settings } from "@/types"
import { DocumentPreview } from "./DocumentPreview"

/**
 * A full-size copy of the document, parked off-screen on <body>.
 *
 * The on-screen preview is scaled to fit its column and may be hidden behind a
 * tab, so neither the PDF exporter nor the print stylesheet can rely on it.
 * This copy is always rendered at true A4, which keeps exports identical no
 * matter which pane the user is looking at.
 */
export const CaptureSheet = forwardRef<HTMLDivElement, { quote: Quotation; settings: Settings }>(
  function CaptureSheet({ quote, settings }, ref) {
    return createPortal(
      <div className="capture-host" aria-hidden>
        <DocumentPreview ref={ref} id="print-root" quote={quote} settings={settings} />
      </div>,
      document.body,
    )
  },
)
