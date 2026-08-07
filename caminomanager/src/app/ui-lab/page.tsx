import type { Metadata } from "next"

import { ReuiLab } from "@/components/ui-lab/ReuiLab"

export const metadata: Metadata = {
  title: "Laboratorio ReUI · ComunidadCat",
  robots: { index: false, follow: false },
}

export default function UiLabPage() {
  return <ReuiLab />
}
