"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { BrandLogo } from "@/components/ui/brand-logo";
import {
  Users,
  Church,
  Users2,
  BarChart3,
  Globe,
  Landmark,
  Footprints,
  UsersRound,
  ChevronRight,
} from "lucide-react";
import { routes } from "@/lib/routes";
import { useAuth } from "@/contexts/AuthContext";
import { getSidebarVisibility } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";

const quickAccess = [
  {
    title: "Comunidades",
    description: "Ver y gestionar las comunidades del Camino Neocatecumenal",
    href: routes.comunidades,
    icon: Users2,
    iconColor: "text-orange-600",
    bg: "bg-orange-50",
    border: "hover:border-orange-300",
  },
  {
    title: "Parroquias",
    description: "Administrar parroquias y ver sus comunidades",
    href: routes.parroquias,
    icon: Church,
    iconColor: "text-blue-600",
    bg: "bg-blue-50",
    border: "hover:border-blue-300",
  },
  {
    title: "Personas",
    description: "Gestionar personas, hermanos y catequistas",
    href: routes.personas,
    icon: Users,
    iconColor: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "hover:border-emerald-300",
  },
  {
    title: "Reportes",
    description: "Generar reportes de equipos, comunidades y líderes",
    href: routes.reportes,
    icon: BarChart3,
    iconColor: "text-red-600",
    bg: "bg-red-50",
    border: "hover:border-red-300",
  },
];

const secondaryAccess = [
  {
    title: "Diócesis",
    href: routes.diocesis,
    icon: Landmark,
    iconColor: "text-yellow-600",
    bg: "bg-yellow-50",
  },
  {
    title: "Etapas del Camino",
    href: routes.etapas,
    icon: Footprints,
    iconColor: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    title: "Equipo Nacional",
    href: routes.equipoNacional,
    icon: UsersRound,
    iconColor: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "Países",
    href: routes.paises,
    icon: Globe,
    iconColor: "text-orange-600",
    bg: "bg-orange-50",
  },
];

// Map quick access cards to visibility keys for filtering
const quickAccessVisibility: Record<string, keyof ReturnType<typeof getSidebarVisibility>> = {
  [routes.comunidades]: 'comunidades',
  [routes.parroquias]: 'parroquias',
  [routes.personas]: 'personas',
  [routes.reportes]: 'reportes',
};

export default function Home() {
  const { userScope, loading } = useAuth();
  const router = useRouter();

  // Redirect community-scoped users to their community
  // (community_responsible or viewer with community_id)
  const shouldRedirectToCommunity =
    userScope?.community_id != null &&
    userScope.zone_id == null &&
    (userScope.role === 'community_responsible' || userScope.role === 'viewer');

  useEffect(() => {
    if (loading || !userScope) return;
    if (shouldRedirectToCommunity) {
      router.replace(routes.comunidad(userScope.community_id!));
    }
  }, [userScope, loading, router, shouldRedirectToCommunity]);

  // While redirecting, show spinner
  if (shouldRedirectToCommunity) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  const visibility = getSidebarVisibility(userScope);

  const filteredQuickAccess = quickAccess.filter((item) => {
    const key = quickAccessVisibility[item.href];
    return key ? visibility[key] : true;
  });

  const showSecondary = visibility.organizacion || visibility.ubicaciones;

  const filteredSecondaryAccess = secondaryAccess.filter((item) => {
    // Diocesis, Equipo Nacional, Etapas → organizacion
    if ([routes.diocesis, routes.equipoNacional, routes.etapas].includes(item.href as any)) {
      return visibility.organizacion;
    }
    // Paises → ubicaciones
    if (item.href === routes.paises) return visibility.ubicaciones;
    return true;
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Welcome section */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3 flex-wrap">
          Bienvenido a <BrandLogo size="md" />
        </h1>
        <p className="text-muted-foreground mt-1">
          Selecciona una opción para comenzar a trabajar.
        </p>
      </div>

      {/* Primary quick access - large cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredQuickAccess.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className={`p-5 h-full shadow-xs transition-all hover:shadow-md ${item.border}`}>
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-xl ${item.bg} flex-shrink-0`}
                  >
                    <Icon className={`w-7 h-7 ${item.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-foreground mb-0.5">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Secondary access - smaller cards */}
      {showSecondary && filteredSecondaryAccess.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Otras secciones
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {filteredSecondaryAccess.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Card className="flex-row items-center gap-3 px-3 py-3 shadow-xs transition-all group-hover:border-primary/30 group-hover:shadow-sm">
                    <div className={`p-2 rounded-lg ${item.bg} shrink-0`}>
                      <Icon className={`w-4 h-4 ${item.iconColor}`} />
                    </div>
                    <span className="flex-1 min-w-0 truncate text-sm font-medium text-foreground">
                      {item.title}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
