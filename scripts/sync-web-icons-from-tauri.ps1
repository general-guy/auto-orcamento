Add-Type -AssemblyName System.Drawing

$rootDir = Split-Path -Parent $PSScriptRoot
$tauriIconsDir = Join-Path $rootDir "tauri-fase_legado/src-tauri/icons"
$assetsDir = Join-Path $rootDir "assets"
$sizes = @(16, 32, 48, 64, 128, 256, 512)

$sourcePath = Join-Path $tauriIconsDir "icon.png"
$icoSource = Join-Path $tauriIconsDir "icon.ico"

if (-not (Test-Path $sourcePath)) {
  throw "Ícone Tauri não encontrado: $sourcePath"
}

if (-not (Test-Path $icoSource)) {
  throw "ICO Tauri não encontrado: $icoSource"
}

Copy-Item -Path $sourcePath -Destination (Join-Path $assetsDir "app-icon-square.png") -Force
Copy-Item -Path $icoSource -Destination (Join-Path $assetsDir "app-icon.ico") -Force

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
}

$source.Dispose()

Copy-Item -Path (Join-Path $assetsDir "favicon-256.png") -Destination (Join-Path $assetsDir "favicon.png") -Force
Write-Output "Web icons sincronizados a partir de tauri-fase_legado/src-tauri/icons (mesmo ícone do .exe)"
