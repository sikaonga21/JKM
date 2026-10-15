import { ensureDatabaseSchema, getDatabase } from "../server/database.js"
import { hasSameOrigin, requestHasSession } from "../server/session.js"

type RecordValue = Record<string, unknown>

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function unauthorized(): Response {
  return Response.json({ error: "Sign in to access company data." }, { status: 401 })
}

export async function GET(request: Request): Promise<Response> {
  if (!requestHasSession(request)) return unauthorized()

  try {
    const sql = getDatabase()
    await ensureDatabaseSchema(sql)
    const [settingsRow] = await sql`SELECT data FROM jkm_settings WHERE id = 1`
    const quotationRows = await sql`SELECT data FROM jkm_quotations ORDER BY created_at DESC`
    return Response.json(
      {
        settings: settingsRow?.data ?? null,
        quotations: quotationRows.map((row) => row.data),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    )
  } catch (error) {
    console.error("Could not load company data", error)
    return Response.json({ error: "Could not load company data." }, { status: 503 })
  }
}

export async function PUT(request: Request): Promise<Response> {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Request origin is not allowed." }, { status: 403 })
  }
  if (!requestHasSession(request)) return unauthorized()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }
  if (!isRecord(body)) return Response.json({ error: "Invalid data." }, { status: 400 })

  const hasSettings = "settings" in body
  const hasQuotations = "quotations" in body
  if (hasSettings && !isRecord(body.settings)) {
    return Response.json({ error: "Invalid settings." }, { status: 400 })
  }
  if (hasQuotations && !Array.isArray(body.quotations)) {
    return Response.json({ error: "Invalid quotations." }, { status: 400 })
  }
  if (!hasSettings && !hasQuotations) {
    return Response.json({ error: "No changes were provided." }, { status: 400 })
  }

  const quotations = (body.quotations ?? []) as unknown[]
  if (quotations.some((quote) => !isRecord(quote) || typeof quote.id !== "string" || !Number.isFinite(Number(quote.createdAt)))) {
    return Response.json({ error: "One or more quotations are invalid." }, { status: 400 })
  }

  try {
    const sql = getDatabase()
    await ensureDatabaseSchema(sql)
    if (hasSettings) {
      await sql`INSERT INTO jkm_settings (id, data, updated_at)
        VALUES (1, ${JSON.stringify(body.settings)}::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`
    }
    for (const quote of quotations as RecordValue[]) {
      await sql`INSERT INTO jkm_quotations (id, created_at, data)
        VALUES (${quote.id as string}, ${Number(quote.createdAt)}, ${JSON.stringify(quote)}::jsonb)
        ON CONFLICT (id) DO UPDATE SET created_at = EXCLUDED.created_at, data = EXCLUDED.data`
    }
    return Response.json({ saved: true })
  } catch (error) {
    console.error("Could not save company data", error)
    return Response.json({ error: "Could not save company data." }, { status: 503 })
  }
}

export async function DELETE(request: Request): Promise<Response> {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Request origin is not allowed." }, { status: 403 })
  }
  if (!requestHasSession(request)) return unauthorized()

  let deleteIds: unknown
  try {
    deleteIds = (await request.json() as { deleteIds?: unknown }).deleteIds
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }
  if (!Array.isArray(deleteIds) || deleteIds.some((id) => typeof id !== "string")) {
    return Response.json({ error: "Invalid quotation ids." }, { status: 400 })
  }

  try {
    const sql = getDatabase()
    await ensureDatabaseSchema(sql)
    for (const id of deleteIds as string[]) {
      await sql`DELETE FROM jkm_quotations WHERE id = ${id}`
    }
    return Response.json({ deleted: deleteIds.length })
  } catch (error) {
    console.error("Could not delete company data", error)
    return Response.json({ error: "Could not delete company data." }, { status: 503 })
  }
}