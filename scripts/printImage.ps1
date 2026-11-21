param(
    [string]$FilePath,
    [string]$PrinterName = "EPSON L8050 Series",
    [int]$Copies = 1
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $FilePath)) {
    Write-Error "File not found: $FilePath"
    exit 1
}

$doc = New-Object System.Drawing.Printing.PrintDocument
$doc.PrintController = New-Object System.Drawing.Printing.StandardPrintController
$doc.PrinterSettings.PrinterName = $PrinterName
$doc.PrinterSettings.Copies = [Math]::Max(1, $Copies)

if (-not $doc.PrinterSettings.IsValid) {
    Write-Error "Invalid printer: $PrinterName"
    exit 1
}

$image = [System.Drawing.Image]::FromFile($FilePath)

# Handle landscape vs portrait
if ($image.Width -gt $image.Height) {
    $doc.DefaultPageSettings.Landscape = $true
} else {
    $doc.DefaultPageSettings.Landscape = $false
}

# Borderless printing margins
$doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
$doc.OriginAtMargins = $false

$printHandler = {
    param($sender, $ev)
    
    # Calculate scale to fill page bounds
    $destRect = $ev.PageBounds
    
    # Draw high quality
    $ev.Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $ev.Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $ev.Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    
    $ev.Graphics.DrawImage($image, $destRect)
    $ev.HasMorePages = $false
}.GetNewClosure()

$doc.add_PrintPage($printHandler)

try {
    $doc.Print()
    Write-Output "SUCCESS_PRINT_QUEUED"
} catch {
    Write-Error $_
    exit 1
} finally {
    $image.Dispose()
    $doc.Dispose()
}
