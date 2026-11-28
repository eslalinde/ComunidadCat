"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

/** Self-contained: works with or without an app-level TooltipProvider. */
function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider delayDuration={300}>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-foreground text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

type HintProps = {
  /** Visible tooltip text (Spanish UI copy). */
  label: string
  /** The trigger: usually an icon-only button. */
  children: React.ReactElement
  side?: React.ComponentProps<typeof TooltipPrimitive.Content>["side"]
  /**
   * true (default): the label also becomes the child's accessible name, for
   * icon-only controls (a child's own aria-label still wins).
   * false: the control keeps its visible text as name; the tooltip only adds
   * a description (Radix links it via aria-describedby while open).
   */
  asLabel?: boolean
}

/**
 * Explains a control on hover and keyboard focus, replacing `title` (which
 * never shows on touch or focus and is read inconsistently by screen readers).
 * Non-interactive children (e.g. a Badge) need tabIndex={0} to be reachable;
 * a disabled button needs a focusable wrapper for the hint to open.
 */
function Hint({ label, children, side = "top", asLabel = true }: HintProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild aria-label={asLabel ? label : undefined}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} sideOffset={4}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, Hint }
