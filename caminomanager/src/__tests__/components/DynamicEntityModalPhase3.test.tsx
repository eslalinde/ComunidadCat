import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DynamicEntityModal } from '@/components/crud/DynamicEntityModal';
import { cityConfig, stateConfig } from '@/config/entities';
import type { City } from '@/types/database';

const countries = [
  { value: 1, label: 'Colombia' },
  { value: 2, label: 'Ecuador' },
];

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
