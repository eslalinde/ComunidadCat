import { normalizeText } from '@/lib/utils';

/** Minimal community row used by the in-page parish/community switcher. */
export interface SwitcherCommunity {
  id: number;
  number: string;
  parish_id: number | null;
}

export interface SwitcherParish {
  id: number;
  name: string;
  communities: SwitcherCommunity[];
}

export interface SwitcherRow {
  id: number;
  number: string | null;
  parish_id: number | null;
  parish?: { id: number; name: string | null } | null;
}

const numberCollator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

/** Natural order for community numbers ("2" before "10", "1A" after "1"). */
export function compareCommunityNumbers(a: string, b: string): number {
  return numberCollator.compare(a, b);
}

/**
 * Groups visible communities by parish. Parishes are sorted by name and their
 * communities by number. Communities without a parish are left out because the
 * switcher navigates parish by parish.
 */
export function groupCommunitiesByParish(rows: SwitcherRow[]): SwitcherParish[] {
  const byParish = new Map<number, SwitcherParish>();

  for (const row of rows) {
    if (row.parish_id == null) continue;
    let parish = byParish.get(row.parish_id);
    if (!parish) {
      parish = {
        id: row.parish_id,
        name: row.parish?.name?.trim() || 'Parroquia sin nombre',
        communities: [],
      };
      byParish.set(row.parish_id, parish);
    }
    parish.communities.push({
      id: row.id,
      number: row.number ?? '',
      parish_id: row.parish_id,
    });
  }

  const parishes = Array.from(byParish.values());
  for (const parish of parishes) {
    parish.communities.sort((a, b) => compareCommunityNumbers(a.number, b.number));
  }
  return parishes.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}

export interface ParishSwitchTarget {
  community: SwitcherCommunity;
  /** True when the new parish has a community with the same number. */
  matchedNumber: boolean;
}

/**
 * Picks the community to open after switching parish: the one with the same
 * number when it exists, otherwise the first community of the parish.
 */
export function resolveParishSwitchTarget(
  parish: SwitcherParish,
  currentNumber: string | null | undefined
): ParishSwitchTarget | null {
  if (parish.communities.length === 0) return null;

  if (currentNumber) {
    const wanted = normalizeText(currentNumber.trim());
    const match = parish.communities.find((c) => normalizeText(c.number.trim()) === wanted);
    if (match) return { community: match, matchedNumber: true };
  }

  return { community: parish.communities[0], matchedNumber: false };
}

/** Returns the previous and next communities around the current one. */
export function getAdjacentCommunities(
  communities: SwitcherCommunity[],
  currentId: number
): { previous: SwitcherCommunity | null; next: SwitcherCommunity | null } {
  const index = communities.findIndex((c) => c.id === currentId);
  if (index === -1) return { previous: null, next: null };
  return {
    previous: index > 0 ? communities[index - 1] : null,
    next: index < communities.length - 1 ? communities[index + 1] : null,
  };
}

/** Accent- and case-insensitive filter used by the switcher search boxes. */
export function filterByText<T>(items: T[], query: string, getText: (item: T) => string): T[] {
  const needle = normalizeText(query.trim());
  if (!needle) return items;
  return items.filter((item) => normalizeText(getText(item)).includes(needle));
}
