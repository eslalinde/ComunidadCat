import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Community } from '@/types/database';
import { Edit } from 'lucide-react';
import { formatLocalDate, yearsSince } from '@/lib/dates';

interface CommunityInfoProps {
  community: Community | null;
  loading?: boolean;
  onEdit?: () => void;
}

export function CommunityInfo({ community, loading, onEdit }: CommunityInfoProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cargando información...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!community) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Información de la Comunidad</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No se encontró información de la comunidad</p>
        </CardContent>
      </Card>
    );
  }

  // Construir label del equipo de catequistas asignado
  const catechistTeamLabel = (() => {
    const team = community?.cathechist_team as any;
    if (!team) return null;

    const responsibles = (team.belongs || [])
      .filter((b: any) => b.is_responsible_for_the_team)
      .map((b: any) => b.person?.person_name)
      .filter(Boolean);

    const parishes = (team.parish_teams || [])
      .map((pt: any) => pt.parish?.name)
      .filter(Boolean);

    const parts: string[] = [];
    if (responsibles.length > 0) parts.push(responsibles.join(', '));
    if (parishes.length > 0) parts.push(parishes.join(', '));

    return parts.length > 0 ? parts.join(' - ') : team.name;
  })();

  const formatDate = (dateString?: string) => formatLocalDate(dateString);
  const calculateYears = (dateString?: string) => yearsSince(dateString) ?? '';

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Información de la Comunidad</CardTitle>
          {onEdit && (
            <Button
              variant="outline"
              onClick={onEdit}
              className="flex items-center gap-2 print-hidden"
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha de Nacimiento</label>
            <p className="text-sm text-gray-700">
              {formatDate(community.born_date)}
              {community.born_date && (
                <span className="ml-2 text-xs text-gray-500">
                  ({calculateYears(community.born_date)} años)
                </span>
              )}
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hermanos Iniciales</label>
            <p className="text-sm text-gray-700">{community.born_brothers || 'No especificado'}</p>
          </div>

          <div />

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Etapa Actual</label>
            <p className="text-sm text-gray-700">{community.step_way?.name || 'No especificada'}</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha Última Etapa</label>
            <p className="text-sm text-gray-700">{formatDate(community.last_step_way_date)}</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hermanos Actuales</label>
            <p className="text-sm font-semibold text-gray-700">{community.actual_brothers || 'No especificado'}</p>
          </div>

          <div className="space-y-1 col-span-3">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Equipo de Catequistas</label>
            <p className="text-sm text-gray-700">{catechistTeamLabel || 'No asignado'}</p>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
