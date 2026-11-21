import { readAuthorizedReport } from "@/lib/reportAccess";
import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";

export interface ParishCatechesisRow {
  diocese_name: string;
  parish_name: string;
  city_name: string;
  zone_name: string;
  planned_start_date: string;
  actual_start_date: string;
  birth_retreat_date: string;
  attendance_count: number;
  catechist_team: string;
}

async function fetchParishCatechesis(
  startDate: string,
  endDate: string
): Promise<ParishCatechesisRow[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("parish_catechesis")
    .select(
      `
      planned_start_date,
      actual_start_date,
      birth_retreat_date,
      attendance_count,
      catechist_team,
      parish:parishes(
        name,
        diocese:dioceses(name, type),
        city:cities(name),
        zone:city_zones(name)
      )
    `
    )
    .gte("planned_start_date", startDate)
    .lte("planned_start_date", endDate);

  if (error) throw error;

  return (data || []).map((row: any) => {
    const parish = row.parish;
    const diocese = parish?.diocese;
    const dioceseLabel = diocese
      ? `${diocese.type === "archdiocese" ? "Arquidiócesis" : "Diócesis"} de ${diocese.name}`
      : "N/A";

    return {
      diocese_name: dioceseLabel,
      parish_name: parish?.name || "N/A",
      city_name: parish?.city?.name || "N/A",
      zone_name: parish?.zone?.name || "N/A",
      planned_start_date: row.planned_start_date || "",
      actual_start_date: row.actual_start_date || "",
      birth_retreat_date: row.birth_retreat_date || "",
      attendance_count: row.attendance_count || 0,
      catechist_team: row.catechist_team || "",
    };
  });
}

export function useParishCatechesisReport(startDate: string, endDate: string) {
  const loadExportRows = useCallback(() => fetchParishCatechesis(startDate, endDate), [startDate, endDate]);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["report", "parish-catechesis", startDate, endDate],
    queryFn: () => readAuthorizedReport(loadExportRows),
  });

  return {
    data: error ? [] : data ?? [],
    loading: isLoading,
    error,
    refetch,
    loadExportRows,
  };
}
