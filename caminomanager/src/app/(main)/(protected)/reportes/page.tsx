"use client";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { BarChart3, Users, UserCheck, GitBranch, Crown, Calendar } from "lucide-react";
import { routes } from "@/lib/routes";

const reportTypes = [
  {
    title: "Equipos de Catequistas",
    description: "Reporte de equipos de catequistas con sus miembros y comunidades asignadas",
    href: routes.reporteCatequistas,
    icon: Users,
    iconColor: "text-blue-600",
    bg: "bg-blue-50",
    border: "hover:border-blue-300",
  },
  {
    title: "Presbíteros",
    description: "Listado de presbíteros con sus parroquias asignadas",
    href: routes.reportePresbiteros,
    icon: UserCheck,
    iconColor: "text-red-600",
    bg: "bg-red-50",
    border: "hover:border-red-300",
  },
  {
    title: "Estado de Comunidades",
    description: "Matriz de comunidades por parroquia y etapa del camino neocatecumenal",
    href: routes.reporteEstadoPasos,
    icon: GitBranch,
    iconColor: "text-orange-600",
    bg: "bg-orange-50",
    border: "hover:border-orange-300",
  },
  {
    title: "Responsables de Comunidades",
    description: "Reporte dinámico de comunidades con catequistas, presbíteros, itinerantes, seminaristas y monjas",
    href: routes.reporteLideres,
    icon: Crown,
    iconColor: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "hover:border-emerald-300",
  },
  {
    title: "Catequesis por Parroquia",
    description: "Catequesis programadas por parroquia en un rango de fechas",
    href: routes.reporteCatequesisParroquia,
    icon: Calendar,
    iconColor: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "hover:border-yellow-300",
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reportes</h1>
        <p className="text-muted-foreground mt-1">
          Selecciona el tipo de reporte que deseas generar.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          return (
            <Link key={report.href} href={report.href}>
              <Card className={`p-5 hover:shadow-md transition-all cursor-pointer h-full border border-border ${report.border}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${report.bg} flex-shrink-0`}>
                    <Icon className={`w-7 h-7 ${report.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-foreground mb-0.5">
                      {report.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {report.description}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
