. "$PSScriptRoot/icon-helpers.ps1"

$rootDir = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $rootDir "assets/app-icon-g.png"
$outputPath = Join-Path $rootDir "assets/app-icon-square.png"
$targetSize = 1024
$circleDiameter = $targetSize
$logoFillRatio = 0.70

if (-not (Test-Path $sourcePath)) {
  throw "Arquivo não encontrado: $sourcePath (rode scripts/extract-app-icon-g.ps1 primeiro)"
}

$source = [System.Drawing.Image]::FromFile($sourcePath)
$transparentSource = New-TransparentLogoBitmap -Source $source
$source.Dispose()

$bounds = Get-OpaqueBounds -Bitmap $transparentSource
if ($null -eq $bounds) {
  $transparentSource.Dispose()
  throw "Não foi possível detectar o contorno do logo em $sourcePath"
}

$cropped = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$cropGraphics = [System.Drawing.Graphics]::FromImage($cropped)
$cropGraphics.DrawImage(
  $transparentSource,
  (New-Object System.Drawing.Rectangle 0, 0, $bounds.Width, $bounds.Height),
  (New-Object System.Drawing.Rectangle $bounds.X, $bounds.Y, $bounds.Width, $bounds.Height),
  [System.Drawing.GraphicsUnit]::Pixel
)
$cropGraphics.Dispose()
$transparentSource.Dispose()

$canvas = New-Object System.Drawing.Bitmap $targetSize, $targetSize, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
$graphics.Clear([System.Drawing.Color]::Transparent)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$graphics.FillEllipse([System.Drawing.Brushes]::Black, 0, 0, $circleDiameter, $circleDiameter)

$scale = [Math]::Min($circleDiameter / $cropped.Width, $circleDiameter / $cropped.Height) * $logoFillRatio
$newWidth = [int]($cropped.Width * $scale)
$newHeight = [int]($cropped.Height * $scale)
$x = [int](($targetSize - $newWidth) / 2)
$y = [int](($targetSize - $newHeight) / 2)
$graphics.DrawImage($cropped, $x, $y, $newWidth, $newHeight)

$canvas.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$canvas.Dispose()
$cropped.Dispose()

Write-Output "Icon square saved to $outputPath"
