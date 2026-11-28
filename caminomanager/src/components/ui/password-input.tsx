"use client"

import * as React from "react"
import { unstable_PasswordToggleField as PasswordToggleField } from "radix-ui"
import { ArrowBigUpDash, Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  /** "current-password" for sign-in, "new-password" when creating one. */
  autoComplete?: "current-password" | "new-password"
  /** Show a hint when Caps Lock is on while typing. Defaults to true. */
  capsLockHint?: boolean
}

/**
 * Password field with a show/hide toggle, built on the Radix
 * PasswordToggleField preview primitive. Visibility resets automatically
 * when the form is submitted or reset, and focus stays in the input.
 */
function PasswordInput({
  className,
  id: idProp,
  autoComplete = "current-password",
  capsLockHint = true,
  onKeyUp,
  onKeyDown,
  onBlur,
  disabled,
  ...props
}: PasswordInputProps) {
  const generatedId = React.useId()
  const id = idProp ?? generatedId
  const [visible, setVisible] = React.useState(false)
  const [capsLock, setCapsLock] = React.useState(false)

  const syncCapsLock = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (capsLockHint && typeof event.getModifierState === "function") {
      setCapsLock(event.getModifierState("CapsLock"))
    }
  }

  return (
    <PasswordToggleField.Root visible={visible} onVisibilityChange={setVisible}>
      <div data-slot="password-input" className="relative">
        <PasswordToggleField.Input
          id={id}
          data-slot="input"
          autoComplete={autoComplete}
          disabled={disabled}
          onKeyDown={(event) => {
            syncCapsLock(event)
            onKeyDown?.(event)
          }}
          onKeyUp={(event) => {
            syncCapsLock(event)
            onKeyUp?.(event)
          }}
          onBlur={(event) => {
            setCapsLock(false)
            onBlur?.(event)
          }}
          className={cn(
            "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent py-1 pr-10 pl-3 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "aria-invalid:border-field-error aria-invalid:bg-field-error-soft/70 aria-invalid:focus-visible:border-field-error aria-invalid:focus-visible:ring-field-error/20",
            className
          )}
          {...props}
        />
        <PasswordToggleField.Toggle
          // The preview Toggle reuses the input id by default; keep ids unique.
          id={`${id}-toggle`}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          disabled={disabled}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
        >
          <PasswordToggleField.Icon
            className="size-4"
            visible={<EyeOff aria-hidden="true" />}
            hidden={<Eye aria-hidden="true" />}
          />
        </PasswordToggleField.Toggle>
      </div>
      {capsLock && (
        <p
          data-slot="caps-lock-hint"
          role="status"
          className="flex items-center gap-1 text-xs leading-4 text-muted-foreground animate-in fade-in-0 duration-150"
        >
          <ArrowBigUpDash aria-hidden="true" className="size-3 shrink-0" />
          Bloq Mayús está activado
        </p>
      )}
    </PasswordToggleField.Root>
  )
}

export { PasswordInput }
export type { PasswordInputProps }
