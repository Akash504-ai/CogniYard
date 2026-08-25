@echo off
setlocal
cd /d "%~dp0"
title CogniYard v2.3.1 VERIFIED - Keep This Window Open

rem This corrected release uses its own ports so an older CogniYard window
rem cannot be mistaken for the new website.
set "PORT=5101"
set "CLIENT_URL=http://localhost:3101,http://127.0.0.1:3101"
set "VITE_PORT=3101"
set "VITE_API_TARGET=http://127.0.0.1:5101"
set "VITE_APP_VERSION=2.3.1"

echo.
echo ==========================================
echo   CogniYard v2.3.1 - VERIFIED CORRECTIONS BUILD
echo ==========================================
echo.

echo Closing only an older CogniYard v2.3.1 process, if one is open...
for %%P in (3101 5101) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING"') do taskkill /F /PID %%A >nul 2>nul
)

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed.
  echo Install Node.js 20 or newer from https://nodejs.org/
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm is not available.
  echo Reinstall Node.js with npm enabled.
  pause
  exit /b 1
)

if not exist ".env" (
  copy /Y ".env.example" ".env" >nul
  echo Created .env from .env.example.
  echo OPTIONAL: Paste CLOUDINARY_URL in .env for real cloud invoice storage.
  echo Without it, supplier invoices use the persistent local demo store.
  echo Groq and Google values are optional.
  echo.
)

if not exist "node_modules" (
  echo Installing project dependencies. This runs only on first setup...
  call npm install
  if errorlevel 1 (
    echo.
    echo ERROR: npm install failed. Check your internet connection and Node.js version.
    pause
    exit /b 1
  )
)

echo.
echo Preparing the database and verifying demo login accounts...
call npm run bootstrap
if errorlevel 1 (
  echo.
  echo ERROR: CogniYard could not prepare the demo database.
  echo Make sure MongoDB Server is installed and its Windows service is Running.
  echo To check: press Windows+R, type services.msc, and start MongoDB Server.
  echo Then double-click this file again.
  pause
  exit /b 1
)

echo.
echo Starting CogniYard...
echo This VERIFIED release opens at http://127.0.0.1:3101
echo It does NOT use the old http://localhost:3000 window.
echo Press Ctrl+C to stop the app.
echo.
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 8; Start-Process 'http://127.0.0.1:3101/login?release=v2.3.1'"
call npm run dev

if errorlevel 1 (
  echo.
  echo CogniYard stopped with an error. Read the message above.
  echo Common cause: MongoDB is not running or DATABASE_URL is incorrect.
)

pause
endlocal
