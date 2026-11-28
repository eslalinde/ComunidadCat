param(
    [Parameter(Mandatory)][string]$Installer,
    [Parameter(Mandatory)][string]$Publisher
)
$ErrorActionPreference = 'Stop'
$signature = Get-AuthenticodeSignature -LiteralPath $Installer
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -ne $Publisher) {
    throw 'La firma del instalador no corresponde al editor de confianza.'
}
