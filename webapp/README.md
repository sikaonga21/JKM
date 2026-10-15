# JKM Distributors — Quotations

A quotation, proforma and invoice builder. Documents are written on an A4 sheet
you can see while you type, and exported as a multi-page PDF or printed
directly. Everything is stored in the browser — there is no server and no
account.

```bash
npm install
npm run dev      # http://localhost:5173
```

| Script             | What it does                                 |
| ------------------ | -------------------------------------------- |
| `npm run dev`      | Dev server with hot reload                   |
| `npm run build`    | Typecheck, then a production build in `dist` |
| `npm run preview`  | Serve the production build locally           |
| `npm test`         | Run the unit tests once                      |
| `npm run test:watch` | Re-run tests as files change               |
| `npm run lint`     | Oxlint                                       |

## What it does

- **Three document types** — quotation, proforma invoice, invoice. Switching
  type re-tags the reference (`JKM-Q-…` → `JKM-INV-…`) unless you have edited it
  by hand.
- **Automatic numbering** from a prefix and a running counter, both editable in
  Settings.
- **Status tracking** — draft, sent, accepted, declined, plus an *expired* state
  derived from the validity date. Invoices never expire.
- **Line items** with quantity, unit of measure, price and per-line VAT; rows
  can be reordered, duplicated and removed.
- **Discounts** as a cash amount or a percentage, applied before VAT so the
  taxable base shrinks with the discount.
- **A live A4 preview** beside the form on wide screens, and behind a tab on
  narrow ones.
- **Export** to multi-page PDF, to the printer, to a JSON backup, or to CSV for
  the whole document list.
- **Company profile** — logo, address, TPIN, banking details, default VAT rate,
  currency, validity period and standard terms.
- Dark mode, keyboard shortcuts (`Ctrl/⌘ N`, `Ctrl/⌘ S`, `Ctrl/⌘ P`, `/` to
  search) and search, filter and sort across saved documents.

## How it is laid out

```
src/
  lib/          Pure logic — pricing, formatting, storage, PDF. No React.
  hooks/        Persisted store, theme, keyboard shortcuts.
  components/
    ui/         Primitives (shadcn/Radix): button, dialog, table, …
    common/     Shared pieces: fields, badges, empty states, confirm dialog.
    layout/     App header, brand mark, theme toggle.
  features/
    dashboard/  Document list, filters, KPI tiles.
    editor/     The form, the live sheet, and the off-screen capture sheet.
    settings/   Company profile and defaults.
```

Two rules keep the rest honest:

- **`src/lib/calc.ts` is the only place money is calculated.** The dashboard,
  the editor and the printed sheet all call `calculateTotals`, so a document can
  never total differently in two places.
- **The exported sheet is never the one on screen.** `CaptureSheet` renders a
  full-size A4 copy into a portal on `<body>`, off-screen. The PDF exporter
  captures that, and the print stylesheet promotes it to the page — so exports
  don't depend on which pane is visible or how the preview is scaled.

## Storage

Documents live in `localStorage` under `jkm.quotations.v2`, settings under
`jkm.settings.v1`. Documents written by the first version of the app (the flat
`jkm_quotations` key) are read and migrated on load — see `normalizeQuotation`.

This means **the data is tied to one browser on one device.** Clearing site data
deletes it. Use *Data → Export backup* regularly; the import merges by document
id, so restoring a backup never duplicates what is already there. If the browser
refuses to save (private mode, full storage), a banner appears under the header.

## Tax

VAT defaults to 16%, the Zambian standard rate. The rate is stored *per
document*, so changing it in Settings affects new documents and leaves issued
ones as they were. VAT is charged only on lines ticked as taxable, on the
value remaining after any discount.

## Tests

`src/lib/*.test.ts` cover the parts that are expensive to get wrong: the
pricing rules, expiry, validation, amount-in-words, and the migration from the
old storage format.

```bash
npm test
```
