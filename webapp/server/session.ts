import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

const COOKIE_NAME = "jkm_session"
const SESSION_SECONDS = 60 * 60 * 24 * 7

function sign(value: string): string {
  return createHmac("sha256", process.env.SESSION_SECRET ?? "").update(value).digest("base64url")
}

function equalStrings(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

export function sessionIsConfigured(): boolean {
  return Boolean(process.env.APP_PASSWORD && (process.env.SESSION_SECRET?.length ?? 0) >= 32)
}

export function passwordIsValid(password: string): boolean {
  if (!sessionIsConfigured()) return false
  return equalStrings(sign(password), sign(process.env.APP_PASSWORD ?? ""))
}

export function requestHasSession(request: Request): boolean {
  if (!sessionIsConfigured()) return false
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1)
  if (!cookie) return false

  const [expiresAt, nonce, signature] = cookie.split(".")
  if (!expiresAt || !nonce || !signature || Number(expiresAt) <= Date.now()) return false
  return equalStrings(signature, sign(`${expiresAt}.${nonce}`))
}

export function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin")
  if (!origin) return false
  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

export function createSessionCookie(): string {
  const expiresAt = String(Date.now() + SESSION_SECONDS * 1000)
  const payload = `${expiresAt}.${randomBytes(24).toString("base64url")}`
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
  return `${COOKIE_NAME}=${payload}.${sign(payload)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure}`
}

export function clearSessionCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`
}