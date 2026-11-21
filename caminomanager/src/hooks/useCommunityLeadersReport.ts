import { readAuthorizedReport } from "@/lib/reportAccess";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";

export interface CommunityLeaderRow {
  community_id: number;
  diocese_name: string;
  diocese_type: string;
  parish_name: string;
  community_number: string;
  step_way_name: string;
  step_way_order: number;
  catechist_team_name: string;
  responsible_name: string;
  catechists: string;
  catechist_count: number;
  presbyters: string;
  presbyter_count: number;
  itinerants: string;
  itinerant_count: number;
  seminarians: string;
  seminarian_count: number;
  nuns: string;
  nun_count: number;
  brothers_count: number;
}

async function fetchCommunityLeaders(): Promise<CommunityLeaderRow[]> {
  const supabase = createClient();

  // Fetch communities with all related data
  const [communitiesResult, priestsResult] = await Promise.all([
    supabase
      .from("communities")
      .select(
        `
        id,
        number,
        parish:parishes(
          id,
          name,
          diocese:dioceses(name, type)
        ),
        step_way:step_ways(name, order_num),
        cathechist_team:teams!cathechist_team_id(
          id,
          name,
          team_type:team_types(name),
          belongs(
            is_responsible_for_the_team,
            person:people(person_name, person_type_id)
          )
        ),
        brothers(
          person:people(person_name, person_type_id, is_itinerante)
        ),
        teams!community_id(
          id,
          team_type_id,
          team_type:team_types(name),
          belongs(
            person:people(person_name, person_type_id)
          )
        )
      `
      )
      .order("id"),
    supabase
      .from("priests")
      .select(
        `
        parish_id,
        person:people(person_name)
      `
      ),
  ]);

  if (communitiesResult.error) throw communitiesResult.error;
  if (priestsResult.error) throw priestsResult.error;

  // Build a map of parish_id -> presbyter names
  const presbytersByParish: Record<number, string[]> = {};
  for (const priest of priestsResult.data || []) {
    const parishId = priest.parish_id;
    const name = (priest.person as any)?.person_name;
    if (parishId && name) {
      if (!presbytersByParish[parishId]) {
        presbytersByParish[parishId] = [];
      }
      presbytersByParish[parishId].push(name);
    }
  }

  const rows: CommunityLeaderRow[] = [];

  for (const community of communitiesResult.data || []) {
    const parish = community.parish as any;
    const diocese = parish?.diocese;
    const stepWay = community.step_way as any;
    const catechistTeam = community.cathechist_team as any;

    // Diocese info
    const dioceseType = diocese?.type || "";
    const dioceseName = diocese
      ? `${diocese.type === "archdiocese" ? "Arquidiócesis" : "Diócesis"} de ${diocese.name}`
      : "N/A";

    // Catechist team info
    const catechistTeamName = catechistTeam?.name || "N/A";
    const catechistBelongs = catechistTeam?.belongs || [];

    const responsible = catechistBelongs.find(
      (b: any) => b.is_responsible_for_the_team
    );
    const responsibleName =
      (responsible as any)?.person?.person_name || "Sin asignar";

    const catechistNames = catechistBelongs
      .map((b: any) => b.person?.person_name)
      .filter(Boolean);

    // Presbyters from parish
    const parishId = parish?.id;
    const presbyterNames = parishId
      ? presbytersByParish[parishId] || []
      : [];

    // Itinerants (team_type_id = 2)
    const itinerantTeams = (community.teams || []).filter(
      (t: any) => t.team_type_id === 2
    );
    const itinerantNames: string[] = [];
    for (const team of itinerantTeams) {
      for (const b of (team as any).belongs || []) {
        const name = b.person?.person_name;
        if (name) itinerantNames.push(name);
      }
    }

    // From brothers: seminarians (person_type_id=4), nuns (person_type_id=6)
    const brothers = community.brothers || [];
    const seminarians: string[] = [];
    const nuns: string[] = [];

    for (const brother of brothers) {
      const person = (brother as any).person;
      if (!person) continue;
      if (person.person_type_id === 4) {
        seminarians.push(person.person_name);
      } else if (person.person_type_id === 6) {
        nuns.push(person.person_name);
      }
      if (person.is_itinerante === true) {
        itinerantNames.push(person.person_name);
      }
    }

    rows.push({
      community_id: community.id!,
      diocese_name: dioceseName,
      diocese_type: dioceseType,
      parish_name: parish?.name || "N/A",
      community_number: community.number,
      step_way_name: stepWay?.name || "N/A",
      step_way_order: stepWay?.order_num || 0,
      catechist_team_name: catechistTeamName,
      responsible_name: responsibleName,
      catechists: catechistNames.join(", "),
      catechist_count: catechistNames.length,
      presbyters: presbyterNames.join(", "),
      presbyter_count: presbyterNames.length,
      itinerants: itinerantNames.join(", "),
      itinerant_count: itinerantNames.length,
      seminarians: seminarians.join(", "),
      seminarian_count: seminarians.length,
      nuns: nuns.join(", "),
      nun_count: nuns.length,
      brothers_count: brothers.length,
    });
  }

  return rows;
}

export function useCommunityLeadersReport() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["report", "community-leaders"],
    queryFn: () => readAuthorizedReport(fetchCommunityLeaders),
  });

  return {
    data: error ? [] : data ?? [],
    loading: isLoading,
    error,
    refetch,
    loadExportRows: fetchCommunityLeaders,
  };
}
