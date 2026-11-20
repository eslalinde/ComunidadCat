import { expect, it } from 'vitest';
import { getUpdatePublisher } from '../../../electron/updatePublisher';

it('exige una única identidad del editor en la configuración instalada', () => {
  const dn = 'CN=ComunidadCat, O=ComunidadCat';
  expect(getUpdatePublisher('publisherName:\n  - ' + dn)).toBe(dn);
  for (const config of ['provider: github', 'publisherName: []', 'publisherName: ComunidadCat',
    'publisherName: [CN=one, CN=two]']) {
    expect(getUpdatePublisher(config)).toBeUndefined();
  }
});
