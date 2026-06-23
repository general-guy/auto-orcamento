Add-Type -AssemblyName System.Drawing

function New-TransparentLogoBitmap {
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

function Export-TightLogoCrop {
  param(
    [System.Drawing.Bitmap]$TransparentBitmap,
    [string]$Label
  )

  $bounds = Get-OpaqueBounds -Bitmap $TransparentBitmap
  if ($null -eq $bounds) {
    return $null
  }

  $cropped = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($cropped)
  $graphics.DrawImage(
    $TransparentBitmap,
    (New-Object System.Drawing.Rectangle 0, 0, $bounds.Width, $bounds.Height),
    (New-Object System.Drawing.Rectangle $bounds.X, $bounds.Y, $bounds.Width, $bounds.Height),
    [System.Drawing.GraphicsUnit]::Pixel
  )
  $graphics.Dispose()
  $TransparentBitmap.Dispose()

  return [PSCustomObject]@{
    Label = $Label
    Bitmap = $cropped
    Width = $bounds.Width
    Height = $bounds.Height
    Area = ($bounds.Width * $bounds.Height)
  }
}

function Import-LogoCandidateFromFile {
  param(
    [string]$Path,
    [string]$Label,
    [int]$WhiteThreshold = 252,
    [switch]$PreserveSize
  )

  if (-not (Test-Path $Path)) {
    return $null
  }

  $source = [System.Drawing.Image]::FromFile($Path)
  $transparent = New-TransparentLogoBitmap -Source $source -WhiteThreshold $WhiteThreshold
  $source.Dispose()

  if ($PreserveSize) {
    return [PSCustomObject]@{
      Label = $Label
      Bitmap = $transparent
      Width = $transparent.Width
      Height = $transparent.Height
      Area = ($transparent.Width * $transparent.Height)
    }
  }

  return Export-TightLogoCrop -TransparentBitmap $transparent -Label $Label
}

function Import-LogoCandidateFromTimbrado {
  param(
    [string]$TimbradoPath
  )

  if (-not (Test-Path $TimbradoPath)) {
    return $null
  }

  $source = [System.Drawing.Image]::FromFile($TimbradoPath)
  $cropWidth = [int]($source.Width * 0.16)
  $cropHeight = [int]($source.Height * 0.17)

  $crop = New-Object System.Drawing.Bitmap $cropWidth, $cropHeight, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($crop)
  $graphics.DrawImage(
    $source,
    (New-Object System.Drawing.Rectangle 0, 0, $cropWidth, $cropHeight),
    (New-Object System.Drawing.Rectangle 0, 0, $cropWidth, $cropHeight),
    [System.Drawing.GraphicsUnit]::Pixel
  )
  $graphics.Dispose()
  $source.Dispose()

  $transparent = New-TransparentLogoBitmap -Source $crop
  $crop.Dispose()
  return Export-TightLogoCrop -TransparentBitmap $transparent -Label "timbrado"
}
