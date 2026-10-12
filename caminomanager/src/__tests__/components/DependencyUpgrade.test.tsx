import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelectParishModal } from '@/components/crud/SelectParishModal';
import { GlobalFilter } from '@/components/reports/dynamic-table/GlobalFilter';
import { Autocomplete } from '@/components/ui/autocomplete';

const { loadParishes } = vi.hoisted(() => ({
  loadParishes: vi.fn(async () => ({
    data: [{ id: 1, name: 'San José' }, { id: 2, name: 'Santa María' }],
    error: null,
  })),
}));

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    from: () => ({ select: () => ({ order: loadParishes }) }),
  }),
}));

describe('Dependency upgrade regressions', () => {
  it('resets selection and search when reopening a modal and refreshes available rows', async () => {
    const user = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const onSelect = vi.fn(async () => {});
    const view = (open: boolean, excluded: number[] = []) => (
      <QueryClientProvider client={client}>
        <SelectParishModal open={open} onClose={vi.fn()} onSelect={onSelect} excludeParishIds={excluded} />
      </QueryClientProvider>
    );
    const { rerender, unmount } = render(view(true));
    await user.click(await screen.findByText('San José'));
    await user.type(screen.getByPlaceholderText('Buscar por nombre...'), 'José');
    expect(screen.getByRole('button', { name: 'Agregar Parroquia' })).toBeEnabled();
    const calls = loadParishes.mock.calls.length;
    rerender(view(false));
    rerender(view(true));
    await screen.findByText('Santa María');
    expect(screen.getByPlaceholderText('Buscar por nombre...')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Agregar Parroquia' })).toBeDisabled();
    expect(loadParishes.mock.calls.length).toBeGreaterThan(calls);
    rerender(view(true, [1]));
    await screen.findByText('Santa María');
    expect(screen.queryByText('San José')).not.toBeInTheDocument();
    unmount();
    client.clear();
  });

  it('synchronizes a global filter reset without publishing its pending old search', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<GlobalFilter value="inicial" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Buscar...'), { target: { value: 'pendiente' } });
    rerender(<GlobalFilter value="" onChange={onChange} />);
    expect(screen.getByPlaceholderText('Buscar...')).toHaveValue('');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(''));
    expect(onChange).not.toHaveBeenCalledWith('pendiente');
  });

  it('updates a closed autocomplete when its controlled selection changes and discards an abandoned search', async () => {
    const user = userEvent.setup();
    const options = [{ value: 'co', label: 'Colombia' }, { value: 'ec', label: 'Ecuador' }];
    const { rerender } = render(<><Autocomplete aria-label="País" options={options} value="co" /><button>Fuera</button></>);
    rerender(<><Autocomplete aria-label="País" options={options} value="ec" /><button>Fuera</button></>);
    const input = screen.getByRole('combobox');
    expect(input).toHaveValue('Ecuador');
    await user.click(input);
    await user.clear(input);
    await user.type(input, 'búsqueda');
    await user.click(screen.getByRole('button', { name: 'Fuera' }));
    expect(input).toHaveValue('Ecuador');
  });
});
