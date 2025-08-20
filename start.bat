@echo off
setlocal enabledelayedexpansion

REM NeXo AI Bot Startup Script for Windows
REM Developer: Xbibz Official - MR. Nexo444

title NeXo AI Bot - Startup

REM Colors (Windows 10+)
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "PURPLE=[95m"
set "CYAN=[96m"
set "NC=[0m"

:banner
cls
echo %CYAN%
echo ███╗   ██╗███████╗██╗  ██╗ ██████╗      █████╗ ██╗
echo ████╗  ██║██╔════╝╚██╗██╔╝██╔═══██╗    ██╔══██╗██║
echo ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║    ███████║██║
echo ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║    ██╔══██║██║
echo ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝    ██║  ██║██║
echo ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝     ╚═╝  ╚═╝╚═╝
echo %NC%
echo %PURPLE%🤖 Bot Telegram Profesional dengan AI Gemini%NC%
echo %YELLOW%👨‍💻 Developer: Xbibz Official - MR. Nexo444%NC%
echo %GREEN%🚀 Version: 1.0.0%NC%
echo.

:check_nodejs
echo %CYAN%🔍 Checking Node.js...%NC%
node --version >nul 2>&1
if errorlevel 1 (
    echo %RED%❌ Node.js tidak ditemukan!%NC%
    echo %YELLOW%💡 Silakan install Node.js dari: https://nodejs.org/%NC%
    echo %YELLOW%💡 Pilih versi LTS dan restart script ini%NC%
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo %GREEN%✅ Node.js !NODE_VERSION! tersedia!%NC%
)

:check_npm
echo %CYAN%🔍 Checking NPM...%NC%
npm --version >nul 2>&1
if errorlevel 1 (
    echo %RED%❌ NPM tidak ditemukan!%NC%
    echo %YELLOW%💡 NPM biasanya terinstall dengan Node.js%NC%
    echo %YELLOW%💡 Coba install ulang Node.js%NC%
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo %GREEN%✅ NPM !NPM_VERSION! tersedia!%NC%
)

:check_package
if not exist "package.json" (
    echo %RED%❌ package.json tidak ditemukan!%NC%
    echo %YELLOW%💡 Pastikan kamu berada di direktori yang benar%NC%
    pause
    exit /b 1
)

:install_deps
echo %CYAN%📦 Checking dependencies...%NC%
if not exist "node_modules" (
    echo %YELLOW%⚠️  Dependencies belum terinstall%NC%
    echo %CYAN%📥 Installing dependencies...%NC%
    
    npm install
    
    if errorlevel 1 (
        echo %RED%❌ Gagal install dependencies!%NC%
        echo %YELLOW%💡 Coba jalankan: npm install --force%NC%
        pause
        exit /b 1
    ) else (
        echo %GREEN%✅ Dependencies berhasil diinstall!%NC%
    )
) else (
    echo %GREEN%✅ Dependencies sudah terinstall!%NC%
)

:create_dirs
echo %CYAN%📁 Creating directories...%NC%
if not exist "data" mkdir data
if not exist "logs" mkdir logs
if not exist "backup" mkdir backup
if not exist "temp" mkdir temp
echo %GREEN%✅ Directories created!%NC%

:check_requirements
echo %CYAN%🔍 Checking system requirements...%NC%

REM Check Node.js version
for /f "tokens=1 delims=." %%a in ('node --version') do (
    set NODE_MAJOR=%%a
    set NODE_MAJOR=!NODE_MAJOR:v=!
)

if !NODE_MAJOR! LSS 14 (
    echo %RED%❌ Node.js version 14+ diperlukan!%NC%
    echo %YELLOW%💡 Current version: !NODE_VERSION!%NC%
    pause
    exit /b 1
)

echo %GREEN%✅ System requirements OK!%NC%

:menu
echo.
echo %CYAN%📋 NeXo AI Bot - Startup Menu%NC%
echo %YELLOW%─────────────────────────────────%NC%
echo %GREEN%1.%NC% 🚀 Start Bot
echo %GREEN%2.%NC% 🔧 Install Dependencies
echo %GREEN%3.%NC% 🔄 Update Bot
echo %GREEN%4.%NC% 📊 System Info
echo %GREEN%5.%NC% 🗑️  Clean Install
echo %GREEN%6.%NC% ❌ Exit
echo %YELLOW%─────────────────────────────────%NC%

set /p choice=%CYAN%Pilih opsi [1-6]: %NC%

if "%choice%"=="1" goto start_bot
if "%choice%"=="2" goto install_only
if "%choice%"=="3" goto update_bot
if "%choice%"=="4" goto system_info
if "%choice%"=="5" goto clean_install
if "%choice%"=="6" goto exit_script

echo %RED%❌ Invalid option!%NC%
goto menu

:start_bot
echo %CYAN%🚀 Starting NeXo AI Bot...%NC%
echo %YELLOW%⚠️  Tekan Ctrl+C untuk menghentikan bot%NC%
echo.

node src/index.js

if errorlevel 1 (
    echo %RED%❌ Bot crashed!%NC%
    echo %YELLOW%💡 Check logs untuk detail error%NC%
    
    set /p restart=%CYAN%Restart bot? [y/N]: %NC%
    if /i "!restart!"=="y" goto start_bot
)

goto menu

:install_only
call :install_deps
echo %GREEN%✅ Dependencies installation complete!%NC%
pause
goto menu

:update_bot
echo %CYAN%🔄 Updating bot...%NC%
git pull origin main
if errorlevel 1 (
    echo %YELLOW%⚠️  Git pull failed, continuing with npm install...%NC%
)
npm install
echo %GREEN%✅ Update complete!%NC%
pause
goto menu

:system_info
echo %CYAN%💻 System Information:%NC%
echo %YELLOW%OS:%NC% Windows
echo %YELLOW%Architecture:%NC% %PROCESSOR_ARCHITECTURE%
echo %YELLOW%Node.js:%NC% !NODE_VERSION!
echo %YELLOW%NPM:%NC% !NPM_VERSION!

REM Get memory info
for /f "skip=1" %%p in ('wmic computersystem get TotalPhysicalMemory') do (
    if not "%%p"=="" (
        set /a TOTAL_MEM=%%p/1024/1024
        echo %YELLOW%Total Memory:%NC% !TOTAL_MEM! MB
        goto :memory_done
    )
)
:memory_done

pause
goto menu

:clean_install
echo %YELLOW%🗑️  Cleaning installation...%NC%
if exist "node_modules" rmdir /s /q "node_modules"
if exist "package-lock.json" del "package-lock.json"
npm cache clean --force
echo %GREEN%✅ Clean complete! Run option 2 to reinstall.%NC%
pause
goto menu

:exit_script
echo %CYAN%👋 Goodbye!%NC%
exit /b 0

REM Error handler
:error
echo %RED%❌ An error occurred!%NC%
pause
goto menu

