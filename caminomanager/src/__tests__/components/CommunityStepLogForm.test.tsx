import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CommunityStepLog } from '@/components/crud/CommunityStepLog';

const mocks = vi.hoisted(() => ({ data: [] as unknown[], loading: false, create: vi.fn(), fetchData: vi.fn() }));
vi.mock('@/hooks/useCrud', () => ({ useCrud: () => mocks }));
vi.mock('@/hooks/useEntityOptions', () => ({
  useEntityOptions: () => ({ options: [{ value: 2, label: 'Shemá' }, { value: 3, label: 'Elección' }] }),
}));
// Native <select> stand-in keeps the test focused on validation, not Radix popovers.
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: ReactNode; value: string; onValueChange: (v: string) => void }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}><option value="" />{children}</select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.create.mockResolvedValue({ id: 1 });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const open = () => {
  render(<CommunityStepLog communityId={10} communityNumber="1" />);
  fireEvent.click(screen.getByText('Agregar Entrada'));
};

it('exige el paso antes de guardar y no envía datos incompletos', async () => {
  open();
  fireEvent.click(screen.getByText('Guardar Entrada'));
  await screen.findByText('Elige el paso o etapa');
  expect(mocks.create).not.toHaveBeenCalled();
});

it('guarda la entrada con tipos correctos y cierra el formulario', async () => {
  open();
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '3' } });
  const outcome = screen.getByRole('radiogroup', { name: 'Estado' });
  fireEvent.click(within(outcome).getByRole('radio', { name: 'Cerrada' }));
  expect(within(outcome).getByRole('radio', { name: 'Cerrada' })).toBeChecked();
  fireEvent.change(screen.getByPlaceholderText('Nombre del catequista'), { target: { value: ' Ana ' } });
  fireEvent.click(screen.getByText('Guardar Entrada'));
  await waitFor(() => expect(mocks.create).toHaveBeenCalled());
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
    community_id: 10, step_way_id: 3, outcome: true, principal_catechist_name: 'Ana', notes: undefined,
  }));
  await waitFor(() => expect(screen.queryByText('Nueva Entrada del Log')).not.toBeInTheDocument());
});

it('muestra un aviso si falla el guardado y conserva lo escrito', async () => {
  mocks.create.mockRejectedValue(new Error('offline'));
  open();
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
  fireEvent.click(screen.getByText('Guardar Entrada'));
  expect(await screen.findByRole('alert')).toBeVisible();
  expect(screen.getByText('Nueva Entrada del Log')).toBeVisible();
});
