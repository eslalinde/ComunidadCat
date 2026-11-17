"use client"

import * as React from "react"

/**
 * Returns focus to whatever opened a dialog once it closes.
 *
 * Radix only restores focus to its own <Dialog.Trigger>. Most dialogs here are
 * controlled (`open={state}`) and opened from an ordinary button, so without
 * this, focus falls back to <body> and keyboard users lose their place.
 * The opener is captured in onOpenAutoFocus, which Radix fires before it moves
 * focus into the content. A consumer calling preventDefault() opts out.
 */
export function useReturnFocus(
  onOpenAutoFocus?: (event: Event) => void,
  onCloseAutoFocus?: (event: Event) => void
) {
  const returnTo = React.useRef<HTMLElement | null>(null)

  return {
    onOpenAutoFocus: (event: Event) => {
      const active = document.activeElement
      returnTo.current = active instanceof HTMLElement && active !== document.body ? active : null
      onOpenAutoFocus?.(event)
    },
    onCloseAutoFocus: (event: Event) => {
      onCloseAutoFocus?.(event)
      const target = returnTo.current
      returnTo.current = null
      if (event.defaultPrevented || !target?.isConnected) return
      event.preventDefault()
      target.focus({ preventScroll: true })
    },
  }
}
