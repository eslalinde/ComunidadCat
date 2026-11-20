import { describe, it, expect } from 'vitest';
import {
  compareCommunityNumbers,
  filterByText,
  getAdjacentCommunities,
  groupCommunitiesByParish,
  resolveParishSwitchTarget,
  type SwitcherRow,
} from '@/lib/communitySwitcher';

const rows: SwitcherRow[] = [
  { id: 1, number: '10', parish_id: 1, parish: { id: 1, name: 'Santa María' } },
  { id: 2, number: '2', parish_id: 1, parish: { id: 1, name: 'Santa María' } },
  { id: 3, number: '1', parish_id: 1, parish: { id: 1, name: 'Santa María' } },
  { id: 4, number: '3', parish_id: 2, parish: { id: 2, name: 'Ángeles Custodios' } },
  { id: 5, number: '1', parish_id: 2, parish: { id: 2, name: 'Ángeles Custodios' } },
  { id: 6, number: '7', parish_id: null, parish: null },
];

describe('groupCommunitiesByParish', () => {
  it('groups by parish, sorts parishes by name and communities naturally by number', () => {
    const parishes = groupCommunitiesByParish(rows);
    expect(parishes.map((p) => p.name)).toEqual(['Ángeles Custodios', 'Santa María']);
    expect(parishes[1].communities.map((c) => c.number)).toEqual(['1', '2', '10']);
  });

  it('skips communities without a parish and names unnamed parishes', () => {
    const parishes = groupCommunitiesByParish([
      ...rows,
      { id: 9, number: '1', parish_id: 3, parish: { id: 3, name: null } },
    ]);
    expect(parishes.flatMap((p) => p.communities).some((c) => c.id === 6)).toBe(false);
    expect(parishes.find((p) => p.id === 3)?.name).toBe('Parroquia sin nombre');
  });
});

describe('resolveParishSwitchTarget', () => {
  const [angeles, santaMaria] = groupCommunitiesByParish(rows);

  it('keeps the same community number when the new parish has it', () => {
    expect(resolveParishSwitchTarget(angeles, '1')).toEqual({
      community: expect.objectContaining({ id: 5 }),
      matchedNumber: true,
    });
  });

  it('falls back to the first community when the number does not exist', () => {
    expect(resolveParishSwitchTarget(santaMaria, '3')).toEqual({
      community: expect.objectContaining({ id: 3, number: '1' }),
      matchedNumber: false,
    });
  });

  it('returns null for a parish without communities', () => {
    expect(resolveParishSwitchTarget({ id: 9, name: 'Vacía', communities: [] }, '1')).toBeNull();
  });
});

describe('getAdjacentCommunities', () => {
  const santaMaria = groupCommunitiesByParish(rows)[1].communities;

  it('returns neighbours in number order', () => {
    expect(getAdjacentCommunities(santaMaria, 2)).toEqual({
      previous: expect.objectContaining({ id: 3 }),
      next: expect.objectContaining({ id: 1 }),
    });
  });

  it('returns nulls at the edges and for unknown ids', () => {
    expect(getAdjacentCommunities(santaMaria, 3).previous).toBeNull();
    expect(getAdjacentCommunities(santaMaria, 1).next).toBeNull();
    expect(getAdjacentCommunities(santaMaria, 99)).toEqual({ previous: null, next: null });
  });
});

describe('helpers', () => {
  it('compares community numbers naturally', () => {
    expect(compareCommunityNumbers('2', '10')).toBeLessThan(0);
  });

  it('filters ignoring accents and case', () => {
    const items = ['Ángeles Custodios', 'Santa María'];
    expect(filterByText(items, 'angeles', (s) => s)).toEqual(['Ángeles Custodios']);
    expect(filterByText(items, '  ', (s) => s)).toEqual(items);
  });
});
