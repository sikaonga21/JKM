# JKM Distributors — Quotations

A quotation, proforma and invoice builder. Documents are written on an A4 sheet
you can see while you type, and exported as a multi-page PDF or printed
directly. Signed-in team members share company data stored in Neon Postgres.

```bash
npm install
npm run dev      # http://localhost:5173
```

| Script             | What it does                                 |
| ------------------ | -------------------------------------------- |
| `npm run dev`      | Vite dev server with hot reload              |
| `npm run build`    | Typecheck API and app, then build in `dist`  |
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

The shared quotation records and company settings live in Neon Postgres behind
Vercel API routes. On the first sign-in, if the database is empty, the current
browser's local data is copied into the database. Later sign-ins load the shared
database as the source of truth. `localStorage` remains as a local backup and
supports the original `jkm_quotations` format through `normalizeQuotation`.

All staff use one shared team password. Use a long random password and keep
`SESSION_SECRET` private. Team members share records; individual accounts and
per-person audit history are not provided. Use *Data → Export backup* regularly;
the import merges by document id. A warning appears if cloud sync or the browser
backup is unavailable.

## Vercel setup

Set the Vercel project's **Root Directory** to `webapp`, then add these
environment variables for Production (and Preview if needed):

- `DATABASE_URL`: the Neon Postgres connection string. If the integration uses
  another variable name, add `DATABASE_URL` with the same connection string.
- `APP_PASSWORD`: a long, random password shared only with staff.
- `SESSION_SECRET`: at least 32 random characters, used to sign seven-day
  HTTP-only session cookies.

Redeploy after adding the variables. The API creates its two tables on first
use. Never add the database URL or team password to a `VITE_` variable or commit
real secrets. The example variable names are in `.env.example`.

For local end-to-end development, link the project with Vercel CLI, place local
values in `.env.local`, and run `npx vercel dev` so the `/api` functions are
available alongside Vite.

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
