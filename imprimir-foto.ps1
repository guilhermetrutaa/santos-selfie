param(
  [string]$ImagePath = '',
  [string]$PrinterName = '',
  [switch]$ListOnly
)

$ErrorActionPreference = 'Stop'

function Write-PrintError {
  param([string]$Message)
  Write-Output ("ERROR:" + $Message)
  exit 1
}

try {
  Add-Type -AssemblyName System.Drawing
} catch {
  Write-PrintError 'O Windows nao conseguiu abrir a impressao.'
}

function Resolve-SantoPrinter {
  param([string]$Preferred)
  $installed = @([System.Drawing.Printing.PrinterSettings]::InstalledPrinters)
  if ($Preferred) {
    foreach ($name in $installed) {
      if ($name -eq $Preferred) { return $name }
    }
    Write-PrintError ("Impressora nao encontrada: " + $Preferred)
  }
  foreach ($pattern in @('*G3110*', '*G3010*', '*Canon*')) {
    foreach ($name in $installed) {
      if ($name -like $pattern) { return $name }
    }
  }
  $fallback = New-Object System.Drawing.Printing.PrinterSettings
  if ($fallback.PrinterName) { return $fallback.PrinterName }
  Write-PrintError 'Nenhuma impressora instalada.'
}

$chosen = Resolve-SantoPrinter -Preferred $PrinterName
$probe = New-Object System.Drawing.Printing.PrinterSettings
$probe.PrinterName = $chosen
if (-not $probe.IsValid) {
  Write-PrintError ("Impressora nao encontrada: " + $chosen)
}

if ($ListOnly) {
  Write-Output ("PRINTER:" + $probe.PrinterName)
  Write-Output ("PAPER:" + $probe.DefaultPageSettings.PaperSize.PaperName)
  exit 0
}

if (-not $ImagePath -or -not (Test-Path -LiteralPath $ImagePath)) {
  Write-PrintError 'A foto para imprimir nao foi encontrada.'
}

$script:photo = $null
$document = $null
try {
  $script:photo = [System.Drawing.Image]::FromFile((Resolve-Path -LiteralPath $ImagePath))
  $document = New-Object System.Drawing.Printing.PrintDocument
  $document.PrinterSettings.PrinterName = $chosen
  $document.PrinterSettings.Copies = 1
  $document.DocumentName = 'SantoSelfie'
  $document.PrintController = New-Object System.Drawing.Printing.StandardPrintController
  $document.add_PrintPage({
    param($sender, $e)
    $e.Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $e.Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $e.Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $e.Graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $bounds = $e.PageBounds
    $e.Graphics.Clear([System.Drawing.Color]::White)
    $scale = [Math]::Min($bounds.Width / $script:photo.Width, $bounds.Height / $script:photo.Height)
    $width = $script:photo.Width * $scale
    $height = $script:photo.Height * $scale
    $x = $bounds.X + (($bounds.Width - $width) / 2)
    $y = $bounds.Y + (($bounds.Height - $height) / 2)
    $dest = New-Object System.Drawing.RectangleF -ArgumentList ([single]$x), ([single]$y), ([single]$width), ([single]$height)
    $e.Graphics.DrawImage($script:photo, $dest)
    $e.HasMorePages = $false
  })
  $document.Print()
  Write-Output ("PRINTER:" + $document.PrinterSettings.PrinterName)
  Write-Output ("PAPER:" + $document.DefaultPageSettings.PaperSize.PaperName)
} catch {
  Write-PrintError $_.Exception.Message
} finally {
  if ($script:photo) { $script:photo.Dispose() }
  if ($document) { $document.Dispose() }
}
