@echo off
echo ========================================
echo VCANSHIP Deployment Fix Script
echo ========================================

echo Step 1: Cleaning previous build...
if exist dist rmdir /s /q dist
if exist node_modules\.vite rmdir /s /q node_modules\.vite

echo Step 2: Installing dependencies...
npm install

echo Step 3: Building project...
npm run build

echo Step 4: Verifying build output...
if exist dist\index.html (
    echo ✓ index.html found in dist
) else (
    echo ✗ index.html NOT found in dist
    exit /b 1
)

if exist dist\assets (
    echo ✓ Assets directory found
    dir dist\assets
) else (
    echo ✗ Assets directory NOT found
    exit /b 1
)

echo Step 5: Deploying to Firebase...
firebase deploy --only hosting

echo ========================================
echo Deployment completed!
echo ========================================
pause