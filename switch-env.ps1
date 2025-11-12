param(
  [Parameter(Mandatory=$true)][ValidateSet('staging','production')]
  [string]$target
)

$root = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
Write-Host "Switching environment to: $target" -ForegroundColor Cyan

$envFile = ".env.$target.local"
$sourcePath = Join-Path $root $envFile
$destPath = Join-Path $root ".env.local"

if (-Not (Test-Path $sourcePath)) {
  Write-Host "Source env file not found: $sourcePath" -ForegroundColor Red
  exit 1
}

Copy-Item $sourcePath $destPath -Force
Write-Host "Updated .env.local from $envFile" -ForegroundColor Green

Write-Host "Current .env.local preview:" -ForegroundColor Yellow
Get-Content $destPath | Select-Object -First 5 | ForEach-Object { Write-Host $_ }
