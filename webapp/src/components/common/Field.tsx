import * as React from "react"
import { useId } from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Input, Textarea } from "@/components/ui/input"

interface FieldProps extends Omit<React.ComponentProps<"input">, "ref"> {
  label: string
  hint?: string
  /** Rendered to the right of the label — units, a toggle, a counter. */
  adornment?: React.ReactNode
  containerClassName?: string
}

/** A labelled input. Keeps every form in the app vertically consistent. */
export function Field({ label, hint, adornment, containerClassName, className, ...props }: FieldProps) {
  const id = useId()
  return (
    <div className={cn("space-y-1.5", containerClassName)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="field-label">
          {label}
        </Label>
        {adornment}
      </div>
      <Input id={id} className={className} {...props} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

interface TextareaFieldProps extends Omit<React.ComponentProps<"textarea">, "ref"> {
  label: string
  hint?: string
  containerClassName?: string
}

export function TextareaField({ label, hint, containerClassName, className, ...props }: TextareaFieldProps) {
  const id = useId()
  return (
    <div className={cn("space-y-1.5", containerClassName)}>
      <Label htmlFor={id} className="field-label">
        {label}
      </Label>
      <Textarea id={id} className={className} {...props} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Wraps a non-input control (Select, Switch) with the same label treatment. */
export function FieldShell({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="field-label">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
