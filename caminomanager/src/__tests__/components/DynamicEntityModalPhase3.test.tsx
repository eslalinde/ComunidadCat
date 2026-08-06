import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DynamicEntityModal } from '@/components/crud/DynamicEntityModal';
import {
  cityConfig,
  communityConfig,
  parishConfig,
  personConfig,
  stateConfig,
} from '@/config/entities';
import type { City, Community, Parish, Person } from '@/types/database';

const countries = [
  { value: 1, label: 'Colombia' },
  { value: 2, label: 'Ecuador' },
];

vi.stubGlobal(
  'ResizeObserver',
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

vi.mock('@/hooks/useEntityOptions', () => ({
  useCountryOptions: () => ({ options: countries, loading: false }),
  useStateOptions: (countryId?: number) => ({
    options:
      countryId === 1
        ? [{ value: 10, label: 'Antioquia' }]
        : countryId === 2
          ? [{ value: 20, label: 'Pichincha' }]
          : [],
    loading: false,
  }),
  useCityOptions: () => ({ options: [], loading: false }),
  useAllCityOptions: () => ({ options: [], loading: false }),
  useZoneOptions: () => ({ options: [], loading: false }),
  useDioceseOptions: () => ({ options: [], loading: false }),
  useParishOptions: () => ({ options: [], loading: false }),
  useAllParishOptions: () => ({ options: [], loading: false }),
  usePeopleOptions: () => ({ options: [], loading: false }),
  useCathechistTeamOptions: () => ({ options: [], loading: false }),
  useEntityOptions: () => ({ options: [], loading: false }),
}));

describe('piloto ReUI del formulario de Ciudades', () => {
  it('limita el Autocomplete al piloto de Ciudades', () => {
    expect(cityConfig.fields.find((field) => field.name === 'country_id')?.searchable).toBe(true);
    expect(cityConfig.fields.find((field) => field.name === 'state_id')?.searchable).toBe(true);
    expect(stateConfig.fields.find((field) => field.name === 'country_id')?.searchable).not.toBe(true);
  });

  it('selecciona país y departamento dependiente y guarda valores normalizados', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <DynamicEntityModal<City>
        open
        onClose={vi.fn()}
        onSave={onSave}
        fields={cityConfig.fields}
        title="Agregar ciudad"
      />
    );

    const country = screen.getByRole('combobox', { name: /País/ });
    const state = screen.getByRole('combobox', { name: /Departamento/ });
    expect(state).toBeDisabled();

    await user.click(country);
    await user.type(country, 'col');
    await user.keyboard('{ArrowDown}{Enter}');

    expect(country).toHaveValue('Colombia');
    expect(state).not.toBeDisabled();

    await user.click(state);
    await user.type(state, 'anti');
    await user.keyboard('{ArrowDown}{Enter}');
    await user.type(screen.getByRole('textbox', { name: /Nombre/ }), 'Medellín');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Medellín',
          country_id: 1,
          state_id: 10,
        })
      );
    });
  });
});

describe('formularios complejos con ReUI', () => {
  it('habilita búsqueda en todas las relaciones de persona, comunidad y parroquia', () => {
    const searchableFields = (config: { fields: typeof personConfig.fields }) =>
      config.fields
        .filter((field) => field.type === 'select' && field.name.endsWith('_id'))
        .filter((field) => field.searchable)
        .map((field) => field.name);

    expect(searchableFields(personConfig)).toEqual(
      expect.arrayContaining([
        'location_country_id',
        'location_city_id',
        'spouse_id',
      ]),
    );
    expect(searchableFields(communityConfig)).toEqual(
      expect.arrayContaining([
        'parish_id',
        'step_way_id',
        'cathechist_team_id',
      ]),
    );
    expect(searchableFields(parishConfig)).toEqual(
      expect.arrayContaining(['diocese_id', 'city_id', 'zone_id']),
    );
  });

  it('estructura el formulario de parroquia por secciones dentro de un diálogo', () => {
    render(
      <DynamicEntityModal<Parish>
        open
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        fields={parishConfig.fields}
        title="Agregar parroquia"
      />,
    );

    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByText('Información parroquial')).toBeVisible();
    expect(screen.getByText('Ubicación')).toBeVisible();
    expect(screen.getByRole('combobox', { name: /Diócesis/ })).toBeVisible();
    expect(screen.getByRole('combobox', { name: /Ciudad/ })).toBeVisible();
  });

  it('activa y encadena la ubicación de una persona itinerante', async () => {
    const user = userEvent.setup();
    render(
      <DynamicEntityModal<Person>
        open
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        fields={personConfig.fields}
        title="Agregar persona"
      />,
    );

    expect(
      screen.queryByRole('combobox', { name: /País donde se encuentra/ }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Itinerante' }));

    const locationCountry = screen.getByRole('combobox', {
      name: /País donde se encuentra/,
    });
    const locationCity = screen.getByRole('combobox', {
      name: /Ciudad donde se encuentra/,
    });
    expect(locationCity).toBeDisabled();

    await user.click(locationCountry);
    await user.type(locationCountry, 'col');
    await user.keyboard('{ArrowDown}{Enter}');

    expect(locationCountry).toHaveValue('Colombia');
    expect(locationCity).not.toBeDisabled();
  });

  it('renderiza las relaciones buscables de comunidad', () => {
    render(
      <DynamicEntityModal<Community>
        open
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        fields={communityConfig.fields}
        title="Agregar comunidad"
        size={communityConfig.formSize}
      />,
    );

    expect(screen.getByRole('dialog')).toHaveClass('sm:max-w-3xl');
    expect(screen.queryByText('Identificación')).not.toBeInTheDocument();
    expect(screen.queryByText('Progreso en el Camino')).not.toBeInTheDocument();
    expect(screen.queryByText('Acompañamiento')).not.toBeInTheDocument();
    const parish = screen.getByRole('combobox', { name: /Parroquia/ });
    expect(parish).toBeVisible();
    expect(parish.closest('[data-slot="form-item"]')).toHaveClass('sm:col-span-2');
    expect(screen.getByRole('combobox', { name: /Etapa Actual/ })).toBeVisible();
    const catechistTeam = screen.getByRole('combobox', {
      name: /Equipo de Catequistas/,
    });
    expect(catechistTeam).toBeVisible();
    expect(catechistTeam.closest('[data-slot="form-item"]')).toHaveClass(
      'sm:col-span-2',
    );

    const footer = screen.getByRole('button', { name: 'Guardar' }).parentElement;
    expect(footer).toHaveClass('col-span-full', 'w-full', 'sm:justify-end');
  });
});
