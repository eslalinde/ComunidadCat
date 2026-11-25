import childProcess from 'node:child_process';

// electron-builder calls this hook before NSIS packaging and updater hashing.
export function sign({ path, hash }) {
  if (hash !== 'sha256') throw new Error('eSigner requiere SHA-256.');
  for (const name of ['JSIGN_JAR', 'ESIGNER_CREDENTIAL_ID', 'ESIGNER_ACCOUNT', 'ESIGNER_TOTP_SECRET']) {
    if (!process.env[name]) throw new Error(`Falta ${name} para la firma de Windows.`);
  }
  try {
    childProcess.execFileSync('java', [
      '-jar', process.env.JSIGN_JAR, '--storetype', 'ESIGNER',
      '--alias', process.env.ESIGNER_CREDENTIAL_ID, '--storepass', 'env:ESIGNER_ACCOUNT',
      '--keypass', 'env:ESIGNER_TOTP_SECRET', '--alg', 'SHA-256',
      '--tsmode', 'RFC3161', '--tsaurl', 'http://ts.ssl.com', path,
    ], { windowsHide: true, stdio: 'pipe' });
  } catch (error) {
    // Provider diagnostics can include account details. Only report the exit status.
    throw new Error(`Jsign no pudo firmar ${path} (código ${error.status ?? error.code}).`);
  }
}
