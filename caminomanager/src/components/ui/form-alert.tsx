import * as React from "react"
import { CircleAlert, CircleCheck, Info } from "lucide-react"

import { cn } from "@/lib/utils"

type FormAlertTone = "error" | "success" | "info"

const toneStyles: Record<FormAlertTone, string> = {
  error:
    "border-field-error/35 bg-field-error-soft text-field-error-foreground [&_[data-slot=form-alert-icon]]:text-field-error",
  success:
    "border-field-success/30 bg-field-success/8 text-foreground [&_[data-slot=form-alert-icon]]:text-field-success",
  info: "border-border bg-muted/60 text-foreground [&_[data-slot=form-alert-icon]]:text-muted-foreground",
}

const toneIcons: Record<FormAlertTone, typeof Info> = {
  error: CircleAlert,
  success: CircleCheck,
  info: Info,
}

type FormAlertProps = React.ComponentProps<"div"> & {
  tone?: FormAlertTone
  title?: React.ReactNode
}

/** Form-level feedback (submit/server errors, confirmations). */
function FormAlert({ tone = "error", title, className, children, ...props }: FormAlertProps) {
  const Icon = toneIcons[tone]

  return (
    <div
      data-slot="form-alert"
      data-tone={tone}
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm leading-snug animate-in fade-in-0 slide-in-from-top-1 duration-200",
        toneStyles[tone],
        className
      )}
      {...props}
    >
      <Icon data-slot="form-alert-icon" aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="grid gap-0.5">
        {title && <p className="font-medium">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  )
}

export { FormAlert }
export type { FormAlertProps, FormAlertTone }
