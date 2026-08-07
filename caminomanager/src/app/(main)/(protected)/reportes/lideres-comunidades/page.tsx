"use client";
import { createColumnHelper } from "@tanstack/react-table";
import {
  DynamicReportTable,
  DynamicColumnMeta,
  DynamicReportConfig,
} from "@/components/reports/dynamic-table";
import {
  useCommunityLeadersReport,
  CommunityLeaderRow,
} from "@/hooks/useCommunityLeadersReport";

const columnHelper = createColumnHelper<CommunityLeaderRow>();

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
    header: "Comunidad",
    cell: (info) => info.getValue(),
    meta: {
      filterType: "text",
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("step_way_name", {
    header: "Etapa del Camino",
    cell: (info) => info.getValue(),
    meta: {
      filterType: "select",
      enableGrouping: true,
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("responsible_name", {
    header: "Responsable",
    cell: (info) => info.getValue(),
    meta: {
      filterType: "text",
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("catechists", {
    header: "Catequistas",
    cell: (info) => info.getValue() || "-",
    meta: {
      filterType: "text",
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("catechist_count", {
    header: "# Cat.",
    cell: (info) => info.getValue(),
    meta: {
      align: "center",
      aggregationType: "sum",
      aggregationLabel: "Total",
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("presbyters", {
    header: "Presbíteros",
    cell: (info) => info.getValue() || "-",
    meta: {
      filterType: "text",
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("presbyter_count", {
    header: "# Presb.",
    cell: (info) => info.getValue(),
    meta: {
      align: "center",
      aggregationType: "sum",
      aggregationLabel: "Total",
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("itinerants", {
    header: "Itinerantes",
    cell: (info) => info.getValue() || "-",
    meta: {
      filterType: "text",
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("itinerant_count", {
    header: "# Itin.",
    cell: (info) => info.getValue(),
    meta: {
      align: "center",
      aggregationType: "sum",
      aggregationLabel: "Total",
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("seminarians", {
    header: "Seminaristas",
    cell: (info) => info.getValue() || "-",
  }),
  columnHelper.accessor("seminarian_count", {
    header: "# Sem.",
    cell: (info) => info.getValue(),
    meta: {
      align: "center",
      aggregationType: "sum",
      aggregationLabel: "Total",
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("nuns", {
    header: "Monjas",
    cell: (info) => info.getValue() || "-",
  }),
  columnHelper.accessor("nun_count", {
    header: "# Mon.",
    cell: (info) => info.getValue(),
    meta: {
      align: "center",
      aggregationType: "sum",
      aggregationLabel: "Total",
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("brothers_count", {
    header: "# Hermanos",
    cell: (info) => info.getValue(),
    meta: {
      align: "center",
      aggregationType: "sum",
      aggregationLabel: "Total",
    } satisfies DynamicColumnMeta,
  }),
];

const reportConfig: DynamicReportConfig<CommunityLeaderRow> = {
  title: "Responsables de Comunidades",
  description:
    "Reporte de comunidades con sus catequistas, presbíteros, itinerantes, seminaristas y monjas",
  columns,
  exportFileName: "lideres_comunidades",
  defaultSorting: [{ id: "diocese_name", desc: false }],
  globalFilterPlaceholder: "Buscar por nombre, parroquia, comunidad...",
  dataGrid: {
    pageSize: 10,
  },
};

export default function CommunityLeadersReportPage() {
  const { data, loading, refetch } = useCommunityLeadersReport();

  return (
    <DynamicReportTable
      config={reportConfig}
      data={data}
      loading={loading}
      onRefresh={() => refetch()}
    />
  );
}
