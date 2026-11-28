import { expect, it } from 'vitest';
import { escapeCSVCell } from '@/lib/csvCell';

it.each(['=1', ' +1', '-2', '@nombre', '\uFEFF＝1', '\u200B=1', '\ttexto', '\rtexto'])(
  'conserva como texto los prefijos especiales de una celda', (value) => {
    expect(escapeCSVCell(value, true)).toBe(`"'${value}"`);
  },
);

it('preserva números, texto con comillas y celdas vacías', () => {
  expect(escapeCSVCell(-2)).toBe('-2');
  expect(escapeCSVCell('A, "B"')).toBe('"A, ""B"""');
  expect(escapeCSVCell(null)).toBe('');
});
