import { readAuthorizedReport } from "@/lib/reportAccess";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";

export interface PriestRow {
  priest_name: string;
  is_parish_priest: string;
  parish_name: string;
  diocese: string;
  city_name: string;
  communities_count: number;
  email: string;
}

async function fetchPriests(): Promise<PriestRow[]> {
  const supabase = createClient();

  // Two consolidated queries instead of 5 sequential ones
  const [priestsResult, communitiesResult] = await Promise.all([
    supabase
      .from("priests")
      .select(
        `
        id,
        is_parish_priest,
        parish_id,
        person:people(person_name, email),
        parish:parishes(
          name,
          diocese:dioceses(name),
          city:cities(name)
        )
      `
      ),
    supabase
      .from("communities")
      .select("parish_id"),
  ]);

  if (priestsResult.error) throw priestsResult.error;
  if (communitiesResult.error) throw communitiesResult.error;

  // Build communities count by parish
  const commCountByParish: Record<number, number> = {};
  for (const c of communitiesResult.data || []) {
    if (c.parish_id) {
      commCountByParish[c.parish_id] = (commCountByParish[c.parish_id] || 0) + 1;
    }
  }

  const rows: PriestRow[] = (priestsResult.data || []).map((priest) => {
    const person = priest.person as any;
    const parish = priest.parish as any;

    return {
      priest_name: person?.person_name || "N/A",
      is_parish_priest: priest.is_parish_priest ? "Sí" : "No",
      parish_name: parish?.name || "Sin parroquia asignada",
      diocese: (parish?.diocese as any)?.name || "No especificado",
      city_name: (parish?.city as any)?.name || "N/A",
      communities_count: priest.parish_id
        ? commCountByParish[priest.parish_id] || 0
        : 0,
      email: person?.email || "-",
    };
  });

  return rows;
}

export function usePriestsReport() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["report", "priests"],
    queryFn: () => readAuthorizedReport(fetchPriests),
  });

  return {
    data: error ? [] : data ?? [],
    loading: isLoading,
    error,
    refetch,
    loadExportRows: fetchPriests,
  };
}
