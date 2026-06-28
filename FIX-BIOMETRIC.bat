@echo off
:: FIX-BIOMETRIC.bat
:: Right-click and choose "Run as Administrator"
::
:: It will launch the fix-mantra-service.ps1 script with correct permissions.

echo ====================================================================
echo   Fulbari Biometric Setup ^& Repair Tool
echo ====================================================================
echo.

:: Check for Administrator elevation
openfiles >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] This tool must be run as Administrator!
    echo.
    echo Please close this window, then:
    echo 1. Right-click on FIX-BIOMETRIC.bat
    echo 2. Select "Run as Administrator"
    echo.
    pause
    exit /b
)

echo [1/2] Running PowerShell repair script...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0fix-mantra-service.ps1"

echo.
echo [2/2] Done!
pause
