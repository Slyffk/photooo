# Windows Kiosk Power & Display Configuration
# Run as Administrator to configure dedicated Photo Booth PC settings

Write-Host "Configuring Windows display and power options for 24/7 Kiosk operation..." -ForegroundColor Cyan

# 1. Disable Monitor Sleep on AC Power
powercfg /change monitor-timeout-ac 0
Write-Host "Monitor timeout set to Never (AC)" -ForegroundColor Green

# 2. Disable Standby / System Sleep on AC Power
powercfg /change standby-timeout-ac 0
Write-Host "System standby set to Never (AC)" -ForegroundColor Green

# 3. Disable Hibernate
powercfg /hibernate off
Write-Host "Hibernation disabled" -ForegroundColor Green

Write-Host "Windows Kiosk power configuration complete!" -ForegroundColor Cyan
