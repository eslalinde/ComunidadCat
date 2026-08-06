"use client";
import { useState, useEffect, useMemo } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { createClient } from "@/utils/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataGrid } from "@/components/ui/data-grid";
import {
  TableCell,
  TableFooter,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, RefreshCw, Printer, Download } from "lucide-react";
import Link from "next/link";
import { routes } from "@/lib/routes";

interface StepWay {
  id: number;
  name: string;
  order_num: number | null;
}

interface CommunityRow {
  id: number;
  number: string;
  parish_id: number;
  parish_name: string;
  step_way_id: number | null;
  step_way_name: string | null;
}

interface MatrixRow {
  parishId: number;
  parishName: string;
  communitiesByStep: Record<number, string[]>;
  total: number;
}

const matrixColumnHelper = createColumnHelper<MatrixRow>();

const toOrdinal = (num: string) => `${num}ª`;

export default function ReporteEstadoPasos() {
  const [communities, setCommunities] = useState<CommunityRow[]>([]);
  const [stepWays, setStepWays] = useState<StepWay[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "parishName", desc: false },
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      const [commRes, stepsRes] = await Promise.all([
        supabase
          .from("communities")
          .select(
            `
            id,
            number,
            parish_id,
            step_way_id,
            parish:parishes(name),
            step_way:step_ways(name)
          `
          )
          .order("number"),
        supabase
          .from("step_ways")
          .select("id, name, order_num")
          .order("order_num", { ascending: true }),
      ]);

      if (commRes.error) {
        console.error("Error fetching communities:", commRes.error);
        return;
      }
      if (stepsRes.error) {
        console.error("Error fetching step_ways:", stepsRes.error);
        return;
      }

      const rows: CommunityRow[] = (commRes.data || []).map((c: any) => ({
        id: c.id,
        number: c.number,
        parish_id: c.parish_id,
        parish_name: (c.parish as any)?.name || "Sin Parroquia",
        step_way_id: c.step_way_id,
        step_way_name: (c.step_way as any)?.name || null,
      }));

      setCommunities(rows);
      setStepWays(stepsRes.data || []);
    } catch (err) {
      console.error("Error in fetchData:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Build the matrix data
  const { parishes, matrix, totalsByStep, totalsByParish, grandTotal } =
    useMemo(() => {
      // Unique parishes sorted alphabetically
      const parishMap = new Map<number, string>();
      communities.forEach((c) => {
        if (c.parish_id && !parishMap.has(c.parish_id)) {
          parishMap.set(c.parish_id, c.parish_name);
        }
      });
      const parishes = Array.from(parishMap.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, "es-CO"));

      // matrix[parishId][stepWayId] = community numbers[]
      const matrix: Record<number, Record<number, string[]>> = {};
      parishes.forEach((p) => {
        matrix[p.id] = {};
        stepWays.forEach((s) => {
          matrix[p.id][s.id] = [];
        });
      });

      communities.forEach((c) => {
        if (c.parish_id && c.step_way_id && matrix[c.parish_id]?.[c.step_way_id]) {
          matrix[c.parish_id][c.step_way_id].push(c.number);
        }
      });

      // Sort community numbers inside each cell numerically
      Object.values(matrix).forEach((stepMap) => {
        Object.values(stepMap).forEach((arr) => {
          arr.sort((a, b) => {
            const na = parseInt(a, 10);
            const nb = parseInt(b, 10);
            if (!isNaN(na) && !isNaN(nb)) return na - nb;
            return a.localeCompare(b, "es-CO");
          });
        });
      });

      // Totals
      const totalsByStep: Record<number, number> = {};
      stepWays.forEach((s) => {
        totalsByStep[s.id] = 0;
        parishes.forEach((p) => {
          totalsByStep[s.id] += matrix[p.id][s.id].length;
        });
      });

      const totalsByParish: Record<number, number> = {};
      parishes.forEach((p) => {
        totalsByParish[p.id] = 0;
        stepWays.forEach((s) => {
          totalsByParish[p.id] += matrix[p.id][s.id].length;
        });
      });

      const grandTotal = Object.values(totalsByParish).reduce(
        (sum, v) => sum + v,
        0
      );

      return { parishes, matrix, totalsByStep, totalsByParish, grandTotal };
    }, [communities, stepWays]);

  const matrixRows = useMemo<MatrixRow[]>(
    () =>
      parishes.map((parish) => ({
        parishId: parish.id,
        parishName: parish.name,
        communitiesByStep: matrix[parish.id],
        total: totalsByParish[parish.id],
      })),
    [matrix, parishes, totalsByParish]
  );

  const matrixColumns = useMemo(
    () => [
      matrixColumnHelper.accessor("parishName", {
        header: "Parroquia",
      }),
      ...stepWays.map((step) =>
        matrixColumnHelper.accessor(
          (row) => row.communitiesByStep[step.id]?.map(toOrdinal).join(", ") ?? "",
          {
            id: `step_${step.id}`,
            header: step.name,
            enableSorting: false,
          }
        )
      ),
      matrixColumnHelper.accessor("total", {
        header: "Total",
      }),
    ],
    [stepWays]
  );

  const matrixTable = useReactTable({
    data: matrixRows,
    columns: matrixColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const headers = [
        "Parroquia",
        ...stepWays.map((s) => s.name),
        "Total",
      ];
      const rows = parishes.map((parish) => [
        parish.name,
        ...stepWays.map((s) => {
          const nums = matrix[parish.id][s.id];
          return nums.length > 0 ? nums.map(toOrdinal).join(", ") : "";
        }),
        String(totalsByParish[parish.id]),
      ]);
      // Totals row
      rows.push([
        "Total por Paso",
        ...stepWays.map((s) => String(totalsByStep[s.id])),
        String(grandTotal),
      ]);

      const csvContent = [headers, ...rows]
        .map((row) =>
          row
            .map((cell) => {
              const escaped = cell.replace(/"/g, '""');
              return `"${escaped}"`;
            })
            .join(",")
        )
        .join("\n");

      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "estado_pasos.csv";
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link href={routes.reportes}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Estado de Comunidades
            </h1>
            <p className="text-gray-600">
              Matriz de comunidades distribuidas por parroquia y etapa del camino
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>
          <Button
            onClick={handleExportCSV}
            disabled={loading || isExporting || parishes.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? "Exportando..." : "Exportar CSV"}
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block print:mb-4">
        <h1 className="text-xl font-bold text-center">
          Estado de Pasos por Parroquia
        </h1>
        <p className="text-sm text-center text-gray-600">
          Generado el {new Date().toLocaleDateString("es-CO")}
        </p>
      </div>

      {/* Matrix Table */}
      <Card className="p-4 print:shadow-none print:border-none print:p-0">
        <DataGrid
          table={matrixTable}
          loading={loading}
          loadingMessage="Cargando datos..."
          emptyMessage="No hay datos disponibles"
          className="[&_table]:min-w-max print:overflow-visible print:border-0 print:[&_table]:min-w-0 print:[&_table]:text-xs"
          getHeaderClassName={(column) =>
            column.id === "parishName"
              ? "sticky left-0 z-10 min-w-[180px] bg-gray-100 text-gray-900 print:min-w-0 print:bg-gray-200"
              : column.id === "total"
                ? "min-w-[80px] bg-blue-50 text-center text-gray-900 print:min-w-0 print:bg-blue-100"
                : "min-w-[96px] text-center text-gray-900 print:min-w-0"
          }
          getCellClassName={(cell) =>
            cell.column.id === "parishName"
              ? "sticky left-0 z-10 bg-inherit font-medium text-gray-900"
              : cell.column.id === "total"
                ? "bg-blue-50 text-center font-semibold text-blue-800 print:bg-blue-100"
                : "text-center text-gray-700"
          }
          footer={
            <TableFooter>
              <TableRow className="bg-gray-100 font-bold print:bg-gray-200">
                {matrixTable.getVisibleLeafColumns().map((column) => {
                  if (column.id === "parishName") {
                    return (
                      <TableCell
                        key={column.id}
                        className="sticky left-0 z-10 bg-gray-100 font-bold text-gray-900 print:bg-gray-200"
                      >
                        Total por Paso
                      </TableCell>
                    );
                  }

                  if (column.id === "total") {
                    return (
                      <TableCell
                        key={column.id}
                        className="bg-blue-600 text-center font-bold text-white print:bg-blue-800"
                      >
                        {grandTotal}
                      </TableCell>
                    );
                  }

                  const stepId = Number(column.id.replace("step_", ""));
                  return (
                    <TableCell key={column.id} className="text-center">
                      {totalsByStep[stepId] ?? 0}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableFooter>
          }
        />

        {!loading && parishes.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 text-center print:hidden">
            {parishes.length} parroquias &middot; {grandTotal} comunidades
          </div>
        )}
      </Card>
    </div>
  );
}
