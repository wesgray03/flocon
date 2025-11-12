# Simple Prospects Migration Runner
# Usage: .\run-migration-simple.ps1

$ErrorActionPreference = "Continue"

# Staging configuration
$url = 'https://hieokzpxehyelhbubbpb.supabase.co'
$key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1ODQsImV4cCI6MjA3ODAzMTU4NH0.NDXes_vCvs9ocgJcc4BXqFXe68SUjRkBz_wEqvprLVo'

# Migration files
$migrations = @(
    '2025-11-09-create-trades-table.sql',
    '2025-11-09-convert-projects-to-engagements.sql',
    '2025-11-09-create-engagement-trades.sql',
    '2025-11-09-create-prospect-promotion-functions.sql',
    '2025-11-09-create-prospect-project-views.sql',
    '2025-11-09-setup-engagements-rls.sql'
)

Write-Host "Starting Migrations on STAGING..." -ForegroundColor Green
Write-Host ""

$successCount = 0

foreach ($migration in $migrations) {
    Write-Host "Running: $migration" -ForegroundColor Cyan
    
    $filePath = ".\db\migrations\$migration"
    
    if (-not (Test-Path $filePath)) {
        Write-Host "  ERROR: File not found" -ForegroundColor Red
        continue
    }
    
    $sql = Get-Content $filePath -Raw -Encoding UTF8
    
    # Remove BEGIN/COMMIT as exec_sql handles transactions
    $sql = $sql -replace '^\s*BEGIN\s*;\s*', ''
    $sql = $sql -replace '\s*COMMIT\s*;\s*$', ''
    
    $body = @{
        sql = $sql
    } | ConvertTo-Json -Depth 10 -Compress
    
    $headers = @{
        'apikey' = $key
        'Authorization' = "Bearer $key"
        'Content-Type' = 'application/json'
        'Prefer' = 'return=representation'
    }
    
    $rpcUrl = "$url/rest/v1/rpc/exec_sql"
    
    try {
        Write-Host "  Sending to Supabase..." -NoNewline
        
        $response = Invoke-WebRequest -Uri $rpcUrl -Method Post -Headers $headers -Body $body -TimeoutSec 30 -UseBasicParsing
        
        if ($response.StatusCode -eq 200) {
            Write-Host " SUCCESS!" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host " FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
            Write-Host "  Response: $($response.Content)"
        }
    }
    catch {
        Write-Host " FAILED" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        
        # Try to get more details from the response
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "  Details: $responseBody" -ForegroundColor Yellow
        }
        
        if ($_.Exception.Message -like "*exec_sql*") {
            Write-Host ""
            Write-Host "  The exec_sql function doesn't exist!" -ForegroundColor Yellow
            Write-Host "  Run this in Supabase SQL Editor:" -ForegroundColor Yellow
            Write-Host "  db/migrations/0000-setup-exec-sql-helper.sql" -ForegroundColor Yellow
            break
        }
    }
    
    Write-Host ""
}

Write-Host "================================" -ForegroundColor Green
Write-Host "Complete! $successCount of $($migrations.Count) migrations succeeded" -ForegroundColor Green
