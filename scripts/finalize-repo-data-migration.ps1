# Move o que ainda estiver em {repo}/data para C:\auto-orcamento\data e remove a origem.
# Uso: pwsh -File scripts/finalize-repo-data-migration.ps1

$ErrorActionPreference = "Stop"
$repoData = Join-Path (Split-Path $PSScriptRoot -Parent) "data"
$dest = "C:\auto-orcamento\data"

if (-not (Test-Path $repoData)) {
  Write-Host "Nada a fazer: pasta data/ do clone nao existe."
  exit 0
}

New-Item -ItemType Directory -Force -Path $dest | Out-Null

$moved = 0
Get-ChildItem -Path $repoData -File -Recurse | ForEach-Object {
  $rel = $_.FullName.Substring($repoData.Length).TrimStart("\")
  $target = Join-Path $dest $rel
  $dir = Split-Path $target -Parent
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  if (Test-Path $target) {
    $srcTime = $_.LastWriteTimeUtc
    $dstTime = (Get-Item $target).LastWriteTimeUtc
    if ($srcTime -le $dstTime) {
      Remove-Item -LiteralPath $_.FullName -Force
      Write-Host "Removido legado (ja em destino): $rel"
      return
    }
  }
  Move-Item -LiteralPath $_.FullName -Destination $target -Force
  Write-Host "Movido: $rel -> $dest"
  $moved++
}

$remaining = @(Get-ChildItem -Path $repoData -Recurse -Force -ErrorAction SilentlyContinue)
if ($remaining.Count -eq 0) {
  Remove-Item -Path $repoData -Force -Recurse -ErrorAction SilentlyContinue
  Write-Host "Pasta data/ do clone removida."
} else {
  Write-Host "Ainda restam itens em data/ do clone; revise manualmente."
}

Write-Host "Concluido. Destino canonico: $dest"
