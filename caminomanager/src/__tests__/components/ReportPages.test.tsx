import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Catechesis from '@/app/(main)/(protected)/reportes/catequesis-parroquia/page';
import Leaders from '@/app/(main)/(protected)/reportes/lideres-comunidades/page';
import Priests from '@/app/(main)/(protected)/reportes/presbiteros/page';
import Teams from '@/app/(main)/(protected)/reportes/equipos-catequistas/page';
const mocks = vi.hoisted(() => ({ refresh: vi.fn(), dates: vi.fn(), loading: false }));
vi.mock('@/hooks/useParishCatechesisReport', () => ({ useParishCatechesisReport: (start: string, end: string) => { mocks.dates(start, end); return { data: [{ diocese_name: 'Central', parish_name: 'San José', city_name: 'Bogotá', zone_name: 'Norte', planned_start_date: '2026-01-02', actual_start_date: '2026-01-03', birth_retreat_date: '', attendance_count: 20, catechist_team: 'Juan y Ana' }], loading: mocks.loading, refetch: mocks.refresh }; } }));
vi.mock('@/hooks/useCommunityLeadersReport', () => ({ useCommunityLeadersReport: () => ({ data: [{ community_id: 1, diocese_name: 'Central', parish_name: 'San José', community_number: '7', step_way_name: 'Inicio', responsible_name: 'Juan', catechists: 'Ana', catechist_count: 1, presbyters: '', presbyter_count: 0, itinerants: 'Pedro', itinerant_count: 1, seminarians: '', seminarian_count: 0, nuns: 'María', nun_count: 1, brothers_count: 20 }], loading: mocks.loading, refetch: mocks.refresh }) }));
vi.mock('@/hooks/usePriestsReport', () => ({ usePriestsReport: () => ({ data: [{ priest_name: 'Padre José', is_parish_priest: 'Párroco', parish_name: 'San José', diocese: 'Central', city_name: 'Bogotá', communities_count: 2, phone: '123', mobile: '300', email: 'p@example.com' }, { priest_name: 'Padre Juan', is_parish_priest: 'Vicario', parish_name: '', diocese: '', city_name: '', communities_count: 0, phone: '', mobile: '', email: '' }], loading: mocks.loading, refetch: mocks.refresh }) }));
vi.mock('@/hooks/useCatechistTeamsReport', () => ({ useCatechistTeamsReport: () => ({ data: [{ diocese_name: 'Central', parish_name: 'San José', community_number: '7', responsible_name: 'Juan y Ana', has_parish_llevan: 'Sí', parish_llevan: 'San Pedro' }, { diocese_name: 'Central', parish_name: 'San José', community_number: '8', responsible_name: '', has_parish_llevan: 'No', parish_llevan: '' }], loading: mocks.loading, refetch: mocks.refresh }) }));
beforeEach(() => { vi.clearAllMocks(); mocks.loading = false; }); afterEach(cleanup);
it.each([{ Page: Catechesis, title: 'Catequesis por Parroquia', value: 'Juan y Ana' }, { Page: Leaders, title: 'Responsables de Comunidades', value: 'Juan' }, { Page: Priests, title: 'Presbíteros', value: 'Padre José' }, { Page: Teams, title: 'Equipos de Catequistas', value: 'Juan y Ana' }])('integra columnas, agrupaciones y actualización: $title', ({ Page, title, value }) => {
  render(<Page />); expect(screen.getByRole('heading', { name: title })).toBeVisible();
  if (screen.queryByText('Limpiar', { selector: 'button' })) fireEvent.click(screen.getByText('Limpiar', { selector: 'button' }));
  expect(screen.getByText(value)).toBeVisible(); fireEvent.click(screen.getByRole('button', { name: 'Actualizar' })); expect(mocks.refresh).toHaveBeenCalledOnce();
  const group = screen.queryByRole('option', { name: '+ Agregar agrupación' });
  if (group) {
    const select = group.parentElement!; const option = within(select).getAllByRole('option')[1] as HTMLOptionElement;
    fireEvent.change(select, { target: { value: option.value } }); expect(screen.getByText('Limpiar', { selector: 'button' })).toBeVisible();
    fireEvent.click(screen.getByText('Limpiar', { selector: 'button' })); expect(screen.getByText(value)).toBeVisible();
  }
});
it('envía rango de fechas actualizado al reporte de catequesis', () => { render(<Catechesis />); fireEvent.change(screen.getByLabelText('Desde:'), { target: { value: '2026-01-01' } }); fireEvent.change(screen.getByLabelText('Hasta:'), { target: { value: '2026-12-31' } }); expect(mocks.dates).toHaveBeenLastCalledWith('2026-01-01', '2026-12-31'); });
