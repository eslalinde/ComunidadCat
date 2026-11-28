import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { NsisUpdater } from 'electron-updater';
import type { InstallOptions } from 'electron-updater/out/BaseUpdater';

export class SignedWindowsUpdater extends NsisUpdater {
  constructor(private readonly publisher: string, private readonly verifier: string) {
    super();
    this.disableWebInstaller = true;
  }

  protected override doInstall(options: InstallOptions): boolean {
    const installer = this.installerPath;
    if (!installer || this.downloadedUpdateHelper?.packageFile) {
      throw new Error('La actualización requiere un instalador Windows completo.');
    }
    // Both install-on-quit and manual installs reach this point, including cache hits.
    execFileSync(path.join(process.env.SystemRoot!, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', this.verifier,
        '-Installer', installer, '-Publisher', this.publisher],
      { timeout: 30_000, windowsHide: true });
    return super.doInstall(options);
  }
}
