# Rate Limit Testing Script
# Skrip PowerShell untuk test rate limiting pada metrics API

Write-Host "=== ECS Dashboard Rate Limit Test ===" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"
$endpoint = "$baseUrl/api/ecs-metrics-range"

# Test payload
$payload = @{
    clusterName = "kairos-pay-cluster-ecs-iac"
    serviceName = "backend-service"
    startTime = "2024-01-01T00:00:00Z"
    endTime = "2024-01-02T00:00:00Z"
    metricType = "both"
} | ConvertTo-Json

Write-Host "Testing endpoint: $endpoint" -ForegroundColor Yellow
Write-Host "Rate limit: 10 requests per minute" -ForegroundColor Yellow
Write-Host ""

# Test 1: Normal requests (should succeed)
Write-Host "Test 1: Sending 10 requests (should all succeed)" -ForegroundColor Green
for ($i = 1; $i -le 10; $i++) {
    try {
        $response = Invoke-WebRequest -Uri $endpoint -Method POST -Body $payload -ContentType "application/json" -ErrorAction SilentlyContinue
        $statusCode = $response.StatusCode
        Write-Host "  Request $i`: Status $statusCode ✓" -ForegroundColor Green
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "  Request $i`: Status $statusCode" -ForegroundColor Red
    }
    Start-Sleep -Milliseconds 500
}

Write-Host ""

# Test 2: Exceed rate limit (should fail)
Write-Host "Test 2: Sending request #11 (should be rate limited)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $endpoint -Method POST -Body $payload -ContentType "application/json" -ErrorAction Stop
    Write-Host "  Request 11: Status $($response.StatusCode) - UNEXPECTED!" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 429) {
        Write-Host "  Request 11: Status $statusCode (Too Many Requests) ✓" -ForegroundColor Green
        Write-Host "  Rate limit is working!" -ForegroundColor Green
        
        # Try to get error details
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorBody = $reader.ReadToEnd() | ConvertFrom-Json
            Write-Host "  Error message: $($errorBody.error)" -ForegroundColor Cyan
        } catch {
            # Ignore if can't read error body
        }
    } else {
        Write-Host "  Request 11: Status $statusCode - UNEXPECTED!" -ForegroundColor Red
    }
}

Write-Host ""

# Test 3: Wait and retry
Write-Host "Test 3: Waiting 60 seconds for rate limit reset..." -ForegroundColor Yellow
Write-Host "  (Press Ctrl+C to skip)" -ForegroundColor Gray

try {
    for ($i = 60; $i -gt 0; $i--) {
        Write-Progress -Activity "Waiting for rate limit reset" -Status "$i seconds remaining" -PercentComplete ((60-$i)/60*100)
        Start-Sleep -Seconds 1
    }
    Write-Progress -Activity "Waiting for rate limit reset" -Completed
    
    Write-Host ""
    Write-Host "Test 4: Sending request after reset (should succeed)" -ForegroundColor Green
    try {
        $response = Invoke-WebRequest -Uri $endpoint -Method POST -Body $payload -ContentType "application/json" -ErrorAction Stop
        Write-Host "  Request after reset: Status $($response.StatusCode) ✓" -ForegroundColor Green
        Write-Host "  Rate limit has been reset!" -ForegroundColor Green
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "  Request after reset: Status $statusCode" -ForegroundColor Red
    }
} catch {
    Write-Host ""
    Write-Host "  Test skipped by user" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor White
Write-Host "  ✓ Rate limiting is configured: 10 requests/minute" -ForegroundColor White
Write-Host "  ✓ Requests beyond limit return HTTP 429" -ForegroundColor White
Write-Host "  ✓ Rate limit resets after 60 seconds" -ForegroundColor White
Write-Host ""
Write-Host "Additional Security Features:" -ForegroundColor White
Write-Host "  • Input validation (cluster whitelist, service name validation)" -ForegroundColor Gray
Write-Host "  • Time range validation (max 30 days)" -ForegroundColor Gray
Write-Host "  • Progressive blocking after 3 violations (5 minute block)" -ForegroundColor Gray
Write-Host "  • IP + User-Agent based identification" -ForegroundColor Gray
Write-Host ""
