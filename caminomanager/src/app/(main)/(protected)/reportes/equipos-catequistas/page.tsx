"use client";
import { createColumnHelper } from "@tanstack/react-table";
import {
  DynamicReportTable,
  DynamicColumnMeta,
  DynamicReportConfig,
} from "@/components/reports/dynamic-table";
import {
  useCatechistTeamsReport,
  CatechistTeamRow,
} from "@/hooks/useCatechistTeamsReport";

const columnHelper = createColumnHelper<CatechistTeamRow>();

const columns = [
  columnHelper.accessor("diocese_name", {
    header: "Arquidiócesis/Diócesis",
    cell: (info) => info.getValue(),
    meta: {
      filterType: "select",
      enableGrouping: true,
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("parish_name", {
    header: "Parroquia",
    cell: (info) => info.getValue(),
    meta: {
      filterType: "select",
      enableGrouping: true,
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("community_number", {
    header: "Comunidad No",
    cell: (info) => info.getValue(),
    meta: {
      filterType: "text",
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("responsible_name", {
    header: "Responsable",
    cell: (info) => info.getValue(),
    meta: {
      filterType: "text",
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("has_parish_llevan", {
    header: "Lleva Parroquia",
    cell: (info) => {
      const value = info.getValue();
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === "Sí"
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {value}
        </span>
      );
    },
    meta: {
      filterType: "select",
      enableGrouping: true,
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("parish_llevan", {
    header: "Parroquia que Lleva",
    cell: (info) => info.getValue() || "-",
    meta: {
      filterType: "select",
      enableGrouping: true,
    } satisfies DynamicColumnMeta,
  }),
];

const reportConfig: DynamicReportConfig<CatechistTeamRow> = {
  title: "Equipos de Catequistas",
  description:
    "Reporte de todos los equipos de catequistas con sus comunidades asignadas y parroquias que llevan",
  columns,
  exportFileName: "equipos_catequistas",
  defaultSorting: [{ id: "diocese_name", desc: false }],
  globalFilterPlaceholder: "Buscar por responsable, parroquia, comunidad...",
  dataGrid: {
    pageSize: 5,
  },
};

export default function CatechistTeamsReport() {
  const { data, loading, refetch } = useCatechistTeamsReport();

  return (
    <DynamicReportTable
      config={reportConfig}
      data={data}
      loading={loading}
      onRefresh={() => refetch()}
    />
  );
}
