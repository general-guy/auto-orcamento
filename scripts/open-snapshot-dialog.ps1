param(
  [Parameter(Mandatory = $true)]
  [string]$InitialDirectory
)

Add-Type -AssemblyName System.Windows.Forms

if (-not (Test-Path -LiteralPath $InitialDirectory -PathType Container)) {
  [Console]::Error.WriteLine("Pasta inicial inexistente: $InitialDirectory")
  exit 2
}

$directory = (Get-Item -LiteralPath $InitialDirectory).FullName

$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.AutoUpgradeEnabled = $false
$dialog.RestoreDirectory = $true
$dialog.Filter = "Arquivos JSON (*.json)|*.json|Todos (*.*)|*.*"
$dialog.Title = "Abrir orçamento"
$dialog.InitialDirectory = $directory
$dialog.FileName = Join-Path $directory ".snapshot-open.json"

if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) {
  exit 1
}

Write-Output $dialog.FileName
