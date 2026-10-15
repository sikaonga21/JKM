import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { BrandMark } from "@/components/layout/BrandMark"

interface TeamLoginProps {
  error: string | null
  onSubmit: (password: string) => Promise<void>
}

export function TeamLogin({ error, onSubmit }: TeamLoginProps) {
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    await onSubmit(password)
    setSubmitting(false)
  }

  return (
    <main className="app-canvas grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-sm rounded-lg border border-border bg-surface p-7 shadow-lg">
        <BrandMark logo="" name="JKM Distributors" />
        <p className="mt-7 text-xs font-semibold uppercase text-muted-foreground">Team workspace</p>
        <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter your team password to access shared quotations.</p>
        <form className="mt-6 space-y-4" onSubmit={(event) => void submit(event)}>
          <label className="block space-y-2 text-sm font-medium" htmlFor="team-password">
            Team password
            <input
              id="team-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </section>
    </main>
  )
}