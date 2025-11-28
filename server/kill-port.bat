@echo off
echo ========================================
echo    Kill Process on Port 3001
echo ========================================
echo.

echo Dang tim process dang dung port 3001...
netstat -ano | findstr :3001

echo.
echo Dang kill process...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    echo Killing process PID: %%a
    taskkill /F /PID %%a
)

echo.
echo Done!
pause

