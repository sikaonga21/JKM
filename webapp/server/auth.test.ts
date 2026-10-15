import { afterEach, describe, expect, it, vi } from "vitest"
import { DELETE, GET, POST } from "../api/auth"

const appPassword = "a-long-team-password-for-tests"

afterEach(() => {
  vi.unstubAllEnvs()
})

function configureSession() {
  vi.stubEnv("APP_PASSWORD", appPassword)
  vi.stubEnv("SESSION_SECRET", "0123456789abcdef0123456789abcdef")
  vi.stubEnv("NODE_ENV", "test")
}

describe("team authentication API", () => {
  it("fails closed until the login secrets are configured", () => {
    vi.stubEnv("APP_PASSWORD", "")
    vi.stubEnv("SESSION_SECRET", "")

    expect(GET(new Request("https://jkm.example/api/auth")).status).toBe(503)
  })

  it("rejects an incorrect password and cross-origin login", async () => {
    configureSession()
    const wrongPassword = await POST(new Request("https://jkm.example/api/auth", {
      method: "POST",
      headers: { origin: "https://jkm.example", "content-type": "application/json" },
      body: JSON.stringify({ password: "wrong-password" }),
    }))
    const crossOrigin = await POST(new Request("https://jkm.example/api/auth", {
      method: "POST",
      headers: { origin: "https://attacker.example", "content-type": "application/json" },
      body: JSON.stringify({ password: appPassword }),
    }))

    expect(wrongPassword.status).toBe(401)
    expect(crossOrigin.status).toBe(403)
  })

  it("issues an HTTP-only session and accepts it until logout", async () => {
    configureSession()
    const login = await POST(new Request("https://jkm.example/api/auth", {
      method: "POST",
      headers: { origin: "https://jkm.example", "content-type": "application/json" },
      body: JSON.stringify({ password: appPassword }),
    }))
    const cookie = login.headers.get("set-cookie")

    expect(login.status).toBe(200)
    expect(cookie).toContain("HttpOnly")
    expect(cookie).toContain("SameSite=Strict")
    expect(GET(new Request("https://jkm.example/api/auth", { headers: { cookie: cookie ?? "" } })).status).toBe(200)
    expect(DELETE(new Request("https://jkm.example/api/auth", {
      method: "DELETE",
      headers: { origin: "https://jkm.example" },
    })).headers.get("set-cookie")).toContain("Max-Age=0")
  })
})