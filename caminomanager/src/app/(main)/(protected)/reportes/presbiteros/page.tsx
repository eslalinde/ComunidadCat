"use client";
import { createColumnHelper } from "@tanstack/react-table";
import {
  DynamicReportTable,
  DynamicColumnMeta,
  DynamicReportConfig,
} from "@/components/reports/dynamic-table";
import { usePriestsReport, PriestRow } from "@/hooks/usePriestsReport";

const columnHelper = createColumnHelper<PriestRow>();

const columns = [
  columnHelper.accessor("priest_name", {
    header: "Nombre del Presbítero",
    cell: (info) => info.getValue(),
    meta: {
      filterType: "text",
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("is_parish_priest", {
    header: "Párroco",
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
  columnHelper.accessor("parish_name", {
    header: "Parroquia",
    cell: (info) => info.getValue(),
    meta: {
      filterType: "select",
      enableGrouping: true,
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("diocese", {
    header: "Diócesis",
    cell: (info) => info.getValue(),
    meta: {
      filterType: "select",
      enableGrouping: true,
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("city_name", {
    header: "Ciudad",
    cell: (info) => info.getValue(),
    meta: {
      filterType: "select",
      enableGrouping: true,
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("communities_count", {
    header: "Comunidades",
    cell: (info) => info.getValue(),
    meta: {
      align: "center",
      aggregationType: "sum",
      aggregationLabel: "Total",
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("phone", {
    header: "Teléfono",
    cell: (info) => info.getValue(),
    meta: {
      filterType: "text",
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("mobile", {
    header: "Móvil",
    cell: (info) => info.getValue(),
    meta: {
      filterType: "text",
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("email", {
    header: "Email",
    cell: (info) => <span className="text-sm">{info.getValue()}</span>,
    meta: {
      filterType: "text",
    } satisfies DynamicColumnMeta,
  }),
];

const reportConfig: DynamicReportConfig<PriestRow> = {
  title: "Presbíteros",
  description:
    "Reporte de todos los presbíteros con sus parroquias asignadas y comunidades a cargo",
  columns,
  exportFileName: "presbiteros",
  defaultSorting: [{ id: "priest_name", desc: false }],
  globalFilterPlaceholder: "Buscar por nombre, parroquia, diócesis, ciudad...",
  dataGrid: {
    pageSize: 10,
  },
};

export default function PriestsReport() {
  const { data, loading, refetch } = usePriestsReport();

  return (
    <DynamicReportTable
      config={reportConfig}
      data={data}
      loading={loading}
      onRefresh={() => refetch()}
    />
  );
}
