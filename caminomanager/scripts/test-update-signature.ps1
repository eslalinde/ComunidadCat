$ErrorActionPreference = 'Stop'
$verify = "$PSScriptRoot/../build-resources/Verify-UpdateSignature.ps1"
$signed = (Get-Command powershell.exe).Source
$publisher = (Get-AuthenticodeSignature -LiteralPath $signed).SignerCertificate.Subject
& $verify -Installer $signed -Publisher $publisher

function Assert-Rejected([string]$Path, [string]$ExpectedPublisher) {
    try { & $verify -Installer $Path -Publisher $ExpectedPublisher }
    catch { return }
    throw "Se aceptó una firma no autorizada en $Path"
}
Assert-Rejected $signed 'CN=Otro editor de prueba'
Assert-Rejected $PSCommandPath $publisher
