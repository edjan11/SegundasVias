param(
  [string]$Pattern = "*.pdf,*.docx,*.html"
)

$base = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $base

# Detect python in .venv if available, otherwise fallback to system python
$venvPy = Join-Path $base '.venv\Scripts\python.exe'
$venvPyUnix = Join-Path $base '.venv/bin/python'
if (Test-Path $venvPy) {
  $python = $venvPy
} elseif (Test-Path $venvPyUnix) {
  $python = $venvPyUnix
} else {
  Write-Host "Aviso: venv não encontrado em .venv. Ative manualmente (ex.: .\\.venv\\Scripts\\Activate.ps1) ou instale dependências com pip."
  $python = "python"
}

& $python ./scripts/convert.py --input ./in --output ./out --pattern $Pattern

Pop-Location
