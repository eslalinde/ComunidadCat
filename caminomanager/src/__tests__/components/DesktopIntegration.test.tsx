import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WindowControls } from '@/components/electron/WindowControls';
import { UpdateNotification } from '@/components/electron/UpdateNotification';
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration';
import { useAppVersion } from '@/hooks/useAppVersion';
let maximized: (value: boolean) => void; let downloaded: () => void;
const unsubscribe = vi.fn();
function bridge(): NonNullable<Window['electronAPI']> { return { getAppVersion: vi.fn().mockResolvedValue('1.0.0'), onUpdateAvailable: vi.fn(() => unsubscribe), onUpdateDownloaded: vi.fn((callback) => { downloaded = callback; return unsubscribe; }), installUpdate: vi.fn().mockResolvedValue(undefined), windowMinimize: vi.fn().mockResolvedValue(undefined), windowMaximize: vi.fn().mockResolvedValue(undefined), windowClose: vi.fn().mockResolvedValue(undefined), windowIsMaximized: vi.fn().mockResolvedValue(false), onMaximizedChange: vi.fn((callback) => { maximized = callback; return unsubscribe; }) }; }
beforeEach(() => { vi.clearAllMocks(); delete window.electronAPI; });
afterEach(() => { cleanup(); delete window.electronAPI; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('conecta controles de ventana al puente IPC y libera suscripción', async () => {
  window.electronAPI = bridge(); const view = render(<WindowControls />); await screen.findByLabelText('Maximizar');
  fireEvent.click(screen.getByLabelText('Minimizar')); fireEvent.click(screen.getByLabelText('Maximizar')); fireEvent.click(screen.getByLabelText('Cerrar'));
  expect(window.electronAPI.windowMinimize).toHaveBeenCalledOnce(); expect(window.electronAPI.windowMaximize).toHaveBeenCalledOnce(); expect(window.electronAPI.windowClose).toHaveBeenCalledOnce();
  act(() => maximized(true)); expect(screen.getByLabelText('Restaurar')).toBeVisible(); view.unmount(); expect(unsubscribe).toHaveBeenCalledOnce();
});
it('espera descarga completa antes de permitir reinicio', () => { window.electronAPI = bridge(); const view = render(<UpdateNotification />); expect(screen.queryByText('Reiniciar')).not.toBeInTheDocument(); act(() => downloaded()); fireEvent.click(screen.getByText('Reiniciar')); expect(window.electronAPI.installUpdate).toHaveBeenCalledOnce(); view.unmount(); expect(unsubscribe).toHaveBeenCalledOnce(); });
it('oculta integración Electron en navegador', () => { const { container } = render(<><WindowControls /><UpdateNotification /></>); expect(container).toBeEmptyDOMElement(); });
it.each(['v99.0.0', '0.0.0', '0.0.0-alpha', '0.0.0-0', '0.0', '0.0.0--', 'failed', 'offline', 'empty'])('consulta versión web: %s', async (tag) => {
  const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
  if (tag === 'offline') fetchMock.mockRejectedValue(new Error()); else fetchMock.mockResolvedValue({ ok: tag !== 'failed', json: async () => tag === 'empty' ? {} : { tag_name: tag } });
  const { result } = renderHook(() => useAppVersion());
  expect(result.current.showDownload).toBe(true);
  if (['failed', 'offline', 'empty'].includes(tag)) { await act(async () => { await Promise.resolve(); }); expect(result.current.latestVersion).toBeNull(); }
  else { await waitFor(() => expect(result.current.latestVersion).toBe(tag)); expect(result.current.hasUpdate).toBe(tag === 'v99.0.0' || tag === '0.0.0-alpha'); }
});
it('no consulta versiones ni registra service worker en escritorio', () => { window.electronAPI = bridge(); const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); const { result } = renderHook(() => useAppVersion()); render(<ServiceWorkerRegistration />); expect(result.current.isElectron).toBe(true); expect(result.current.showDownload).toBe(false); expect(fetchMock).not.toHaveBeenCalled(); });
it('registra service worker y detecta una versión activada', async () => {
  const worker = new EventTarget() as EventTarget & { state: string }; worker.state = 'installing';
  const registration = new EventTarget() as EventTarget & { installing: typeof worker | null }; registration.installing = worker;
  const register = vi.fn().mockResolvedValue(registration); vi.stubGlobal('navigator', { serviceWorker: { register, controller: {} } }); const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  render(<ServiceWorkerRegistration />); await waitFor(() => expect(register).toHaveBeenCalledWith('/sw.js')); await act(async () => { await Promise.resolve(); });
  registration.dispatchEvent(new Event('updatefound')); worker.dispatchEvent(new Event('statechange')); expect(log).not.toHaveBeenCalled(); worker.state = 'activated'; worker.dispatchEvent(new Event('statechange')); expect(log).toHaveBeenCalledWith('New version of ComunidadCat available.'); registration.installing = null; registration.dispatchEvent(new Event('updatefound'));
});
it('absorbe fallo de registro del service worker', async () => { vi.stubGlobal('navigator', { serviceWorker: { register: vi.fn().mockRejectedValue(new Error('offline')) } }); const error = vi.spyOn(console, 'error').mockImplementation(() => {}); render(<ServiceWorkerRegistration />); await waitFor(() => expect(error).toHaveBeenCalledWith('SW registration failed:', expect.any(Error))); });
