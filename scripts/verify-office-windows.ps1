param(
  [Parameter(Position = 0)]
  [string]$Path = ".office-smoke"
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path -LiteralPath $Path).Path
$files = Get-ChildItem -LiteralPath $root -File | Where-Object { $_.Extension -in ".docx", ".dotx", ".xlsx", ".pptx" }
if (-not $files) { throw "No Office files found in $root" }

$apps = @{}
try {
  foreach ($file in $files) {
    switch ($file.Extension.ToLowerInvariant()) {
      { $_ -in ".docx", ".dotx" } {
        if (-not $apps.Word) { $apps.Word = New-Object -ComObject Word.Application; $apps.Word.Visible = $false; $apps.Word.DisplayAlerts = 0 }
        $document = $apps.Word.Documents.Open($file.FullName, $false, $true, $false)
        $document.Close($false)
      }
      ".xlsx" {
        if (-not $apps.Excel) { $apps.Excel = New-Object -ComObject Excel.Application; $apps.Excel.Visible = $false; $apps.Excel.DisplayAlerts = $false }
        $workbook = $apps.Excel.Workbooks.Open($file.FullName, 0, $true)
        $workbook.Close($false)
      }
      ".pptx" {
        if (-not $apps.PowerPoint) { $apps.PowerPoint = New-Object -ComObject PowerPoint.Application }
        $presentation = $apps.PowerPoint.Presentations.Open($file.FullName, $true, $false, $false)
        $presentation.Close()
      }
    }
    Write-Host "OK $($file.Name)"
  }
} finally {
  if ($apps.Word) { $apps.Word.Quit() }
  if ($apps.Excel) { $apps.Excel.Quit() }
  if ($apps.PowerPoint) { $apps.PowerPoint.Quit() }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
