Add-Type -AssemblyName System.Drawing

$rootDir = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $rootDir "assets/app-icon-square.png"
$assetsDir = Join-Path $rootDir "assets"
$stagingDir = Join-Path $assetsDir ".icon-staging"
$sizes = @(16, 32, 48, 64, 128, 256, 512)

if (-not (Test-Path $sourcePath)) {
  throw "Arquivo não encontrado: $sourcePath (rode npm run icon:web)"
}

$source = [System.Drawing.Image]::FromFile($sourcePath)

foreach ($size in $sizes) {
  $bitmap = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.DrawImage($source, 0, 0, $size, $size)
  $graphics.Dispose()

  $outputPath = Join-Path $assetsDir "favicon-$size.png"
  $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
  Write-Output "Web icon saved to $outputPath"
}

Copy-Item -Path (Join-Path $assetsDir "favicon-256.png") -Destination (Join-Path $assetsDir "favicon.png") -Force
Write-Output "Primary favicon saved to assets/favicon.png (256x256)"

$source.Dispose()

$tauriCli = Join-Path $rootDir "node_modules/.bin/tauri.cmd"
if (-not (Test-Path $tauriCli)) {
  Write-Output "Tauri CLI ausente; pulando geração de app-icon.ico (rode npm install)"
  exit 0
}

if (Test-Path $stagingDir) {
  Remove-Item $stagingDir -Recurse -Force
}

& $tauriCli icon $sourcePath -o $stagingDir
if ($LASTEXITCODE -ne 0) {
  throw "Falha ao gerar app-icon.ico via tauri icon"
}

$icoSource = Join-Path $stagingDir "icon.ico"
$icoTarget = Join-Path $assetsDir "app-icon.ico"
Copy-Item -Path $icoSource -Destination $icoTarget -Force
Remove-Item $stagingDir -Recurse -Force
Write-Output "Multi-size ICO saved to $icoTarget"
