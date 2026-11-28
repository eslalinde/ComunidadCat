import { describe, expect, it } from 'vitest';
import { getSafeRedirectPath, routes } from './routes';

describe('getSafeRedirectPath', () => {
  it.each([
    ['/comunidades/detalle?id=10', '/comunidades/detalle?id=10'],
    ['/reportes#tabla', '/reportes#tabla'],
    ['/', '/'],
  ])('conserva rutas internas %s', (input, expected) => {
    expect(getSafeRedirectPath(input)).toBe(expected);
  });

  it.each([
    null,
    undefined,
    '',
    'https://evil.example/phish',
    '//evil.example',
    '/\\evil.example',
    '\\\\evil.example',
    'javascript:alert(1)',
    '/\t/evil.example',
    '/.//evil.example',
    '/a/..//evil.example',
    '/%2e//evil.example',
    'comunidades',
  ])('rechaza destinos externos o inválidos: %s', (input) => {
    expect(getSafeRedirectPath(input)).toBe(routes.home);
  });

  it('usa el fallback indicado', () => {
    expect(getSafeRedirectPath('https://evil.example', routes.login)).toBe(routes.login);
  });
});
