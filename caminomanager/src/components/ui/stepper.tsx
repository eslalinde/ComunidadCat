"use client"

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

export interface StepperItem {
  id: string
  label: string
  description?: string
}

interface StepperProps {
  steps: StepperItem[]
  currentStep: number
  ariaLabel?: string
  className?: string
}

function Stepper({
  steps,
  currentStep,
  ariaLabel = "Progreso",
  className,
}: StepperProps) {
  const activeIndex = Math.min(Math.max(currentStep, 0), steps.length - 1)

  return (
    <nav aria-label={ariaLabel} className={cn("w-full", className)}>
      <ol
        className="grid w-full"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((step, index) => {
          const state =
            index < activeIndex
              ? "complete"
              : index === activeIndex
                ? "current"
                : "upcoming"

          return (
            <li
              key={step.id}
              data-state={state}
              aria-current={state === "current" ? "step" : undefined}
              className="relative flex min-w-0 flex-col items-center px-1 text-center"
            >
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-[calc(50%+1rem)] right-[calc(-50%+1rem)] top-4 h-0.5",
                    index < activeIndex ? "bg-emerald-500" : "bg-border"
                  )}
                />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 flex size-8 items-center justify-center rounded-full border-2 bg-background text-xs font-bold transition-colors",
                  state === "complete" &&
                    "border-emerald-600 bg-emerald-600 text-white",
                  state === "current" &&
                    "border-primary bg-primary text-primary-foreground",
                  state === "upcoming" &&
                    "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {state === "complete" ? <Check className="size-4" /> : index + 1}
              </span>
              <span className="mt-2 min-w-0 text-[0.7rem] font-medium leading-tight text-foreground sm:text-sm">
                {step.label}
              </span>
              {step.description && (
                <span className="mt-1 hidden text-xs text-muted-foreground md:block">
                  {step.description}
                </span>
              )}
              <span className="sr-only">
                {state === "complete"
                  ? "Completado"
                  : state === "current"
                    ? "Paso actual"
                    : "Pendiente"}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export { Stepper }
