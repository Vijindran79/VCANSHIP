@echo off
echo ========================================
echo VCANSHIP - FORCE CLEAN UPDATE
echo ========================================
echo.
echo This script will make your GitHub repository EXACTLY match your computer.
echo Any files you deleted locally will be deleted from GitHub.
echo.

REM Configure Git
git config --global user.name "vijindran"
git config --global user.email "vijindran79@gmail.com"

echo Step 1: Adding all current files...
git add .
echo ✓ Files staged

echo.
echo Step 2: Committing changes...
git commit -m "fix: Complete UI/UX overhaul and cleanup
- Removed Baggage and Inland Transport services
- Fixed mobile navigation and address autocomplete
- Updated sidebar to show all services
- Renamed files for cache busting (index.css -> main.css)
- Fixed double initialization bug"

echo.
echo Step 3: Pushing to GitHub (FORCE UPDATE)...
echo.
echo IMPORTANT: This will overwrite the history on GitHub to match your computer.
echo If asked for credentials, use your Personal Access Token.
echo.

git push --force -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✓✓✓ SUCCESS! ✓✓✓
    echo ========================================
    echo.
    echo Your GitHub repo is now 100%% synchronized with your computer.
    echo Deleted files are gone for good.
) else (
    echo.
    echo ⚠ Push Failed. Please check your internet or credentials.
)

pause
