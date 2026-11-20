param([Parameter(Mandatory)][ValidateSet('Cloud', 'Standalone')][string]$Edition)
$ErrorActionPreference = 'Stop'
if (!$env:WIN_CSC_LINK -or $env:WINDOWS_PUBLISHER_DN -notmatch '(?:^|,\s*)CN=[^,]+') {
    throw 'Faltan el certificado de firma o el nombre distinguido del editor.'
}
$options = @('--win', '--publish', 'never', '--config.forceCodeSigning=true',
    "--config.win.signtoolOptions.publisherName=$env:WINDOWS_PUBLISHER_DN",
    ('--config.artifactName=ComunidadCat-' + $Edition + '-${version}-Setup.${ext}'))
if ($Edition -eq 'Standalone') { $options += '--config.extraMetadata.standalone=true' }
& npx.cmd --no-install electron-builder @options
if ($LASTEXITCODE) { throw 'Falló la creación del instalador firmado.' }

$installer = @(Get-ChildItem -Path "release/ComunidadCat-$Edition-*-Setup.exe")
if ($installer.Count -ne 1) { throw 'Se esperaba un único instalador.' }
& "$PSScriptRoot/../build-resources/Verify-UpdateSignature.ps1" -Installer $installer[0].FullName -Publisher $env:WINDOWS_PUBLISHER_DN
node -e "const {getUpdatePublisher}=require('./dist-electron/updatePublisher'); const fs=require('node:fs'); if(getUpdatePublisher(fs.readFileSync('release/win-unpacked/resources/app-update.yml','utf8'))!==process.env.WINDOWS_PUBLISHER_DN) process.exit(1)"
if ($LASTEXITCODE) { throw 'La configuración empaquetada carece del editor esperado.' }
