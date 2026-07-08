@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   🏪 MyElectronics - Fresh Build
echo ========================================
echo.

REM ===== STEP 1: Build Backend (server.exe) =====
echo [1/4] Building Backend Server...
cd /d "%~dp0rana-awais-backend"
go build -ldflags="-s -w" -o "%~dp0build\backend.exe" ./cmd/server/
if %errorlevel% neq 0 (
    echo ❌ Backend build failed!
    pause
    exit /b 1
)
echo    ✅ Backend built: build\backend.exe

REM ===== STEP 2: Build Launcher (launcher.exe) =====
echo [2/4] Building Launcher...
go build -ldflags="-s -w" -o "%~dp0build\launcher.exe" ./cmd/launcher/
if %errorlevel% neq 0 (
    echo ❌ Launcher build failed!
    pause
    exit /b 1
)
echo    ✅ Launcher built: build\launcher.exe

REM ===== STEP 3: Build Frontend =====
echo [3/4] Building Frontend (React)...
cd /d "%~dp0rana-awais-frontend"
call npm install --silent
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Frontend build failed!
    pause
    exit /b 1
)
echo    ✅ Frontend built: rana-awais-frontend\build\

REM ===== STEP 4: Create MyElectronics Package =====
echo [4/4] Creating MyElectronics Package...
cd /d "%~dp0"

REM Clean old package
if exist "MyElectronics" rmdir /s /q "MyElectronics"
mkdir "MyElectronics"

REM Copy executables
copy "build\backend.exe" "MyElectronics\backend.exe" >nul
copy "build\launcher.exe" "MyElectronics\launcher.exe" >nul

REM Copy frontend build
xcopy /e /i /q "rana-awais-frontend\build" "MyElectronics\frontend" >nul

REM Copy database (if exists)
if exist "rana-awais.db" (
    copy "rana-awais.db" "MyElectronics\rana-awais.db" >nul
    echo    ✅ Database copied
)

REM Copy config files
if exist "client-config.json" copy "client-config.json" "MyElectronics\" >nul

REM Create a README
echo MyElectronics ERP System > "MyElectronics\README.txt"
echo. >> "MyElectronics\README.txt"
echo Double-click launcher.exe to start the application. >> "MyElectronics\README.txt"
echo. >> "MyElectronics\README.txt"
echo Default login: admin / admin123 >> "MyElectronics\README.txt"

echo    ✅ MyElectronics package created!

echo.
echo ========================================
echo   ✅ BUILD COMPLETE!
echo   📁 Package: MyElectronics\
echo   🚀 Run: launcher.exe
echo ========================================
echo.

REM ===== STEP 5: Create ZIP =====
echo [Optional] Creating ZIP file...
if exist "MyElectronics_Setup.zip" del "MyElectronics_Setup.zip"
powershell -Command "Compress-Archive -Path 'MyElectronics\*' -DestinationPath 'MyElectronics_Setup.zip' -Force"
if %errorlevel% equ 0 (
    echo    ✅ ZIP created: MyElectronics_Setup.zip
) else (
    echo    ⚠️ ZIP creation failed (manual zip kar lo)
)

echo.
echo ========================================
echo   🎉 ALL DONE!
echo   📦 MyElectronics_Setup.zip ready!
echo ========================================
pause
