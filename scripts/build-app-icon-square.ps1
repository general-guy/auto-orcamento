Add-Type -AssemblyName System.Drawing

$rootDir = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $rootDir "assets/app-icon-g.png"
$outputPath = Join-Path $rootDir "assets/app-icon-square.png"
$targetSize = 1024
$circleRatio = 1.0
$logoFillRatio = 0.68

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

function Get-OpaqueBounds {
  param([System.Drawing.Bitmap]$Bitmap)

  $minX = $Bitmap.Width
  $minY = $Bitmap.Height
  $maxX = 0
  $maxY = 0
  $found = $false

  for ($x = 0; $x -lt $Bitmap.Width; $x += 1) {
    for ($y = 0; $y -lt $Bitmap.Height; $y += 1) {
      if ($Bitmap.GetPixel($x, $y).A -lt 16) {
        continue
      }

      $found = $true
      if ($x -lt $minX) { $minX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }

  if (-not $found) {
    return $null
  }

  return @{
    X = $minX
    Y = $minY
    Width = ($maxX - $minX + 1)
    Height = ($maxY - $minY + 1)
  }
}

$source = [System.Drawing.Image]::FromFile($sourcePath)
$transparentSource = New-TransparentSourceBitmap -Source $source
$bounds = Get-OpaqueBounds -Bitmap $transparentSource

if ($null -eq $bounds) {
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

$canvas = New-Object System.Drawing.Bitmap $targetSize, $targetSize, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
$graphics.Clear([System.Drawing.Color]::Transparent)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$circleDiameter = [int]($targetSize * $circleRatio)
$circleX = [int](($targetSize - $circleDiameter) / 2)
$circleY = $circleX
$graphics.FillEllipse([System.Drawing.Brushes]::Black, $circleX, $circleY, $circleDiameter, $circleDiameter)

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
$transparentSource.Dispose()
$source.Dispose()

Write-Output "Icon source saved to $outputPath"
