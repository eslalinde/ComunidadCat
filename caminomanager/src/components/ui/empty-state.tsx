import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description?: string
  className?: string
}

/** Standard placeholder shown when a card or list has no items. */
export function EmptyState({ icon: Icon, title, description, className }: EmptyStateProps) {
  return (
    <div className={cn("py-8 text-center text-muted-foreground", className)}>
      <Icon className="mx-auto mb-2 size-8 text-muted-foreground/40" aria-hidden="true" />
      <p className="text-sm">{title}</p>
      {description && <p className="mt-1 text-xs">{description}</p>}
    </div>
  )
}
