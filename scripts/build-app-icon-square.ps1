Add-Type -AssemblyName System.Drawing

$rootDir = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $rootDir "assets/app-icon-g.png"
$outputPath = Join-Path $rootDir "assets/app-icon-square.png"

$source = [System.Drawing.Image]::FromFile($sourcePath)
$targetSize = 1024
$canvas = New-Object System.Drawing.Bitmap $targetSize, $targetSize
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
$graphics.Clear([System.Drawing.Color]::White)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$scale = [Math]::Min($targetSize / $source.Width, $targetSize / $source.Height) * 0.82
$newWidth = [int]($source.Width * $scale)
$newHeight = [int]($source.Height * $scale)
$x = [int](($targetSize - $newWidth) / 2)
$y = [int](($targetSize - $newHeight) / 2)
$graphics.DrawImage($source, $x, $y, $newWidth, $newHeight)
$canvas.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$canvas.Dispose()
$source.Dispose()

Write-Output "Icon source saved to $outputPath"
