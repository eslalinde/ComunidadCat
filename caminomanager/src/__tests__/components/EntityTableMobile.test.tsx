import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { EntityTable } from '@/components/crud/EntityTable';

// Force the mobile breakpoint so EntityTable renders the card layout.
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

type TestEntity = { id?: number; name: string; code: string };

const baseProps = {
  data: [{ id: 1, name: 'Colombia', code: 'CO' }] as TestEntity[],
  columns: [
    { key: 'name' as keyof TestEntity, label: 'Nombre' },
    { key: 'code' as keyof TestEntity, label: 'Código' },
  ],
  loading: false,
  sort: { field: 'name' as keyof TestEntity, asc: true },
  onSort: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
};

describe('EntityTable on mobile', () => {
  it('groups actions behind a single labelled menu instead of adjacent icons', () => {
    render(<EntityTable {...baseProps} />);
    expect(screen.getByRole('button', { name: 'Acciones para Colombia' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar Colombia' })).not.toBeInTheDocument();
  });

  it('edits from the menu without triggering the card click', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<EntityTable {...baseProps} onEdit={onEdit} />);
    await user.click(screen.getByRole('button', { name: 'Acciones para Colombia' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Editar' }));
    expect(onEdit).toHaveBeenCalledWith(baseProps.data[0]);
  });

  it('asks for confirmation before deleting from the menu', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<EntityTable {...baseProps} onDelete={onDelete} />);
    await user.click(screen.getByRole('button', { name: 'Acciones para Colombia' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Eliminar' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('hides the delete option when hideDeleteInTable is set', async () => {
    const user = userEvent.setup();
    render(<EntityTable {...baseProps} hideDeleteInTable />);
    await user.click(screen.getByRole('button', { name: 'Acciones para Colombia' }));
    await screen.findByRole('menuitem', { name: 'Editar' });
    expect(screen.queryByRole('menuitem', { name: 'Eliminar' })).not.toBeInTheDocument();
  });
});
