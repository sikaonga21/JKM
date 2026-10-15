import {
  clearSessionCookie,
  createSessionCookie,
  hasSameOrigin,
  passwordIsValid,
  requestHasSession,
  sessionIsConfigured,
} from "../server/session.js"

export function GET(request: Request): Response {
  if (!sessionIsConfigured()) {
    return Response.json({ error: "Team login is not configured." }, { status: 503 })
  }
  return Response.json(
    { authenticated: requestHasSession(request) },
    { headers: { "Cache-Control": "private, no-store" } },
  )
}

export async function POST(request: Request): Promise<Response> {
  if (!sessionIsConfigured()) {
    return Response.json({ error: "Team login is not configured." }, { status: 503 })
  }
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Request origin is not allowed." }, { status: 403 })
  }

  let password: unknown
  try {
    password = (await request.json() as { password?: unknown }).password
  } catch {
    return Response.json({ error: "A password is required." }, { status: 400 })
  }

  if (typeof password !== "string" || !passwordIsValid(password)) {
    return Response.json({ error: "The password is incorrect." }, { status: 401 })
  }

  return Response.json(
    { authenticated: true },
    { headers: { "Set-Cookie": createSessionCookie(), "Cache-Control": "private, no-store" } },
  )
}

export function DELETE(request: Request): Response {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Request origin is not allowed." }, { status: 403 })
  }
  return new Response(null, { status: 204, headers: { "Set-Cookie": clearSessionCookie() } })
}