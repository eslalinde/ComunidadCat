import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '@/app/(auth)/login/page';
import SignupPage from '@/app/(auth)/signup/page';
import ConfirmPage from '@/app/auth/confirm/page';
const mocks = vi.hoisted(() => ({ auth: { getSession: vi.fn(), getUser: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn(), verifyOtp: vi.fn() }, router: { replace: vi.fn() }, params: new URLSearchParams() }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({ auth: mocks.auth }) }));
vi.mock('next/navigation', () => ({ useRouter: () => mocks.router, useSearchParams: () => mocks.params }));
beforeEach(() => { vi.clearAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {}); mocks.params = new URLSearchParams(); mocks.auth.getSession.mockResolvedValue({ data: { session: null } }); mocks.auth.getUser.mockResolvedValue({ data: { user: null } }); mocks.auth.signInWithPassword.mockResolvedValue({ error: null }); mocks.auth.signUp.mockResolvedValue({ data: { user: { id: 'u' }, session: null }, error: null }); mocks.auth.verifyOtp.mockResolvedValue({ error: null }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function login() { render(<LoginPage />); fireEvent.change(await screen.findByLabelText('Correo electrónico'), { target: { value: 'u@example.com' } }); fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secret123' } }); fireEvent.click(screen.getByText('Ingresar')); }
async function signup() { render(<SignupPage />); fireEvent.change(await screen.findByLabelText('Nombre completo'), { target: { value: 'Usuario' } }); fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'u@example.com' } }); for (const name of ['Contraseña', 'Confirmar contraseña']) fireEvent.change(screen.getByLabelText(name), { target: { value: 'secret123' } }); fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' })); }
describe('Acceso y registro', () => {
  it('inicia sesión y conserva destino solicitado', async () => { mocks.params.set('redirectTo', '/comunidades/detalle?id=4'); await login(); await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith('/comunidades/detalle?id=4')); expect(mocks.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'u@example.com', password: 'secret123' }); });
  it.each([
    ['Invalid login credentials', 'Credenciales inválidas. Verifica tu email y contraseña.'],
    ['Email not confirmed', 'Por favor, confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.'],
    ['Servicio no disponible', 'Servicio no disponible'],
    ['throw', 'Error al iniciar sesión. Intenta de nuevo.'],
  ])('explica fallo de acceso: %s', async (message, expected) => { if (message === 'throw') mocks.auth.signInWithPassword.mockRejectedValue(new Error()); else mocks.auth.signInWithPassword.mockResolvedValue({ error: { message } }); await login(); await screen.findByText(expected); expect(mocks.router.replace).not.toHaveBeenCalled(); });
  it('muestra formulario si falla restauración y explica confirmación fallida', async () => { mocks.auth.getSession.mockRejectedValue(new Error()); mocks.params.set('error', 'email_confirmation_failed'); render(<LoginPage />); await screen.findByText(/Error al confirmar el email/); fireEvent.click(screen.getByText('Ingresar')); await screen.findByText('El correo es requerido'); expect(mocks.auth.signInWithPassword).not.toHaveBeenCalled(); });
  it.each([LoginPage, SignupPage])('redirige usuarios autenticados', async (Page) => { mocks.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u' } } } }); mocks.auth.getUser.mockResolvedValue({ data: { user: { id: 'u' } } }); render(<Page />); await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith('/')); });
  it('registra metadatos y pide confirmación por correo', async () => { await signup(); await screen.findByText(/¡Cuenta creada exitosamente!/); expect(mocks.auth.signUp).toHaveBeenCalledWith({ email: 'u@example.com', password: 'secret123', options: { data: { full_name: 'Usuario' }, emailRedirectTo: `${window.location.origin}/auth/confirm` } }); });
  it('entra directamente si el registro devuelve sesión', async () => { mocks.auth.signUp.mockResolvedValue({ data: { user: { id: 'u' }, session: {} }, error: null }); await signup(); await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith('/')); });
  it.each([
    ['already registered', 'Este email ya está registrado. Intenta iniciar sesión.'], ['password weak', 'La contraseña no cumple con los requisitos de seguridad.'], ['Servicio no disponible', 'Servicio no disponible'], ['throw', 'Error interno. Intenta nuevamente.'],
  ])('explica fallo de registro: %s', async (message, expected) => { if (message === 'throw') mocks.auth.signUp.mockRejectedValue(new Error()); else mocks.auth.signUp.mockResolvedValue({ data: {}, error: { message } }); await signup(); await screen.findByText(expected); expect(mocks.router.replace).not.toHaveBeenCalled(); });
  it('impide contraseñas diferentes', async () => { render(<SignupPage />); await screen.findByLabelText('Nombre completo'); fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'abcdef' } }); fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'diferente' } }); fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' })); await screen.findByText('Las contraseñas no coinciden'); expect(mocks.auth.signUp).not.toHaveBeenCalled(); });
});
describe('Confirmación de correo', () => {
  it('rechaza enlaces incompletos sin consultar', () => { render(<ConfirmPage />); expect(mocks.router.replace).toHaveBeenCalledWith('/login'); expect(mocks.auth.verifyOtp).not.toHaveBeenCalled(); });
  it.each([false, true])('verifica token, error=%s', async (fails) => { mocks.params = new URLSearchParams('token_hash=abc&type=signup'); if (fails) mocks.auth.verifyOtp.mockResolvedValue({ error: { message: 'Enlace vencido' } }); render(<ConfirmPage />); expect(mocks.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type: 'signup' }); if (fails) { await screen.findByText('Enlace vencido'); expect(screen.getByRole('link')).toHaveAttribute('href', '/login'); } else await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith('/')); });
});
