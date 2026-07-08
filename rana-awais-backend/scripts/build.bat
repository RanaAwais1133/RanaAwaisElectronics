@echo off
echo ============================================
echo  BUILDING RANA AWAIS ELECTRONICS SYSTEM
echo ============================================
echo.

REM Build frontend
echo [1/2] Building frontend...
cd /d "%~dp0..\..\rana-awais-frontend"
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Frontend build failed!
    pause
    exit /b 1
)
echo Frontend build complete.

REM Build backend
echo.
echo [2/2] Building backend...
cd /d "%~dp0.."
go build -ldflags="-s -w" -o rana-awais-electronics.exe ./cmd/server/
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Backend build failed!
    pause
    exit /b 1
)

echo.
echo ============================================
echo  BUILD SUCCESSFUL
echo ============================================
echo.
echo Output: rana-awais-electronics.exe

for %%A in (rana-awais-electronics.exe) do echo Size: %%~zA bytes

echo.
echo ============================================
echo  DEPLOYMENT INSTRUCTIONS
echo ============================================
echo.
echo To deploy:
echo   1. Copy these files to deployment folder:
echo      - rana-awais-electronics.exe
echo      - .env (copy from backend folder if exists)
echo      - rana-awais-frontend\build\ (entire folder)
echo.
echo   2. Run: rana-awais-electronics.exe
echo.
echo   3. Open: http://localhost:8080
echo.
echo   Default Admin: admin / admin123
echo   License Key: Huzaifaish1133@#$%%
echo.
echo ============================================
pause