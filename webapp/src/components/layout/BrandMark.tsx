import { cn } from "@/lib/utils"

interface BrandMarkProps {
  /** Company logo data URL. Falls back to a generated monogram. */
  logo?: string
  name: string
  className?: string
  /** Monogram colours are inverted on the printed sheet. */
  variant?: "app" | "paper"
}

function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "JK"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export function BrandMark({ logo, name, className, variant = "app" }: BrandMarkProps) {
  if (logo) {
    return <img src={logo} alt={`${name} logo`} className={cn("h-10 w-auto object-contain", className)} />
  }

  return (
    <div
      className={cn(
        "grid h-10 w-10 shrink-0 place-content-center rounded-xl text-sm font-extrabold tracking-tight",
        variant === "app"
          ? "bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-soft"
          : "bg-slate-900 text-white",
        className,
      )}
      aria-hidden
    >
      {monogram(name)}
    </div>
  )
}
