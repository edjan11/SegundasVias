# Start nodemon in background if not already running
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-nodemon.ps1

try {
  $exists = Get-Process -Name nodemon -ErrorAction SilentlyContinue
} catch {
  $exists = $null
}

if ($exists) {
  Write-Host "nodemon already running (PID: $($exists.Id))." -ForegroundColor Yellow
  exit 0
}

Write-Host "Starting nodemon (freq:dev script) in background..." -ForegroundColor Green
# Start a detached PowerShell process that runs npm run freq:dev
$ps = "npm run freq:dev"
# Try cross-platform: prefer pwsh (PowerShell Core), fallback to powershell.exe
try {
  Start-Process -FilePath pwsh -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-Command","$ps" -WindowStyle Hidden -PassThru | Out-Null
} catch {
  Start-Process -FilePath powershell -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-Command","$ps" -WindowStyle Hidden -PassThru | Out-Null
}
Write-Host "nodemon start requested." -ForegroundColor Green
exit 0
