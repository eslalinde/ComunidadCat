import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

type SpinnerProps = {
  className?: string
  /** Accessible label announced by screen readers. */
  label?: string
}

/** Standard loading indicator for page and section loading states. */
export function Spinner({ className, label = "Cargando" }: SpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      className={cn("block size-8 shrink-0 animate-spin text-primary", className)}
    />
  )
}
