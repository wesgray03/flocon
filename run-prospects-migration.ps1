# Run Prospects Migrations via Supabase API
# Usage: .\run-prospects-migration.ps1 [staging|production]

param(
    [ValidateSet('staging', 'production')]
    [string]$Environment = 'staging'
)

$ErrorActionPreference = "Stop"

# Configuration
$Environments = @{
    staging = @{
        url = 'https://hieokzpxehyelhbubbpb.supabase.co'
        key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1ODQsImV4cCI6MjA3ODAzMTU4NH0.NDXes_vCvs9ocgJcc4BXqFXe68SUjRkBz_wEqvprLVo'
    }
    production = @{
        url = 'https://groxqyaoavmfvmaymhbe.supabase.co'
        key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzgxNTMsImV4cCI6MjA3NzI1NDE1M30.SQ2G5gRVn2Zlo1q7j1faxq5ZPAZgphzzBY6XFh3Ovw4'
    }
}

$config = $Environments[$Environment]

# Migration files in order
$migrations = @(
    '2025-11-09-create-trades-table.sql',
    '2025-11-09-convert-projects-to-engagements.sql',
    '2025-11-09-create-engagement-trades.sql',
    '2025-11-09-create-prospect-promotion-functions.sql',
    '2025-11-09-create-prospect-project-views.sql',
    '2025-11-09-setup-engagements-rls.sql'
)

Write-Host "Starting Prospects Migration" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Environment: $($Environment.ToUpper())"
Write-Host "Supabase URL: $($config.url)"
Write-Host ""

# Safety check for production
if ($Environment -eq 'production') {
    Write-Host "WARNING: You are about to run migrations on PRODUCTION!" -ForegroundColor Yellow
    $confirmation = Read-Host "Are you sure you want to continue? (yes/no)"
    if ($confirmation -ne 'yes' -and $confirmation -ne 'y') {
        Write-Host "Aborted by user" -ForegroundColor Red
        exit 0
    }
}

$successCount = 0
$migrationsDir = Join-Path $PSScriptRoot "db\migrations"

foreach ($migration in $migrations) {
    Write-Host ""
    Write-Host "Running: $migration" -ForegroundColor Cyan
    
    $filePath = Join-Path $migrationsDir $migration
    
    if (-not (Test-Path $filePath)) {
        Write-Host "   File not found: $filePath" -ForegroundColor Red
        exit 1
    }
    
    $sql = Get-Content $filePath -Raw -Encoding UTF8
    
    # Call Supabase RPC function
    $body = @{
        sql = $sql
    } | ConvertTo-Json -Depth 10
    
    $headers = @{
        'apikey' = $config.key
        'Authorization' = "Bearer $($config.key)"
        'Content-Type' = 'application/json'
    }
    
    $rpcUrl = "$($config.url)/rest/v1/rpc/exec_sql"
    
    try {
        $response = Invoke-RestMethod -Uri $rpcUrl -Method Post -Headers $headers -Body $body
        Write-Host "   Success!" -ForegroundColor Green
        $successCount++
    }
    catch {
        $errorMessage = $_.Exception.Message
        
        # Check if exec_sql function does not exist
        if ($errorMessage -like "*function public.exec_sql*") {
            Write-Host ""
            Write-Host "   The exec_sql helper function is not set up in Supabase." -ForegroundColor Red
            Write-Host ""
            Write-Host "   To fix this:" -ForegroundColor Yellow
            Write-Host "      1. Go to Supabase SQL Editor"
            Write-Host "      2. Run: db/migrations/0000-setup-exec-sql-helper.sql"
            Write-Host "      3. Try running this script again"
            Write-Host ""
            exit 1
        }
        
        Write-Host "   Failed: $errorMessage" -ForegroundColor Red
        Write-Host ""
        Write-Host "   Stopping migrations to prevent cascading failures." -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "Migration Complete!" -ForegroundColor Green
Write-Host "   $successCount migrations applied"
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Verify data in Supabase dashboard"
Write-Host "   2. Test creating a prospect"
Write-Host "   3. Test promoting prospect to project"
Write-Host "   4. Update user roles (Sales vs Ops)"
Write-Host "   5. Build Prospects UI"
Write-Host ""
