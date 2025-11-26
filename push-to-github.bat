@echo off
echo ========================================
echo VCANSHIP - Complete GitHub Push
echo ========================================
echo.

REM Configure Git with your details
echo Step 1: Configuring Git...
git config --global user.name "vijindran"
git config --global user.email "vijindran79@gmail.com"
echo ✓ Git configured

echo.
echo Step 2: Setting up GitHub remote...
git remote remove origin 2>nul
git remote add origin https://github.com/Vijindran79/VCANSHIP.git
echo ✓ Remote configured: https://github.com/Vijindran79/VCANSHIP.git

echo.
echo Step 3: Checking status...
git status

echo.
echo Step 4: Adding all changes...
git add .
echo ✓ Changes staged

echo.
echo Step 5: Creating commit...
git commit -m "feat: Complete application restoration and payment integration fix

Features:
- Fixed Stripe payment integration (LIVE keys)
- Added complete payment page HTML with cardholder name field
- Enhanced SeaRates FCL integration with realistic mock data
- Fixed corrupted schedules.ts file
- Deployed 11 Firebase Cloud Functions to production

Bug Fixes:
- Fixed 'Stripe container element not found' error
- Fixed 'Invalid API Key' 401 errors from Stripe
- Added missing cardholder-name input field
- Fixed schedules.ts export naming

Verified Working:
- Real Shippo parcel rates (DPD UK £27.33 confirmed)
- Live Stripe payment processing
- Address autocomplete via Geoapify
- All 11 backend Firebase functions

Deployment:
- Live URL: https://vcanship-onestop-logistics.web.app

Modified Files:
- functions/index.js (SeaRates fix)
- payment.ts (Stripe LIVE key)
- index.html (Payment page HTML + cardholder field)
- schedules.ts (Fixed corruption)"

if %ERRORLEVEL% EQU 0 (
    echo ✓ Commit created
) else (
    echo ⚠ No new changes to commit or commit already exists
)

echo.
echo ========================================
echo Step 6: Pushing to GitHub...
echo ========================================
echo.
echo Repository: https://github.com/Vijindran79/VCANSHIP.git
echo.
echo IMPORTANT: When prompted for credentials:
echo   Username: Vijindran79
echo   Password: Use your Personal Access Token (NOT your GitHub password)
echo.
echo Don't have a token? Create one here:
echo https://github.com/settings/tokens
echo - Click "Generate new token (classic)"
echo - Select "repo" scope
echo - Copy and paste the token when prompted
echo.
pause

git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✓✓✓ SUCCESS! ✓✓✓
    echo ========================================
    echo.
    echo Your code is now on GitHub!
    echo View it at: https://github.com/Vijindran79/VCANSHIP
    echo.
) else (
    echo.
    echo ========================================
    echo ⚠ Push Failed - Trying alternative branch...
    echo ========================================
    echo.
    echo Attempting to push to 'master' branch instead...
    git push -u origin master
    
    if %ERRORLEVEL% EQU 0 (
        echo ✓ Success! Pushed to master branch
    ) else (
        echo.
        echo Still failed. Common solutions:
        echo.
        echo 1. Authentication issue:
        echo    - Make sure you're using a Personal Access Token
        echo    - Get one from: https://github.com/settings/tokens
        echo.
        echo 2. Branch protection:
        echo    - Check your repository settings on GitHub
        echo.
        echo 3. First time push:
        echo    - The script already tried both 'main' and 'master' branches
        echo.
    )
)

echo.
pause
