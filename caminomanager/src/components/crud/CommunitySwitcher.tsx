'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Church, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCommunitySwitcher } from '@/hooks/useCommunitySwitcher';
import {
  filterByText,
  getAdjacentCommunities,
  resolveParishSwitchTarget,
  type SwitcherParish,
} from '@/lib/communitySwitcher';
import { cn } from '@/lib/utils';
import type { Community } from '@/types/database';

/** Direction of the last switch, used to pick the entry animation. */
export type SwitchDirection = 'forward' | 'backward' | 'parish' | 'none';

interface CommunitySwitcherProps {
  communityId: number;
  community: Community | null | undefined;
  onNavigate: (communityId: number, direction: SwitchDirection) => void;
  /** Direction of the switch that led to the current community. */
  direction?: SwitchDirection;
}

const TITLE_ANIMATION: Record<SwitchDirection, string> = {
  forward: 'slide-in-from-right-6',
  backward: 'slide-in-from-left-6',
  parish: 'slide-in-from-bottom-3 zoom-in-95',
  none: 'slide-in-from-bottom-1',
};

export function CommunitySwitcher({
  communityId,
  community,
  onNavigate,
  direction = 'none',
}: CommunitySwitcherProps) {
  const { parishes, loading } = useCommunitySwitcher();
  const [communityOpen, setCommunityOpen] = useState(false);
  const [parishOpen, setParishOpen] = useState(false);

  const currentParish = useMemo(
    () =>
      parishes.find((p) => p.communities.some((c) => c.id === communityId)) ??
      parishes.find((p) => p.id === community?.parish_id) ??
      null,
    [parishes, communityId, community?.parish_id]
  );
  const currentEntry = currentParish?.communities.find((c) => c.id === communityId);

  // The switcher list updates instantly from the URL, so the header changes
  // before the detail query finishes loading.
  const number = currentEntry?.number ?? community?.number;
  const parishName = currentParish?.name ?? community?.parish?.name ?? 'Parroquia no especificada';

  const siblings = useMemo(() => currentParish?.communities ?? [], [currentParish]);
  const { previous, next } = getAdjacentCommunities(siblings, communityId);

  const goTo = (id: number, dir: SwitchDirection) => {
    if (id === communityId) return;
    onNavigate(id, dir);
  };

  const handleCommunitySelect = (id: number) => {
    setCommunityOpen(false);
    const targetIndex = siblings.findIndex((c) => c.id === id);
    const currentIndex = siblings.findIndex((c) => c.id === communityId);
    goTo(id, targetIndex < currentIndex ? 'backward' : 'forward');
  };

  const handleParishSelect = (parishId: number) => {
    setParishOpen(false);
    if (parishId === currentParish?.id) return;
    const parish = parishes.find((p) => p.id === parishId);
    if (!parish) return;

    const target = resolveParishSwitchTarget(parish, number);
    if (!target) {
      toast.error(`${parish.name} no tiene comunidades disponibles`);
      return;
    }
    if (!target.matchedNumber && number) {
      toast.info(`${parish.name} no tiene Comunidad ${number}`, {
        description: `Abriendo la Comunidad ${target.community.number}, la primera de la parroquia.`,
      });
    }
    goTo(target.community.id, 'parish');
  };

  const canSwitchCommunity = siblings.length > 1;
  const canSwitchParish = parishes.length > 1;
  const titleAnimation = cn(
    'inline-block animate-in fade-in duration-300 ease-out motion-reduce:animate-none',
    TITLE_ANIMATION[direction]
  );

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1">
        <h1 className="shrink-0 whitespace-nowrap text-2xl font-semibold tracking-tight text-foreground">
          {canSwitchCommunity ? (
            <SwitcherMenu
              open={communityOpen}
              onOpenChange={setCommunityOpen}
              triggerLabel={`Cambiar de comunidad (actual: Comunidad ${number ?? ''})`}
              triggerClassName="-ml-2 px-2 py-0.5"
              searchPlaceholder="Buscar comunidad..."
              heading={parishName}
              emptyText="No hay comunidades con ese número"
              items={siblings.map((c) => ({ id: c.id, label: `Comunidad ${c.number}` }))}
              selectedId={communityId}
              onSelect={handleCommunitySelect}
            >
              <span key={communityId} className={titleAnimation}>
                Comunidad {number || 'Cargando...'}
              </span>
            </SwitcherMenu>
          ) : (
            <span key={communityId} className={titleAnimation}>
              Comunidad {number || 'Cargando...'}
            </span>
          )}
        </h1>
        {canSwitchCommunity && (
          <div className="ml-1 flex items-center rounded-full border bg-background/60 p-0.5 shadow-xs">
            <StepButton
              label={previous ? `Comunidad anterior: ${previous.number}` : 'No hay comunidad anterior'}
              disabled={!previous}
              onClick={() => previous && goTo(previous.id, 'backward')}
            >
              <ChevronLeft className="h-4 w-4" />
            </StepButton>
            <StepButton
              label={next ? `Comunidad siguiente: ${next.number}` : 'No hay comunidad siguiente'}
              disabled={!next}
              onClick={() => next && goTo(next.id, 'forward')}
            >
              <ChevronRight className="h-4 w-4" />
            </StepButton>
          </div>
        )}
      </div>

      <div className="mt-1">
        {canSwitchParish ? (
          <SwitcherMenu
            open={parishOpen}
            onOpenChange={setParishOpen}
            triggerLabel={`Cambiar de parroquia (actual: ${parishName})`}
            triggerClassName="-ml-2 px-2 py-0.5 text-muted-foreground hover:text-foreground"
            searchPlaceholder="Buscar parroquia..."
            heading="Parroquias"
            emptyText="No se encontraron parroquias"
            items={parishes.map((p) => ({
              id: p.id,
              label: p.name,
              hint: parishHint(p, number),
            }))}
            selectedId={currentParish?.id ?? null}
            onSelect={handleParishSelect}
            icon={<Church className="h-4 w-4 shrink-0" />}
            wide
          >
            <span
              key={currentParish?.id ?? 'none'}
              className={cn(
                'inline-block animate-in fade-in duration-300 ease-out motion-reduce:animate-none',
                direction === 'parish' ? 'slide-in-from-bottom-2' : 'slide-in-from-bottom-1'
              )}
            >
              {parishName}
            </span>
          </SwitcherMenu>
        ) : (
          <p className="text-muted-foreground">
            {loading && !community ? 'Cargando...' : parishName}
          </p>
        )}
      </div>
    </div>
  );
}

function parishHint(parish: SwitcherParish, currentNumber: string | undefined): string {
  const count = parish.communities.length;
  const label = `${count} ${count === 1 ? 'comunidad' : 'comunidades'}`;
  if (!currentNumber) return label;
  const target = resolveParishSwitchTarget(parish, currentNumber);
  return target?.matchedNumber ? `${label} · tiene la ${currentNumber}` : label;
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-full p-1 text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground active:scale-90 disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}

interface SwitcherItem {
  id: number;
  label: string;
  hint?: string;
}

interface SwitcherMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerLabel: string;
  triggerClassName?: string;
  searchPlaceholder: string;
  heading: string;
  emptyText: string;
  items: SwitcherItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  icon?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}

const SEARCH_THRESHOLD = 6;
const MAX_STAGGERED_ITEMS = 12;

function SwitcherMenu({
  open,
  onOpenChange,
  triggerLabel,
  triggerClassName,
  searchPlaceholder,
  heading,
  emptyText,
  items,
  selectedId,
  onSelect,
  icon,
  wide,
  children,
}: SwitcherMenuProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const showSearch = items.length > SEARCH_THRESHOLD;

  const filtered = useMemo(() => filterByText(items, query, (i) => i.label), [items, query]);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setQuery('');
      setActiveIndex(Math.max(0, items.findIndex((i) => i.id === selectedId)));
    }
    onOpenChange(next);
  };

  // Keep the highlighted option visible while moving with the keyboard.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, open]);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (filtered.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % filtered.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = filtered[Math.min(activeIndex, filtered.length - 1)];
      if (item) onSelect(item.id);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={triggerLabel}
          className={cn(
            'group inline-flex max-w-full items-center gap-1.5 rounded-md text-left transition-colors duration-200 hover:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent',
            triggerClassName
          )}
        >
          {icon && <span className="opacity-70">{icon}</span>}
          {/* No overflow clipping: the number must always be visible and long
              parish names wrap instead of being cut off. */}
          <span className="min-w-0 break-words">{children}</span>
          <ChevronDown
            aria-hidden
            className="h-4 w-4 shrink-0 opacity-50 transition-all duration-300 group-hover:translate-y-0.5 group-hover:opacity-100 group-data-[state=open]:rotate-180 group-data-[state=open]:translate-y-0"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className={cn('p-0 duration-200', wide ? 'w-80' : 'w-64')}
        onKeyDown={handleKeyDown}
        onOpenAutoFocus={(event) => {
          if (!showSearch) {
            event.preventDefault();
            listRef.current?.focus();
          }
        }}
      >
        <div className="border-b px-3 py-2">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {heading}
          </p>
          {showSearch && (
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="h-8 w-full rounded-md border bg-background pl-8 pr-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring/40"
              />
            </div>
          )}
        </div>
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          aria-label={heading}
          className="max-h-72 overflow-y-auto p-1 outline-none"
        >
          {filtered.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground animate-in fade-in">
              {emptyText}
            </li>
          )}
          {filtered.map((item, index) => {
            const selected = item.id === selectedId;
            const active = index === activeIndex;
            return (
              <li
                key={item.id}
                role="option"
                aria-selected={selected}
                data-index={index}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => onSelect(item.id)}
                style={{ animationDelay: `${Math.min(index, MAX_STAGGERED_ITEMS) * 18}ms` }}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors duration-150',
                  'animate-in fade-in slide-in-from-left-1 fill-mode-backwards duration-200 motion-reduce:animate-none',
                  active && 'bg-accent text-accent-foreground',
                  selected && 'font-semibold text-primary'
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{item.label}</span>
                  {item.hint && (
                    <span className="block truncate text-xs font-normal text-muted-foreground">
                      {item.hint}
                    </span>
                  )}
                </span>
                {selected && <Check className="h-4 w-4 shrink-0 animate-in zoom-in-50 duration-300" />}
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
