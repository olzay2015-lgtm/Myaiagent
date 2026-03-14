# Start AI Agent Platform API Server
Write-Host "Starting AI Agent Platform API Server..." -ForegroundColor Green

$job = Start-Job -ScriptBlock {
    Set-Location "C:\Users\olzay\OneDrive\Рабочий стол\AI AGENT\ai-agent-platform\apps\api"
    & "C:\Program Files\nodejs\node.exe" "src\index.js"
}

Start-Sleep -Seconds 3

Write-Host "`nTesting server..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/health" -Method GET -TimeoutSec 5
    Write-Host "`n✅ Server is running!" -ForegroundColor Green
    Write-Host "Health check: http://localhost:4000/health" -ForegroundColor Cyan
    Write-Host "API: http://localhost:4000/" -ForegroundColor Cyan
    Write-Host "`nServer Status: $($response.status)" -ForegroundColor Green
    Write-Host "Timestamp: $($response.timestamp)" -ForegroundColor Gray
} catch {
    Write-Host "`n❌ Server test failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`nPress Ctrl+C to stop the server" -ForegroundColor Yellow

# Keep the script running
while ($true) {
    Start-Sleep -Seconds 1
}
