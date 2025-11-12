# Test Supabase Connection
# This tests if we can reach Supabase and call exec_sql

$url = 'https://hieokzpxehyelhbubbpb.supabase.co'
$key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1ODQsImV4cCI6MjA3ODAzMTU4NH0.NDXes_vCvs9ocgJcc4BXqFXe68SUjRkBz_wEqvprLVo'

Write-Host "Testing Supabase connection..." -ForegroundColor Cyan

$body = @{
    sql = "SELECT 1 as test"
} | ConvertTo-Json

$headers = @{
    'apikey' = $key
    'Authorization' = "Bearer $key"
    'Content-Type' = 'application/json'
}

$rpcUrl = "$url/rest/v1/rpc/exec_sql"

Write-Host "URL: $rpcUrl"
Write-Host "Calling API..." -NoNewline

try {
    $response = Invoke-RestMethod -Uri $rpcUrl -Method Post -Headers $headers -Body $body -TimeoutSec 10
    Write-Host " SUCCESS!" -ForegroundColor Green
    Write-Host "Response: $response"
}
catch {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
}
