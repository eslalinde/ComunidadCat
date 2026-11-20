import { afterEach, expect, it, vi } from 'vitest';
import { SignedWindowsUpdater } from '../../../electron/SignedWindowsUpdater';

const native = vi.hoisted(() => ({ verify: vi.fn(), install: vi.fn(() => true) }));
vi.mock('node:child_process', () => ({ execFileSync: native.verify }));
vi.mock('electron-updater', () => ({
  NsisUpdater: class {
    installerPath = 'cached-setup.exe';
    doInstall() { return native.install(); }
  },
}));

class TestUpdater extends SignedWindowsUpdater {
  runInstall() {
    return this.doInstall({ isSilent: true, isForceRunAfter: false, isAdminRightsRequired: false });
  }
}
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
it('verifica también el instalador en caché antes de ejecutarlo', () => {
  vi.stubEnv('SystemRoot', 'C:/Windows');
  const updater = new TestUpdater('CN=Editor', 'verificar.ps1');
  expect(updater.disableWebInstaller).toBe(true);
  native.verify.mockImplementationOnce(() => { throw new Error('Firma inválida'); });
  expect(() => updater.runInstall()).toThrow('Firma inválida');
  expect(native.install).not.toHaveBeenCalled();
  expect(updater.runInstall()).toBe(true);
  expect(native.verify).toHaveBeenLastCalledWith(expect.any(String),
    expect.arrayContaining(['-Installer', 'cached-setup.exe', '-Publisher', 'CN=Editor']),
    expect.any(Object));
  expect(native.install).toHaveBeenCalledOnce();
});
