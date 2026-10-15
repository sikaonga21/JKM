/// <reference types="node" />
import { existsSync } from "node:fs"
import path from "node:path"
import type { IncomingMessage, ServerResponse } from "node:http"
import { loadEnv, type Plugin } from "vite"

/** The handler shape the /api functions export: Vercel's Web handlers. */
type WebHandler = (request: Request) => Response | Promise<Response>

const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"])

/* Rebuilt from the buffered body below, so the inbound values would lie. */
const SKIPPED_REQUEST_HEADERS = new Set(["content-length", "transfer-encoding"])

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status })
}

/** Maps a request path such as /api/auth to the api/auth.ts module. */
function resolveHandlerModule(root: string, pathname: string): string | null {
  const route = pathname.slice("/api/".length).replace(/\/+$/, "")
  // Word characters and dashes only - no dots, so no path traversal.
  if (!/^\w[\w-]*(\/\w[\w-]*)*$/.test(route)) return null
  for (const candidate of [`api/${route}.ts`, `api/${route}/index.ts`]) {
    if (existsSync(path.join(root, candidate))) return `/${candidate}`
  }
  return null
}

async function toWebRequest(req: IncomingMessage, origin: string): Promise<Request> {
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (SKIPPED_REQUEST_HEADERS.has(key)) continue
    if (Array.isArray(value)) for (const item of value) headers.append(key, item)
    else if (value !== undefined) headers.set(key, value)
  }

  const method = req.method ?? "GET"
  let body: Buffer | undefined
  if (!METHODS_WITHOUT_BODY.has(method)) {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    body = Buffer.concat(chunks)
  }

  return new Request(new URL(req.url ?? "/", origin), {
    method,
    headers,
    body: body?.length ? body : undefined,
  })
}

async function sendWebResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    if (key !== "set-cookie") res.setHeader(key, value)
  })
  // Sign in and sign out send Set-Cookie, which must not be folded into one line.
  const cookies = response.headers.getSetCookie()
  if (cookies.length > 0) res.setHeader("set-cookie", cookies)

  if (!response.body || response.status === 204 || response.status === 304) {
    res.end()
    return
  }
  res.end(Buffer.from(await response.arrayBuffer()))
}

/**
 * Runs the /api Web handlers on the Vite dev server.
 *
 * `npm run dev` has no function runtime of its own, so Vite resolved /api/auth
 * to api/auth.ts and replied with the compiled module - which is why the app
 * failed with `Unexpected token 'i', "import { c"... is not valid JSON`.
 * This mounts the same handlers Vercel runs in production instead.
 */
export function devApi(): Plugin {
  return {
    name: "jkm:dev-api",
    apply: "serve",
    configResolved(config) {
      // Vercel injects DATABASE_URL, APP_PASSWORD and SESSION_SECRET into
      // process.env. Mirror .env files into it so dev reads the same names;
      // loadEnv leaves any value already in the shell environment alone.
      Object.assign(process.env, loadEnv(config.mode, config.envDir, ""))
    },
    configureServer(server) {
      // Registered here, not in a returned function, so it runs before Vite's
      // transform middleware claims /api/* as a module request.
      server.middlewares.use(async (req, res, next) => {
        const origin = `http://${req.headers.host ?? "localhost"}`
        const url = new URL(req.url ?? "/", origin)
        const method = req.method ?? "GET"
        if (!url.pathname.startsWith("/api/")) {
          next()
          return
        }

        const moduleUrl = resolveHandlerModule(server.config.root, url.pathname)
        if (!moduleUrl) {
          await sendWebResponse(res, errorResponse(`No API route for ${url.pathname}`, 404))
          return
        }

        try {
          const handlers = await server.ssrLoadModule(moduleUrl)
          const handler = (handlers[method] ?? handlers.default) as WebHandler | undefined
          if (!handler) {
            await sendWebResponse(res, errorResponse(`${method} is not allowed here.`, 405))
            return
          }
          await sendWebResponse(res, await handler(await toWebRequest(req, origin)))
        } catch (error) {
          if (error instanceof Error) server.ssrFixStacktrace(error)
          server.config.logger.error(`[dev-api] ${method} ${url.pathname} failed`, {
            error: error instanceof Error ? error : undefined,
            timestamp: true,
          })
          // JSON, not Vite's HTML error page, so the client can still parse it.
          await sendWebResponse(res, errorResponse("The API handler failed. See the dev server terminal.", 500))
        }
      })
    },
  }
}
