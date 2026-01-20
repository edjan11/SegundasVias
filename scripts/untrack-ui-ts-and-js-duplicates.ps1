<#
PowerShell helper to untrack ui/ts from Git and untrack .js files that have a .ts counterpart.
Run from repo root (PowerShell):

  .\scripts\untrack-ui-ts-and-js-duplicates.ps1

This script will:
- add ui/ts/ to .gitignore (already done by the automated patch)
- run `git rm --cached -r ui/ts` to stop tracking that folder (prompted)
- find all tracked .js files that have a same-path .ts file and run `git rm --cached` on them

It will only print the git commands it would run; re-run with `-Exec` to actually execute them.
#>
param(
    [switch]$Exec
)

function RunGit([string[]]$args) {
    $cmdline = "git " + ($args -join ' ')
    if ($Exec) {
        Write-Host "EXECUTING: $cmdline" -ForegroundColor Yellow
        try {
            & git @args
        } catch {
            Write-Host "git failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "DRY-RUN: $cmdline"
    }
}

# ensure git is available
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "git not found in PATH. Install git or run these commands manually."
    exit 1
}

# untrack ui/ts directory
$cmd = "git rm -r --cached -- ui/ts"
if ($Exec) {
    Write-Host "EXECUTING: $cmd" -ForegroundColor Yellow
    try { & git 'rm' '-r' '--cached' '--' 'ui/ts' } catch { Write-Host "git failed: $($_.Exception.Message)" -ForegroundColor Red }
} else {
    Write-Host "DRY-RUN: $cmd"
}

# find tracked .js files with a .ts counterpart
$trackedJs = git ls-files --full-name -z | Out-String -Stream | Where-Object { $_ -match '\.js$' } | ForEach-Object { $_.Trim() }
$toUntrack = @()
foreach ($js in $trackedJs) {
    $ts = [io.path]::ChangeExtension($js, '.ts')
    if (Test-Path $ts) {
        $toUntrack += $js
    }
}

if ($toUntrack.Count -eq 0) {
    Write-Host "No tracked .js files with .ts counterparts found."
} else {
    foreach ($f in $toUntrack) {
        $cmd = "git rm --cached -- '$f'"
        if ($Exec) {
            Write-Host "EXECUTING: $cmd" -ForegroundColor Yellow
            try { & git 'rm' '--cached' '--' $f } catch { Write-Host "git failed: $($_.Exception.Message)" -ForegroundColor Red }
        } else {
            Write-Host "DRY-RUN: $cmd"
        }
    }
}

Write-Host "\nDONE. If you ran in dry-run mode, re-run with -Exec to perform the removals."
