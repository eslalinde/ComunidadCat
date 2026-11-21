"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { BarChart3, Church, Home, Menu, Users, Users2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { getSidebarVisibility, type SidebarVisibility } from "@/lib/permissions";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

interface BottomNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  visibility?: keyof SidebarVisibility;
}

// Most frequent destinations; everything else stays reachable through "Más",
// which opens the full sidebar.
const bottomNavItems: BottomNavItem[] = [
  { label: "Inicio", href: routes.home, icon: Home },
  { label: "Comunidades", href: routes.comunidades, icon: Users2, visibility: "comunidades" },
  { label: "Parroquias", href: routes.parroquias, icon: Church, visibility: "parroquias" },
  { label: "Personas", href: routes.personas, icon: Users, visibility: "personas" },
  { label: "Reportes", href: routes.reportes, icon: BarChart3, visibility: "reportes" },
];

const MAX_LINKS = 4;

export function isBottomNavItemActive(pathname: string, href: string): boolean {
  return href === routes.home ? pathname === "/" : pathname.startsWith(href);
}

export function MobileBottomNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const { userScope } = useAuth();
  const { isMobile, openMobile, setOpenMobile } = useSidebar();
  const visibility = useMemo(() => getSidebarVisibility(userScope), [userScope]);

  const items = useMemo(
    () =>
      bottomNavItems
        .filter((item) => !item.visibility || visibility[item.visibility] !== false)
        .slice(0, MAX_LINKS),
    [visibility],
  );

  if (!isMobile) return null;

  const itemClass =
    "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium leading-tight touch-manipulation transition-colors";

  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex border-t bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] print:hidden",
        className,
      )}
    >
      {items.map(({ label, href, icon: Icon }) => {
        const active = isBottomNavItemActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              itemClass,
              active ? "text-primary" : "text-muted-foreground active:text-foreground",
            )}
          >
            <Icon className="size-5" />
            <span className="truncate max-w-full">{label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        aria-label="Más opciones de navegación"
        aria-expanded={openMobile}
        onClick={() => setOpenMobile(true)}
        className={cn(itemClass, "text-muted-foreground active:text-foreground")}
      >
        <Menu className="size-5" />
        <span>Más</span>
      </button>
    </nav>
  );
}
