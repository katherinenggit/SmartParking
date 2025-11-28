@echo off
echo ========================================
echo    Kill Process on Port 3001
echo ========================================
echo.

echo Dang tim process dang dung port 3001...
netstat -ano | findstr :3001

echo.
echo Dang kill tat ca process...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    echo Killing process PID: %%a
    taskkill /F /PID %%a >nul 2>&1
    if !errorlevel! == 0 (
        echo ✓ Da kill process PID: %%a
    ) else (
        echo ✗ Khong the kill process PID: %%a
    )
)

echo.
timeout /t 1 >nul

echo Kiem tra lai...
netstat -ano | findstr :3001
if %errorlevel% == 0 (
    echo ⚠️  Van con process dang dung port 3001!
) else (
    echo ✅ Port 3001 da trong!
)

echo.
pause

