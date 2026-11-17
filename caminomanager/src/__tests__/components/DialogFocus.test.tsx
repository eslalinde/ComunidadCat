import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';

function ControlledDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir</button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Formulario</DialogTitle>
          <DialogDescription>Prueba</DialogDescription>
          <input aria-label="Nombre" />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ControlledAlert() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Eliminar</button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>¿Eliminar?</AlertDialogTitle>
          <AlertDialogDescription>No se puede deshacer.</AlertDialogDescription>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

it('devuelve el foco al botón que abrió un Dialog controlado al cerrarlo con Escape', async () => {
  render(<ControlledDialog />);
  const opener = screen.getByRole('button', { name: 'Abrir' });
  opener.focus();
  fireEvent.click(opener);
  const dialog = await screen.findByRole('dialog');
  await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));

  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(opener).toHaveFocus();
});

it('devuelve el foco al disparador de un AlertDialog controlado al cancelar', async () => {
  render(<ControlledAlert />);
  const opener = screen.getByRole('button', { name: 'Eliminar' });
  opener.focus();
  fireEvent.click(opener);
  fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  expect(opener).toHaveFocus();
});
