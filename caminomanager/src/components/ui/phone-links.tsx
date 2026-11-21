import { MessageCircle, Phone } from "lucide-react";

import { toTelHref, toWhatsAppHref } from "@/lib/phone";
import { cn } from "@/lib/utils";

interface PhoneLinksProps {
  number: string | null | undefined;
  /** Show a WhatsApp shortcut when the number resolves to an international mobile. */
  whatsapp?: boolean;
  className?: string;
}

/** Renders a phone number as a tap-to-call link, plus an optional WhatsApp link. */
export function PhoneLinks({ number, whatsapp = false, className }: PhoneLinksProps) {
  const telHref = toTelHref(number);
  if (!number || !telHref) return number ? <span className={className}>{number}</span> : null;

  const waHref = whatsapp ? toWhatsAppHref(number) : null;

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-1", className)}>
      <a
        href={telHref}
        aria-label={`Llamar a ${number}`}
        className="inline-flex min-h-9 items-center gap-1 rounded-md px-1 text-primary underline-offset-2 hover:underline touch-manipulation"
      >
        <Phone className="size-3.5" aria-hidden="true" />
        {number}
      </a>
      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Escribir por WhatsApp a ${number}`}
          className="inline-flex size-9 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950 touch-manipulation"
        >
          <MessageCircle className="size-4" aria-hidden="true" />
        </a>
      )}
    </span>
  );
}
