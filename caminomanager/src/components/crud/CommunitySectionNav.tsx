'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export interface CommunitySection {
  id: string;
  label: string;
}

/**
 * Sticky jump bar for the long, stacked community detail page on phones.
 * Desktop shows both columns side by side, so it renders nothing there.
 */
// Sticky header (4rem) + this bar (~3.3rem) + a little slack.
const ACTIVE_OFFSET_PX = 140;

export function CommunitySectionNav({ sections }: { sections: CommunitySection[] }) {
  const isMobile = useIsMobile();
  const [activeId, setActiveId] = useState<string | null>(sections[0]?.id ?? null);
  const listRef = useRef<HTMLUListElement>(null);

  // Callers rebuild the array each render; key the observer on the ids.
  const sectionIds = sections.map((section) => section.id).join('|');

  // Scroll spy: the current section is the last one whose top has passed
  // the sticky header + this bar.
  useEffect(() => {
    if (!isMobile) return;
    const ids = sectionIds.split('|');
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = ids[0];
      for (const id of ids) {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top <= ACTIVE_OFFSET_PX) current = id;
      }
      // At the very bottom the last sections may never reach the offset.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      setActiveId(atBottom ? ids[ids.length - 1] : current);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [isMobile, sectionIds]);

  // Keep the active chip visible inside the horizontally scrolling bar.
  useEffect(() => {
    if (!activeId || !listRef.current) return;
    const list = listRef.current;
    const chip = list.querySelector<HTMLElement>(`[data-section="${activeId}"]`);
    if (!chip) return;
    const left = chip.offsetLeft; // relative to the list (it is position: relative)
    const right = left + chip.offsetWidth;
    if (left < list.scrollLeft || right > list.scrollLeft + list.clientWidth) {
      list.scrollTo({ left: Math.max(0, left - 16) });
    }
  }, [activeId]);

  if (!isMobile || sections.length < 2) return null;

  const jumpTo = (id: string) => {
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav
      aria-label="Secciones de la comunidad"
      className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-30 -mx-4 border-b bg-background/95 px-4 py-2 backdrop-blur print:hidden"
    >
      <ul ref={listRef} className="relative flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map((section) => {
          const active = section.id === activeId;
          return (
            <li key={section.id} className="shrink-0" data-section={section.id}>
              <button
                type="button"
                onClick={() => jumpTo(section.id)}
                aria-current={active ? 'location' : undefined}
                className={cn(
                  'min-h-9 rounded-full border px-3.5 text-sm font-medium touch-manipulation transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground active:bg-muted',
                )}
              >
                {section.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
