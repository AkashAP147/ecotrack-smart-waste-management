# EcoTrack Test Data Setup Script
Write-Host "Setting up EcoTrack test data..." -ForegroundColor Green

# Create users
Write-Host "Creating users..." -ForegroundColor Yellow
$users = @(
    @{name="Admin User"; email="admin@ecotrack.com"; password="admin123"; phone="+1234567890"; role="admin"},
    @{name="John Collector"; email="collector@ecotrack.com"; password="collector123"; phone="+1234567891"; role="collector"},
    @{name="Sarah Collector"; email="collectot@gmail.com"; password="Ha12345"; phone="+1234567894"; role="collector"},
    @{name="Mike Collector"; email="collect@gmail.com"; password="collector123"; phone="+1234567893"; role="collector"},
    @{name="Regular User"; email="user@ecotrack.com"; password="user123"; phone="+1234567895"; role="user"},
    @{name="Test User"; email="user2@ecotrack.com"; password="user123"; phone="+1234567896"; role="user"}
)

foreach ($user in $users) {
    $body = $user | ConvertTo-Json
    try {
        Invoke-WebRequest -Uri "http://localhost:5000/api/auth/register" -Method POST -Headers @{"Content-Type"="application/json"} -Body $body | Out-Null
        Write-Host "Created user: $($user.email)" -ForegroundColor Green
    } catch {
        Write-Host "Failed to create user: $($user.email)" -ForegroundColor Red
    }
}

# Login as regular user and create reports
Write-Host "Creating reports..." -ForegroundColor Yellow
$loginResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"user@ecotrack.com","password":"user123"}'
$userToken = ($loginResponse.Content | ConvertFrom-Json).data.accessToken

$reports = @(
    @{description="Large pile of plastic bottles near the park entrance"; wasteType="plastic"; urgency="high"; lat=40.7128; lng=-74.0060; address="Central Park, New York"; estimatedQuantity="large"},
    @{description="Food waste scattered around restaurant dumpster"; wasteType="organic"; urgency="medium"; lat=40.7589; lng=-73.9851; address="Times Square, New York"; estimatedQuantity="medium"},
    @{description="Broken glass bottles on sidewalk - safety hazard"; wasteType="glass"; urgency="critical"; lat=40.7505; lng=-73.9934; address="Broadway, New York"; estimatedQuantity="small"},
    @{description="Electronic waste dumped behind office building"; wasteType="electronic"; urgency="high"; lat=40.7614; lng=-73.9776; address="Midtown Manhattan"; estimatedQuantity="medium"},
    @{description="Paper and cardboard overflow from recycling bin"; wasteType="paper"; urgency="low"; lat=40.7282; lng=-73.7949; address="Queens, New York"; estimatedQuantity="large"},
    @{description="Mixed waste pile near subway entrance"; wasteType="mixed"; urgency="medium"; lat=40.7831; lng=-73.9712; address="Upper West Side"; estimatedQuantity="medium"}
)

foreach ($report in $reports) {
    $body = $report | ConvertTo-Json
    try {
        Invoke-WebRequest -Uri "http://localhost:5000/api/report" -Method POST -Headers @{"Content-Type"="application/json";"Authorization"="Bearer $userToken"} -Body $body | Out-Null
        Write-Host "Created report: $($report.description.Substring(0,30))..." -ForegroundColor Green
    } catch {
        Write-Host "Failed to create report" -ForegroundColor Red
    }
}

# Login as admin and assign reports to collectors
Write-Host "Assigning reports to collectors..." -ForegroundColor Yellow
$adminLogin = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"admin@ecotrack.com","password":"admin123"}'
$adminToken = ($adminLogin.Content | ConvertFrom-Json).data.accessToken

$assignments = @(
    @{reportId="1"; collectorId="2"},  # John Collector
    @{reportId="2"; collectorId="2"},  # John Collector
    @{reportId="3"; collectorId="3"},  # Sarah Collector
    @{reportId="4"; collectorId="4"},  # Mike Collector
    @{reportId="5"; collectorId="2"},  # John Collector
    @{reportId="6"; collectorId="3"}   # Sarah Collector
)

foreach ($assignment in $assignments) {
    $body = $assignment | ConvertTo-Json
    try {
        Invoke-WebRequest -Uri "http://localhost:5000/api/admin/assign-collector" -Method POST -Headers @{"Content-Type"="application/json";"Authorization"="Bearer $adminToken"} -Body $body | Out-Null
        Write-Host "Assigned report $($assignment.reportId) to collector $($assignment.collectorId)" -ForegroundColor Green
    } catch {
        Write-Host "Failed to assign report $($assignment.reportId)" -ForegroundColor Red
    }
}

Write-Host "Test data setup complete!" -ForegroundColor Green
Write-Host "You can now login with:" -ForegroundColor Cyan
Write-Host "  Admin: admin@ecotrack.com / admin123" -ForegroundColor White
Write-Host "  Collector: collector@ecotrack.com / collector123" -ForegroundColor White
Write-Host "  Collector: collectot@gmail.com / Ha12345" -ForegroundColor White
Write-Host "  User: user@ecotrack.com / user123" -ForegroundColor White
