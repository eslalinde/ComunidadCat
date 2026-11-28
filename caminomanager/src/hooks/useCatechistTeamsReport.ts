import { readAuthorizedReport } from "@/lib/reportAccess";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";

export interface CatechistTeamRow {
  diocese_name: string;
  parish_name: string;
  community_number: string;
  responsible_name: string;
  has_parish_llevan: string;
  parish_llevan: string;
}

async function fetchCatechistTeams(): Promise<CatechistTeamRow[]> {
  const supabase = createClient();

  // Fetch catechist teams (team_type_id = 3), excluding national team (community_id IS NULL)
  const { data: teamsData, error: teamsError } = await supabase
    .from("teams")
    .select(
      `
      id,
      community:communities!community_id(
        number,
        parish:parishes(
          name,
          diocese:dioceses(name, type)
        )
      ),
      belongs(
        is_responsible_for_the_team,
        person:people(person_name)
      )
    `
    )
    .eq("team_type_id", 3)
    .not("community_id", "is", null);

  if (teamsError) throw teamsError;

  // Fetch parish_teams for all teams
  const teamIds = teamsData?.map((t) => t.id) || [];
  const parishTeamsMap: Record<number, string[]> = {};

  if (teamIds.length > 0) {
    const { data: parishTeamsData, error: ptError } = await supabase
      .from("parish_teams")
      .select("team_id, parish:parishes(name)")
      .in("team_id", teamIds);

    if (ptError) throw ptError;

    for (const pt of parishTeamsData || []) {
      const parishName = (pt.parish as any)?.name || "";
      if (!parishTeamsMap[pt.team_id]) {
        parishTeamsMap[pt.team_id] = [];
      }
      if (parishName) {
        parishTeamsMap[pt.team_id].push(parishName);
      }
    }
  }

  // Process data: duplicate rows if a team carries more than one parish
  const rows: CatechistTeamRow[] = [];

  for (const team of teamsData || []) {
    const community = team.community as any;
    const parish = community?.parish;
    const diocese = parish?.diocese;

    const responsible = team.belongs?.find(
      (b: any) => b.is_responsible_for_the_team
    );

    const dioceseLabel = diocese
      ? `${diocese.type === "archdiocese" ? "Arquidiócesis" : "Diócesis"} de ${diocese.name}`
      : "N/A";

    const baseRow = {
      responsible_name:
        (responsible as any)?.person?.person_name || "Sin asignar",
      parish_name: parish?.name || "N/A",
      community_number: community?.number || "N/A",
      diocese_name: dioceseLabel,
    };

    const parishes = parishTeamsMap[team.id];
    if (parishes && parishes.length > 0) {
      for (const pName of parishes) {
        rows.push({ ...baseRow, has_parish_llevan: "Sí", parish_llevan: pName });
      }
    } else {
      rows.push({ ...baseRow, has_parish_llevan: "No", parish_llevan: "" });
    }
  }

  return rows;
}

export function useCatechistTeamsReport() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["report", "catechist-teams"],
    queryFn: () => readAuthorizedReport(fetchCatechistTeams),
  });

  return {
    data: error ? [] : data ?? [],
    loading: isLoading,
    error,
    refetch,
    loadExportRows: fetchCatechistTeams,
  };
}
