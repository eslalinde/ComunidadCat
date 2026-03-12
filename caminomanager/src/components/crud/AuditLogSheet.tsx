'use client';

import { useState } from 'react';
import { History, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuditLog, AuditFilters } from '@/hooks/useAuditLog';
import { AuditLog } from '@/types/database';
import {
  formatAuditEntry,
  getTableLabel,
  type AuditColor,
  type ChangeDetail,
  type PersonNames,
  type TeamNames,
} from '@/lib/auditMessages';

// ── Dot color mapping ──

const DOT_COLORS: Record<AuditColor, string> = {
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  red: 'bg-red-500',
};

// ── AuditLogEntry ──

function AuditLogEntry({
  entry,
  isLast,
  personNames,
  teamNames,
}: {
  entry: AuditLog;
  isLast: boolean;
  personNames: PersonNames;
  teamNames: TeamNames;
}) {
  const [expanded, setExpanded] = useState(false);
  const formatted = formatAuditEntry(entry, personNames, teamNames);
  const hasDetails = formatted.details.length > 0;

  return (
    <div className="relative flex gap-3 pb-4 last:pb-0">
      {/* Vertical line + dot */}
      <div className="flex flex-col items-center">
        <div
          className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${DOT_COLORS[formatted.color]}`}
        />
        {!isLast && <div className="w-px flex-1 bg-gray-200 mt-1" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {/* Actor + time */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-[10px] font-medium text-gray-600 shrink-0">
                {getInitials(formatted.actorName)}
              </span>
              <span className="text-xs font-medium text-gray-700 truncate">
                {formatted.actorName}
              </span>
              <span className="text-xs text-gray-400 shrink-0">
                {formatted.relativeTime}
              </span>
            </div>

            {/* Message */}
            <p className="text-sm text-gray-900 mt-1">{formatted.message}</p>

            {/* Section badge */}
            <span className="inline-block text-[10px] text-gray-400 mt-0.5">
              {getTableLabel(entry.table_name)}
            </span>
          </div>

          {/* Expand button for UPDATEs with details */}
          {hasDetails && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 -mt-1 h-6 w-6 p-0"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </Button>
          )}
        </div>

        {/* Expandable change details */}
        {hasDetails && expanded && (
          <div className="mt-2 space-y-1 text-xs bg-gray-50 rounded-md p-2">
            {formatted.details.map((d: ChangeDetail, i: number) => (
              <div key={i} className="flex flex-wrap gap-1">
                <span className="font-medium text-gray-600">{d.label}:</span>
                <span className="text-red-500 line-through">{d.oldValue}</span>
                <span className="text-gray-400">&rarr;</span>
                <span className="text-green-600">{d.newValue}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('');
}

// ── AuditLogTimeline ──

function AuditLogTimeline({
  entries,
  isLoading,
  hasMore,
  onLoadMore,
  personNames,
  teamNames,
}: {
  entries: AuditLog[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  personNames: PersonNames;
  teamNames: TeamNames;
}) {
  if (isLoading && entries.length === 0) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-200 mt-1.5 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-2/3" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <History className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No hay actividad registrada</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {entries.map((entry, index) => (
        <AuditLogEntry
          key={entry.id}
          entry={entry}
          isLast={index === entries.length - 1}
          personNames={personNames}
          teamNames={teamNames}
        />
      ))}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoading}
            className="text-xs text-gray-500"
          >
            {isLoading ? 'Cargando...' : 'Cargar mas'}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Filter options ──

const OPERATION_OPTIONS = [
  { value: '__all__', label: 'Todos' },
  { value: 'INSERT', label: 'Creaciones' },
  { value: 'UPDATE', label: 'Modificaciones' },
  { value: 'DELETE', label: 'Eliminaciones' },
];

const TABLE_OPTIONS = [
  { value: '__all__', label: 'Todas' },
  { value: 'communities', label: 'Comunidad' },
  { value: 'teams', label: 'Equipos' },
  { value: 'brothers', label: 'Hermanos' },
  { value: 'belongs', label: 'Miembros de equipo' },
  { value: 'community_step_log', label: 'Bitacora' },
];

// ── AuditLogSheet ──

export function AuditLogSheet({ communityId }: { communityId: number }) {
  const [open, setOpen] = useState(false);
  const { entries, isLoading, hasMore, filters, updateFilters, loadMore, personNames, teamNames } =
    useAuditLog(communityId, open);

  const handleOperationChange = (value: string) => {
    const newFilters: AuditFilters = {
      ...filters,
      operation: value === '__all__' ? undefined : value,
    };
    updateFilters(newFilters);
  };

  const handleTableChange = (value: string) => {
    const newFilters: AuditFilters = {
      ...filters,
      table: value === '__all__' ? undefined : value,
    };
    updateFilters(newFilters);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">Historial</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-lg w-full flex flex-col">
        <SheetHeader>
          <SheetTitle>Historial de Cambios</SheetTitle>
        </SheetHeader>

        {/* Filters */}
        <div className="flex gap-2 px-4">
          <Select
            value={filters.operation || '__all__'}
            onValueChange={handleOperationChange}
          >
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {OPERATION_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.table || '__all__'}
            onValueChange={handleTableChange}
          >
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="Seccion" />
            </SelectTrigger>
            <SelectContent>
              {TABLE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <AuditLogTimeline
            entries={entries}
            isLoading={isLoading}
            hasMore={hasMore}
            onLoadMore={loadMore}
            personNames={personNames}
            teamNames={teamNames}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
