$map = Get-Content .\docs-move-plan.json | ConvertFrom-Json
foreach ($i in $map) {
  $destDir = Split-Path -Path $i.dest -Parent
  if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
  git mv -f -- "$($i.path)" "$($i.dest)"
  Write-Output "Moved: $($i.path) -> $($i.dest)"
}
