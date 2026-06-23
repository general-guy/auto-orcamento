. "$PSScriptRoot/icon-helpers.ps1"

$rootDir = Split-Path -Parent $PSScriptRoot
$assetsDir = Join-Path $rootDir "assets"
$outputPath = Join-Path $assetsDir "app-icon-g.png"
$timbradoPath = Join-Path $assetsDir "papel-timbrado.png"
$printPath = Join-Path $assetsDir "app-icon-g-print.png"
$legacyPath = Join-Path $assetsDir "app-icon-g.png"

$candidates = @()

$timbradoCandidate = Import-LogoCandidateFromTimbrado -TimbradoPath $timbradoPath
if ($null -ne $timbradoCandidate) {
  $candidates += $timbradoCandidate
}

$printCandidate = Import-LogoCandidateFromFile -Path $printPath -Label "print" -PreserveSize
if ($null -ne $printCandidate) {
  $candidates += $printCandidate
}

if ($candidates.Count -eq 0) {
  if (Test-Path $legacyPath) {
    Write-Output "Nenhuma fonte nova encontrada; mantendo $legacyPath"
    exit 0
  }

  throw "Não foi possível extrair o G. Coloque assets/papel-timbrado.png ou assets/app-icon-g-print.png."
}

if ($null -ne $printCandidate) {
  $best = $printCandidate
} else {
  $best = $candidates | Sort-Object `
    @{ Expression = { [Math]::Min($_.Width, $_.Height) }; Descending = $true }, `
    @{ Expression = { $_.Area }; Descending = $true } | `
    Select-Object -First 1
}
$best.Bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$best.Bitmap.Dispose()

foreach ($candidate in $candidates) {
  if ($candidate.Label -ne $best.Label) {
    $candidate.Bitmap.Dispose()
  }
}

Write-Output "G extraído de '$($best.Label)' ($($best.Width)x$($best.Height)) -> $outputPath"
