"use client"

import * as React from "react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Radix RadioGroup: roving focus (arrow keys move between options, Tab leaves
 * the group), role="radiogroup"/"radio" semantics and a single tab stop.
 */
function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-2", className)}
      {...props}
    />
  )
}

/**
 * Option rendered as a selectable chip: the whole pill is the hit target
 * (36px tall), with a visible dot so state is not conveyed by color alone.
 */
function RadioGroupChip({
  className,
  children,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-chip"
      className={cn(
        "group/chip inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-[color,box-shadow,border-color] outline-none",
        "hover:bg-accent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 data-[state=checked]:text-foreground",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="flex size-4 shrink-0 items-center justify-center rounded-full border border-input group-data-[state=checked]/chip:border-primary"
      >
        <RadioGroupPrimitive.Indicator className="size-2 rounded-full bg-primary" />
      </span>
      {children}
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupChip }
