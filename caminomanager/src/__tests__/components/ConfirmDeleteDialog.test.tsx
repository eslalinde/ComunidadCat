import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock radix dialog components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, disabled, ...props }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      {...props}
    />
  ),
}));

import { ConfirmDeleteDialog } from '@/components/crud/ConfirmDeleteDialog';

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  title: '¿Eliminar registro?',
  description: '¿Estás seguro de que deseas eliminar este registro?',
};

describe('ConfirmDeleteDialog', () => {
  it('should not render when closed', () => {
    render(<ConfirmDeleteDialog {...defaultProps} open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(<ConfirmDeleteDialog {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('¿Eliminar registro?')).toBeInTheDocument();
  });

  it('should display description', () => {
    render(<ConfirmDeleteDialog {...defaultProps} />);
    expect(screen.getByText('¿Estás seguro de que deseas eliminar este registro?')).toBeInTheDocument();
  });

  it('should display item name when provided', () => {
    render(<ConfirmDeleteDialog {...defaultProps} itemName="Colombia" />);
    expect(screen.getByText('Colombia')).toBeInTheDocument();
  });

  it('should display preview items when provided', () => {
    render(
      <ConfirmDeleteDialog
        {...defaultProps}
        preview={['3 hermanos', '2 equipos']}
      />
    );
    expect(screen.getByText('3 hermanos')).toBeInTheDocument();
    expect(screen.getByText('2 equipos')).toBeInTheDocument();
  });

  it('should require typing confirmWord to enable delete', async () => {
    const user = userEvent.setup();
    render(<ConfirmDeleteDialog {...defaultProps} />);

    const deleteButton = screen.getByText('Eliminar');
    expect(deleteButton).toBeDisabled();

    const input = screen.getByPlaceholderText('Escribe eliminar');
    await user.type(input, 'eliminar');
    expect(deleteButton).not.toBeDisabled();
  });

  it('should be case insensitive for confirm word', async () => {
    const user = userEvent.setup();
    render(<ConfirmDeleteDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText('Escribe eliminar');
    await user.type(input, 'ELIMINAR');

    const deleteButton = screen.getByText('Eliminar');
    expect(deleteButton).not.toBeDisabled();
  });

  it('should call onConfirm when confirmed', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmDeleteDialog {...defaultProps} onConfirm={onConfirm} />);

    const input = screen.getByPlaceholderText('Escribe eliminar');
    await user.type(input, 'eliminar');

    const deleteButton = screen.getByText('Eliminar');
    await user.click(deleteButton);
    expect(onConfirm).toHaveBeenCalled();
  });

  it('should not call onConfirm when word is wrong', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmDeleteDialog {...defaultProps} onConfirm={onConfirm} />);

    const input = screen.getByPlaceholderText('Escribe eliminar');
    await user.type(input, 'wrong');

    const deleteButton = screen.getByText('Eliminar');
    await user.click(deleteButton);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('should call onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ConfirmDeleteDialog {...defaultProps} onClose={onClose} />);

    const cancelButton = screen.getByText('Cancelar');
    await user.click(cancelButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('should show loading state', () => {
    render(<ConfirmDeleteDialog {...defaultProps} loading={true} />);
    expect(screen.getByText('Eliminando...')).toBeInTheDocument();
  });

  it('should support custom confirm word', async () => {
    const user = userEvent.setup();
    render(<ConfirmDeleteDialog {...defaultProps} confirmWord="borrar" />);

    expect(screen.getByText('borrar')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('Escribe borrar');

    await user.type(input, 'borrar');
    const deleteButton = screen.getByText('Eliminar');
    expect(deleteButton).not.toBeDisabled();
  });
});
