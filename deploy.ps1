Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DEPLOYING TO FIREBASE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Building..." -ForegroundColor Yellow
npm run build

Write-Host ""
Write-Host "Step 2: Deploying to Firebase..." -ForegroundColor Yellow
Write-Host "(You may need to login first with: firebase login --reauth)" -ForegroundColor Gray
firebase deploy --only hosting

Write-Host ""
Write-Host "Done! Check: https://vcanship-onestop-logistics.web.app" -ForegroundColor Green
Read-Host "Press Enter to exit"

