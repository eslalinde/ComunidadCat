import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: 28, text: "text-sm" },
  md: { icon: 40, text: "text-2xl" },
  lg: { icon: 56, text: "text-3xl" },
};

export function BrandLogo({ size = "md", showIcon = true, className }: BrandLogoProps) {
  const s = sizes[size];

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {showIcon && (
        <Image
          src="/logo.png"
          alt="ComunidadCat"
          width={s.icon}
          height={s.icon}
          className="drop-shadow-sm"
        />
      )}
      <span className={cn("font-[family-name:var(--font-montserrat)] text-primary", s.text)}>
        <span className="font-normal">Comunidad</span>
        <span className="font-semibold">Cat</span>
      </span>
    </span>
  );
}
