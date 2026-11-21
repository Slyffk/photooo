param(
    [string]$FilePath,
    [string]$PrinterName = "EPSON L8050 Series"
)

Add-Type -AssemblyName System.Drawing

$doc = New-Object System.Drawing.Printing.PrintDocument
$doc.PrintController = New-Object System.Drawing.Printing.StandardPrintController
$doc.PrinterSettings.PrinterName = $PrinterName

Write-Output ("Printer valid: " + $doc.PrinterSettings.IsValid)
Write-Output ("Printer name: " + $doc.PrinterSettings.PrinterName)
Write-Output ("Printer status: " + $doc.PrinterSettings.PrinterStateReason)

$image = [System.Drawing.Image]::FromFile($FilePath)
Write-Output ("Image size: " + $image.Width + "x" + $image.Height)

$handler = {
    param($s, $e)
    $e.Graphics.DrawImage($image, $e.PageBounds)
    $e.HasMorePages = $false
}.GetNewClosure()

$doc.add_PrintPage($handler)

try {
    $doc.Print()
    Write-Output "PRINT_CALLED_SUCCESSFULLY"
} catch {
    Write-Error $_
} finally {
    $image.Dispose()
    $doc.Dispose()
}
