"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * App-wide toaster. Visual styling lives in globals.css (`.app-toaster`)
 * and is driven by `--toast-*` component tokens, so it follows the app's
 * own `.dark` class instead of the OS color scheme.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster app-toaster group"
      position="top-right"
      closeButton
      duration={5000}
      gap={10}
      offset={20}
      mobileOffset={12}
      icons={{
        success: <CircleCheckIcon className="size-5" aria-hidden="true" />,
        info: <InfoIcon className="size-5" aria-hidden="true" />,
        warning: <TriangleAlertIcon className="size-5" aria-hidden="true" />,
        error: <OctagonXIcon className="size-5" aria-hidden="true" />,
        loading: <Loader2Icon className="size-5 animate-spin" aria-hidden="true" />,
      }}
      containerAriaLabel="Notificaciones"
      {...props}
    />
  )
}

export { Toaster }
