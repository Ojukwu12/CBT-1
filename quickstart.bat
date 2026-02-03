@echo off
cls

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║     University AI CBT Backend - Phase 0 Quick Start       ║
echo ║                                                           ║
echo ║  Production-Ready Node.js Backend for UNIZIK CBT System  ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Step 1: Check Node.js
echo Step 1: Checking Node.js installation...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ✗ Node.js not found. Please install Node.js v16+ from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✓ Node.js %NODE_VERSION% found
echo.

REM Step 2: Check MongoDB
echo Step 2: MongoDB Connection (Required)
echo    You need a MongoDB instance running or MongoDB Atlas URI
echo    - Local: mongodb://localhost:27017/university-cbt
echo    - Atlas: mongodb+srv://user:password@cluster.mongodb.net/university-cbt
echo.

REM Step 3: Get Gemini API Key
echo Step 3: Google Gemini API Key (Required for AI Features)
echo    1. Visit: https://makersuite.google.com/app/apikey
echo    2. Generate new API key
echo    3. Save it safely
echo.

REM Step 4: Install Dependencies
echo Step 4: Installing Dependencies...
if not exist "node_modules" (
    echo Installing npm packages...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ✗ npm install failed
        pause
        exit /b 1
    )
    echo ✓ Dependencies installed
) else (
    echo ✓ node_modules already exists (skipped npm install)
)
echo.

REM Step 5: Configure Environment
echo Step 5: Configuring Environment Variables...
if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env
        echo ✓ Created .env from .env.example
        echo.
        echo ⚠  IMPORTANT: Edit .env and set:
        echo    - MONGO_URI: Your MongoDB connection string
        echo    - GEMINI_API_KEY: Your Google Gemini API key
        echo.
        echo After editing, run: npm run seed ^&^& npm run dev
        pause
        exit /b 0
    ) else (
        echo ✗ .env.example not found
        pause
        exit /b 1
    )
) else (
    echo ✓ .env file already exists
)
echo.

REM Step 6: Validate System
echo Step 6: Validating System...
call npm run validate
if %ERRORLEVEL% NEQ 0 (
    echo ✗ System validation failed
    pause
    exit /b 1
)
echo.

REM Step 7: Seed Database
echo Step 7: Seeding Database with Test Data...
set /p SEED="Run seed script now? (y/n): "
if /i "%SEED%"=="y" (
    call npm run seed
    if %ERRORLEVEL% NEQ 0 (
        echo ✗ Seed script failed (check MongoDB connection)
        pause
        exit /b 1
    )
    echo ✓ Test data created
) else (
    echo ⚠  Skipped seed script (run 'npm run seed' later)
)
echo.

REM Step 8: Start Server
echo Step 8: Starting Development Server...
echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                  READY TO START!                          ║
echo ║                                                           ║
echo ║  Run: npm run dev                                         ║
echo ║                                                           ║
echo ║  Server: http://localhost:3000                           ║
echo ║  Test: curl http://localhost:3000/api/health            ║
echo ║                                                           ║
echo ║  Documentation: See PHASE0.md                            ║
echo ║  Architecture: See ARCHITECTURE-REFERENCE.md             ║
echo ║  Checklist: See PHASE0-CHECKLIST.md                      ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

echo Starting server...
call npm run dev
pause
