@echo off
echo ========================================
echo DEPLOYING TO FIREBASE
echo ========================================
echo.
echo Step 1: Building...
call npm run build
echo.
echo Step 2: Deploying to Firebase...
echo (You may need to login first with: firebase login --reauth)
call firebase deploy --only hosting
echo.
echo Done! Check: https://vcanship-onestop-logistics.web.app
pause

