"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Globe,
  MapPinned,
  Building2,
  Layers,
  Cross,
  Church,
  Users,
  Users2,
  Route,
  BarChart3,
  Shield,
  ShieldCheck,
  Home,
  ChevronDown,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { NavUser } from "@/components/ui/nav-user";
import { routes } from "@/lib/routes";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

import { useAuth } from "@/contexts/AuthContext";
import { getSidebarVisibility } from "@/lib/permissions";
import { useMemo } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  title: string;
  key: string;
  items: NavItem[];
}

const allNavGroups: NavGroup[] = [
  {
    title: "Principal",
    key: "principal",
    items: [
      { label: "Inicio", href: routes.home, icon: Home },
      { label: "Comunidades", href: routes.comunidades, icon: Users2 },
      { label: "Parroquias", href: routes.parroquias, icon: Church },
      { label: "Personas", href: routes.personas, icon: Users },
    ],
  },
  {
    title: "Organización",
    key: "organizacion",
    items: [
      { label: "Diócesis", href: routes.diocesis, icon: Cross },
      { label: "Equipo Nacional", href: routes.equipoNacional, icon: Shield },
      { label: "Etapas del Camino", href: routes.etapas, icon: Route },
      { label: "Tipos de Equipo", href: routes.tiposEquipo, icon: Users2 },
      { label: "Tipos de Inventario", href: routes.tiposInventario, icon: Layers },
    ],
  },
  {
    title: "Ubicaciones",
    key: "ubicaciones",
    items: [
      { label: "Países", href: routes.paises, icon: Globe },
      { label: "Departamentos", href: routes.departamentos, icon: MapPinned },
      { label: "Ciudades", href: routes.ciudades, icon: Building2 },
      { label: "Zonas", href: routes.zonas, icon: Layers },
    ],
  },
  {
    title: "Reportes",
    key: "reportes",
    items: [
      { label: "Reportes", href: routes.reportes, icon: BarChart3 },
    ],
  },
  {
    title: "Administración",
    key: "admin",
    items: [
      { label: "Usuarios", href: routes.admin, icon: ShieldCheck },
    ],
  },
];

// Items within "Principal" that have individual visibility keys
const principalItemVisibility: Record<string, keyof ReturnType<typeof getSidebarVisibility>> = {
  [routes.comunidades]: 'comunidades',
  [routes.parroquias]: 'parroquias',
  [routes.personas]: 'personas',
};

export function AppSidebar({
  userName,
  userEmail,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  userName?: string;
  userEmail?: string;
}) {
  const pathname = usePathname();
  const { userScope } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const visibility = useMemo(() => getSidebarVisibility(userScope), [userScope]);

  const closeMobileNavigation = () => {
    if (isMobile) setOpenMobile(false);
  };

  const filteredGroups = useMemo(() => {
    return allNavGroups
      .filter((group) => {
        const key = group.key as keyof typeof visibility;
        return visibility[key] !== false;
      })
      .map((group) => {
        if (group.key === 'principal') {
          return {
            ...group,
            items: group.items.filter((item) => {
              const visKey = principalItemVisibility[item.href];
              if (visKey) return visibility[visKey] !== false;
              return true; // Inicio is always visible
            }),
          };
        }
        return group;
      });
  }, [visibility]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/" onClick={closeMobileNavigation}>
                <div className="flex aspect-square size-8 items-center justify-center shrink-0">
                  <Image
                    src="/logo.png"
                    alt="ComunidadCat Logo"
                    width={28}
                    height={28}
                    className="drop-shadow-sm w-7 h-7"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-[family-name:var(--font-montserrat)] text-primary">
                    <span className="font-normal">Comunidad</span>
                    <span className="font-semibold">Cat</span>
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    Gestión de Comunidades
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {filteredGroups.map((group) => (
          <Collapsible
            key={group.title}
            defaultOpen
            className="group/collapsible"
          >
            <SidebarGroup className="py-1">
              <SidebarGroupLabel
                asChild
                className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm"
              >
                <CollapsibleTrigger>
                  {group.title}
                  <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu className="border-l border-sidebar-border ml-4 pl-2 w-[calc(100%-1.5rem)] group-data-[collapsible=icon]:ml-0 group-data-[collapsible=icon]:pl-0 group-data-[collapsible=icon]:border-l-0 group-data-[collapsible=icon]:w-full">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        item.href === "/"
                          ? pathname === "/"
                          : pathname.startsWith(item.href);

                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={item.label}
                          >
                            <Link
                              href={item.href}
                              aria-current={isActive ? "page" : undefined}
                              onClick={closeMobileNavigation}
                            >
                              <Icon />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUser userName={userName} userEmail={userEmail} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
