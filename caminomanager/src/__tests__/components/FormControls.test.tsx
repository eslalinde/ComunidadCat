import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PasswordInput } from '@/components/ui/password-input';
import { FormAlert } from '@/components/ui/form-alert';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormRoot,
  RequiredMark,
} from '@/components/ui/form';

describe('PasswordInput', () => {
  it('alterna la visibilidad con etiquetas en español e ids únicos', () => {
    render(
      <>
        <label htmlFor="pwd">Contraseña</label>
        <PasswordInput id="pwd" />
      </>
    );
    const input = screen.getByLabelText('Contraseña');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('autocomplete', 'current-password');

    const toggle = screen.getByRole('button', { name: 'Mostrar contraseña' });
    expect(toggle.id).not.toBe(input.id);
    fireEvent.click(toggle);

    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toBeInTheDocument();
  });

  it('avisa cuando Bloq Mayús está activado', () => {
    render(<PasswordInput aria-label="Clave" />);
    const input = screen.getByLabelText('Clave');
    fireEvent.keyUp(input, { key: 'A', modifierCapsLock: true });
    expect(screen.getByText('Bloq Mayús está activado')).toBeInTheDocument();
    fireEvent.blur(input);
    expect(screen.queryByText('Bloq Mayús está activado')).not.toBeInTheDocument();
  });
});

describe('FormAlert', () => {
  it('usa role alert para errores y status para confirmaciones', () => {
    const { rerender } = render(<FormAlert>Algo salió mal</FormAlert>);
    expect(screen.getByRole('alert')).toHaveTextContent('Algo salió mal');
    rerender(<FormAlert tone="success" title="Listo">Guardado</FormAlert>);
    expect(screen.getByRole('status')).toHaveTextContent('ListoGuardado');
  });
});

const schema = z.object({ name: z.string().min(1, 'Escribe un nombre') });

function DemoForm() {
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name: '' } });
  return (
    <Form {...form}>
      <FormRoot onSubmit={form.handleSubmit(() => undefined)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Nombre <RequiredMark />
              </FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type="submit">Guardar</button>
      </FormRoot>
    </Form>
  );
}

describe('Form (Radix)', () => {
  it('marca el campo inválido, enlaza el mensaje y enfoca el primer error', async () => {
    render(<DemoForm />);
    fireEvent.click(screen.getByText('Guardar'));

    const message = await screen.findByText('Escribe un nombre');
    const input = screen.getByLabelText(/Nombre/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const messageEl = message.closest('[data-slot="form-message"]') as HTMLElement;
    await waitFor(() => expect(input.getAttribute('aria-describedby')).toContain(messageEl.id));
    expect(input.closest('[data-slot="form-item"]')).toHaveAttribute('data-invalid', 'true');
    await waitFor(() => expect(input).toHaveFocus());
    expect(screen.getByText('(obligatorio)')).toHaveClass('sr-only');

    fireEvent.change(input, { target: { value: 'Ana' } });
    await waitFor(() => expect(screen.queryByText('Escribe un nombre')).not.toBeInTheDocument());
    expect(input).not.toHaveAttribute('aria-invalid');
  });
});
