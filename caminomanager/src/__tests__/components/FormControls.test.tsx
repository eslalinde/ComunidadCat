import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PasswordInput } from '@/components/ui/password-input';
import { FormAlert } from '@/components/ui/form-alert';
import { Input } from '@/components/ui/input';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Checkbox } from '@/components/ui/checkbox';
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

// Radix Checkbox measures itself; jsdom has no ResizeObserver.
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

function CompositeForm() {
  const form = useForm<{ country: string; itinerant: boolean }>({ defaultValues: { country: '', itinerant: false } });
  const itinerant = form.watch('itinerant');
  return (
    <Form {...form}>
      <FormRoot onSubmit={form.handleSubmit(() => undefined)}>
        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>País</FormLabel>
              <FormControl>
                <Autocomplete
                  options={[{ value: '1', label: 'Colombia' }, { value: '2', label: 'Chile' }]}
                  value={field.value}
                  onValueChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="itinerant"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel>Itinerante</FormLabel>
            </FormItem>
          )}
        />
        {itinerant && <p>Ubicación actual</p>}
      </FormRoot>
    </Form>
  );
}

describe('FormControl con controles compuestos', () => {
  it('no reemplaza los manejadores internos de Autocomplete ni Checkbox', async () => {
    render(<CompositeForm />);
    const country = screen.getByRole('combobox', { name: 'País' });
    fireEvent.change(country, { target: { value: 'Col' } });
    expect(country).toHaveValue('Col');
    fireEvent.click(await screen.findByRole('option', { name: /Colombia/ }));
    expect(country).toHaveValue('Colombia');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Itinerante' }));
    expect(await screen.findByText('Ubicación actual')).toBeInTheDocument();
  });
});

const emailSchema = z.object({
  name: z.string().min(1, 'Escribe un nombre'),
  email: z.string().email('Revisa el correo'),
});

function TouchedForm() {
  const form = useForm({ resolver: zodResolver(emailSchema), mode: 'onTouched', defaultValues: { name: '', email: '' } });
  return (
    <Form {...form}>
      <FormRoot onSubmit={form.handleSubmit(() => undefined)}>
        {(['name', 'email'] as const).map((name) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{name}</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <button type="submit">Enviar</button>
      </FormRoot>
    </Form>
  );
}

describe('Momento de mostrar errores', () => {
  it('no marca un campo vacío solo por pasar por él, pero sí al escribir mal o al enviar', async () => {
    render(<TouchedForm />);
    const name = screen.getByLabelText('name');
    const email = screen.getByLabelText('email');

    fireEvent.focus(name); fireEvent.blur(name);
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByText('Escribe un nombre')).not.toBeInTheDocument();
    expect(name).not.toHaveAttribute('aria-invalid');

    fireEvent.change(email, { target: { value: 'sin-arroba' } }); fireEvent.blur(email);
    expect(await screen.findByText('Revisa el correo')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Enviar'));
    expect(await screen.findByText('Escribe un nombre')).toBeInTheDocument();
  });
});

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
