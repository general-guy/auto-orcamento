Add-Type -AssemblyName System.Drawing

$rootDir = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $rootDir "assets/app-icon-g.png"
$outputPath = Join-Path $rootDir "assets/app-icon-square.png"
$backgroundColor = [System.Drawing.Color]::FromArgb(255, 31, 41, 51)
$targetSize = 1024

function New-TransparentSourceBitmap {
  param(
    [System.Drawing.Image]$Source,
    [int]$WhiteThreshold = 235
  )

  $bitmap = New-Object System.Drawing.Bitmap $Source.Width, $Source.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.DrawImage($Source, 0, 0, $Source.Width, $Source.Height)
  $graphics.Dispose()

  for ($x = 0; $x -lt $bitmap.Width; $x += 1) {
    for ($y = 0; $y -lt $bitmap.Height; $y += 1) {
      $pixel = $bitmap.GetPixel($x, $y)
      if ($pixel.A -lt 16) {
        continue
      }

      if ($pixel.R -ge $WhiteThreshold -and $pixel.G -ge $WhiteThreshold -and $pixel.B -ge $WhiteThreshold) {
        $bitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
      }
    }
  }

  return $bitmap
}

$source = [System.Drawing.Image]::FromFile($sourcePath)
$transparentSource = New-TransparentSourceBitmap -Source $source
$canvas = New-Object System.Drawing.Bitmap $targetSize, $targetSize, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
$graphics.Clear($backgroundColor)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$scale = [Math]::Min($targetSize / $transparentSource.Width, $targetSize / $transparentSource.Height) * 0.78
$newWidth = [int]($transparentSource.Width * $scale)
$newHeight = [int]($transparentSource.Height * $scale)
$x = [int](($targetSize - $newWidth) / 2)
$y = [int](($targetSize - $newHeight) / 2)
$graphics.DrawImage($transparentSource, $x, $y, $newWidth, $newHeight)
$canvas.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$canvas.Dispose()
$transparentSource.Dispose()
$source.Dispose()

Write-Output "Icon source saved to $outputPath"
