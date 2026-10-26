# Espelha C:\auto-orcamento\data em backup-legado/pre-uuid-migration (pre migracao UUID).
# Uso: pwsh -File scripts/backup-live-data-legado.ps1

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
$destRoot = Join-Path $repoRoot "backup-legado\pre-uuid-migration"

$source = $env:DATA_DIR
if ([string]::IsNullOrWhiteSpace($source)) {
  $source = "C:\auto-orcamento\data"
}
$source = [System.IO.Path]::GetFullPath($source)

if (-not (Test-Path -LiteralPath $source)) {
  Write-Error "Origem inexistente: $source"
}

if (Test-Path -LiteralPath $destRoot) {
  Remove-Item -LiteralPath $destRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $destRoot | Out-Null

$files = @(Get-ChildItem -LiteralPath $source -Recurse -File)
foreach ($item in $files) {
  $rel = $item.FullName.Substring($source.Length).TrimStart("\", "/")
  $target = Join-Path $destRoot $rel
  $parent = Split-Path -Path $target -Parent
  if (-not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }
  Copy-Item -LiteralPath $item.FullName -Destination $target -Force
}

$manifestHelper = Join-Path $PSScriptRoot "write-backup-manifest.py"
if (-not (Test-Path -LiteralPath $manifestHelper)) {
  Write-Error "Auxiliar ausente: $manifestHelper"
}

& py -3 $manifestHelper $destRoot $source
if ($LASTEXITCODE -ne 0) {
  Write-Error "Falha ao gerar MANIFEST.json"
}

Write-Host "Backup concluido."
Write-Host "  Origem:  $source"
Write-Host "  Destino: $destRoot"
Write-Host "  Arquivos: $($files.Count) (sem contar MANIFEST.json)"
