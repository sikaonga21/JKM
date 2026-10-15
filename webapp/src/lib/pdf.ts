import type jsPDFType from "jspdf"

const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297

/** jsPDF and html2canvas are ~400KB together, so they load only when someone
 *  actually exports. Keeps first paint fast. */
async function loadPdfDeps() {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ])
  return { html2canvas, jsPDF }
}

export interface PdfOptions {
  /** 2 is crisp on screen and in print without ballooning the file. */
  scale?: number
}

/**
 * Renders an element to a multi-page A4 PDF.
 *
 * The element is captured once at high resolution, then the resulting canvas
 * is sliced into page-height strips — a single `addImage` scaled to fit would
 * shrink long quotations into unreadable thumbnails.
 */
export async function exportElementToPDF(element: HTMLElement, filename: string, options: PdfOptions = {}) {
  const { html2canvas, jsPDF } = await loadPdfDeps()
  const scale = options.scale ?? 2

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  })

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

  // One canvas pixel is this many millimetres once the capture is fitted to A4.
  const pxPerMM = canvas.width / A4_WIDTH_MM
  const pageHeightPx = Math.floor(A4_HEIGHT_MM * pxPerMM)
  const pageCount = Math.max(1, Math.ceil(canvas.height / pageHeightPx))

  for (let page = 0; page < pageCount; page++) {
    const sliceTop = page * pageHeightPx
    const sliceHeight = Math.min(pageHeightPx, canvas.height - sliceTop)

    const slice = document.createElement("canvas")
    slice.width = canvas.width
    slice.height = sliceHeight
    const ctx = slice.getContext("2d")
    if (!ctx) continue
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, slice.width, slice.height)
    ctx.drawImage(canvas, 0, sliceTop, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight)

    if (page > 0) pdf.addPage()
    pdf.addImage(
      slice.toDataURL("image/jpeg", 0.95),
      "JPEG",
      0,
      0,
      A4_WIDTH_MM,
      sliceHeight / pxPerMM,
      undefined,
      "FAST",
    )
  }

  addPageNumbers(pdf, pageCount)
  pdf.save(filename)
  return pageCount
}

function addPageNumbers(pdf: jsPDFType, pageCount: number) {
  if (pageCount < 2) return
  for (let page = 1; page <= pageCount; page++) {
    pdf.setPage(page)
    pdf.setFontSize(8)
    pdf.setTextColor(120, 128, 140)
    pdf.text(`Page ${page} of ${pageCount}`, A4_WIDTH_MM - 14, A4_HEIGHT_MM - 7, { align: "right" })
  }
}
