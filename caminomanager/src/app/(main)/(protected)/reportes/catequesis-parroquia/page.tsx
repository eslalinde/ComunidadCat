"use client";
import { useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import {
  DynamicReportTable,
  DynamicColumnMeta,
  DynamicReportConfig,
} from "@/components/reports/dynamic-table";
import {
  useParishCatechesisReport,
  ParishCatechesisRow,
} from "@/hooks/useParishCatechesisReport";

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value + "T00:00:00");
  return date.toLocaleDateString("es-CO");
}

function getDefaultDates() {
  const today = new Date();
  const start = today.toISOString().split("T")[0];
  const end = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate())
    .toISOString()
    .split("T")[0];
  return { start, end };
}

const columnHelper = createColumnHelper<ParishCatechesisRow>();

const columns = [
  columnHelper.accessor("diocese_name", {
    header: "Diócesis",
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
  columnHelper.accessor("city_name", {
    header: "Ciudad",
    cell: (info) => info.getValue(),
    meta: {
      filterType: "select",
      enableGrouping: true,
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("zone_name", {
    header: "Zona",
    cell: (info) => info.getValue(),
    meta: {
      filterType: "select",
      enableGrouping: true,
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("planned_start_date", {
    header: "Fecha Planificada",
    cell: (info) => formatDate(info.getValue()),
  }),
  columnHelper.accessor("actual_start_date", {
    header: "Fecha Real",
    cell: (info) => formatDate(info.getValue()),
  }),
  columnHelper.accessor("birth_retreat_date", {
    header: "Convivencia",
    cell: (info) => formatDate(info.getValue()),
  }),
  columnHelper.accessor("attendance_count", {
    header: "Asistentes",
    cell: (info) => info.getValue(),
    meta: {
      aggregationType: "sum",
    } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor("catechist_team", {
    header: "Equipo Catequista",
    cell: (info) => info.getValue() || "-",
    meta: {
      filterType: "text",
    } satisfies DynamicColumnMeta,
  }),
];

const reportConfig: DynamicReportConfig<ParishCatechesisRow> = {
  title: "Catequesis por Parroquia",
  description:
    "Catequesis programadas por parroquia en un rango de fechas",
  columns,
  exportFileName: "catequesis_parroquia",
  defaultGrouping: ["diocese_name", "parish_name"],
  defaultSorting: [{ id: "planned_start_date", desc: false }],
  globalFilterPlaceholder:
    "Buscar por parroquia, diócesis, equipo catequista...",
  dataGrid: {
    pageSize: 10,
  },
};

export default function ParishCatechesisReport() {
  const defaults = getDefaultDates();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const { data, loading, refetch } = useParishCatechesisReport(
    startDate,
    endDate
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label htmlFor="startDate" className="text-sm font-medium text-gray-700">
            Desde:
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="endDate" className="text-sm font-medium text-gray-700">
            Hasta:
          </label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      <DynamicReportTable
        config={reportConfig}
        data={data}
        loading={loading}
        onRefresh={() => refetch()}
      />
    </div>
  );
}
