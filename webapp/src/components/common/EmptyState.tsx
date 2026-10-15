import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-16 text-center", className)}>
      <div className="relative mb-5">
        <div className="absolute inset-0 -z-10 blur-2xl" aria-hidden>
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/20" />
        </div>
        <div className="grid h-16 w-16 place-content-center rounded-2xl border border-border bg-surface shadow-soft">
          <Icon className="h-7 w-7 text-primary" strokeWidth={1.6} />
        </div>
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
