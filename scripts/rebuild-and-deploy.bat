@echo off
REM Rebuild Docker images with fixes and deploy to Cloud Run

echo =========================================
echo Rebuilding and Deploying Fixed Images
echo =========================================

REM Check environment variables
if "%PROJECT_ID%"=="" (
    for /f "tokens=*" %%i in ('gcloud config get-value project') do set PROJECT_ID=%%i
)
if "%REGION%"=="" set REGION=us-west1
if "%REPO%"=="" set REPO=dip-repo

echo Project: %PROJECT_ID%
echo Region: %REGION%
echo Repository: %REPO%
echo.

REM Build version tag with timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%-%datetime:~8,6%
set VERSION=fixed-%TIMESTAMP%

echo Building version: %VERSION%
echo.

REM ==========================================
REM Step 1: Build and Push Backend
REM ==========================================
echo Step 1: Building Backend Image...
cd /d "%~dp0..\backend"

docker build -t %REGION%-docker.pkg.dev/%PROJECT_ID%/%REPO%/backend:%VERSION% .
if %ERRORLEVEL% NEQ 0 (
    echo Backend build failed!
    exit /b 1
)

echo Pushing backend image...
docker push %REGION%-docker.pkg.dev/%PROJECT_ID%/%REPO%/backend:%VERSION%
if %ERRORLEVEL% NEQ 0 (
    echo Backend push failed!
    exit /b 1
)

echo Deploying backend to Cloud Run...
gcloud run deploy dip-backend ^
  --image %REGION%-docker.pkg.dev/%PROJECT_ID%/%REPO%/backend:%VERSION% ^
  --region %REGION% ^
  --allow-unauthenticated ^
  --port 8000 ^
  --memory 2Gi ^
  --cpu 2 ^
  --timeout 300 ^
  --max-instances 10 ^
  --set-env-vars ENV=production
if %ERRORLEVEL% NEQ 0 (
    echo Backend deployment failed!
    exit /b 1
)

echo Backend deployed successfully!
echo.

REM Get backend URL
for /f "tokens=*" %%i in ('gcloud run services describe dip-backend --region %REGION% --format "value(status.url)"') do set BACKEND_URL=%%i
echo Backend URL: %BACKEND_URL%
echo.

REM ==========================================
REM Step 2: Build and Push Frontend
REM ==========================================
echo Step 2: Building Frontend Image...
cd /d "%~dp0..\frontend"

docker build -t %REGION%-docker.pkg.dev/%PROJECT_ID%/%REPO%/frontend:%VERSION% .
if %ERRORLEVEL% NEQ 0 (
    echo Frontend build failed!
    exit /b 1
)

echo Pushing frontend image...
docker push %REGION%-docker.pkg.dev/%PROJECT_ID%/%REPO%/frontend:%VERSION%
if %ERRORLEVEL% NEQ 0 (
    echo Frontend push failed!
    exit /b 1
)

echo Deploying frontend to Cloud Run...
gcloud run deploy dip-frontend ^
  --image %REGION%-docker.pkg.dev/%PROJECT_ID%/%REPO%/frontend:%VERSION% ^
  --region %REGION% ^
  --allow-unauthenticated ^
  --port 8080 ^
  --memory 512Mi ^
  --cpu 1 ^
  --timeout 60 ^
  --max-instances 10
if %ERRORLEVEL% NEQ 0 (
    echo Frontend deployment failed!
    exit /b 1
)

echo Frontend deployed successfully!
echo.

REM Get frontend URL
for /f "tokens=*" %%i in ('gcloud run services describe dip-frontend --region %REGION% --format "value(status.url)"') do set FRONTEND_URL=%%i
echo Frontend URL: %FRONTEND_URL%
echo.

REM ==========================================
REM Step 3: Verify Deployment
REM ==========================================
echo Step 3: Verifying Deployment...
echo.

echo Testing backend health...
curl -f "%BACKEND_URL%/health" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [32m✓ Backend health check passed[0m
) else (
    echo [31m✗ Backend health check failed[0m
)

echo Testing backend API health...
curl -f "%BACKEND_URL%/api/health" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [32m✓ Backend API health check passed[0m
) else (
    echo [31m✗ Backend API health check failed[0m
)

echo Testing frontend...
curl -f "%FRONTEND_URL%" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [32m✓ Frontend check passed[0m
) else (
    echo [31m✗ Frontend check failed[0m
)

echo.
echo =========================================
echo Deployment Complete!
echo =========================================
echo.
echo Backend:  %BACKEND_URL%
echo Frontend: %FRONTEND_URL%
echo Version:  %VERSION%
echo.
echo Images tagged with: %VERSION%
echo.
echo Next: Test the application at %FRONTEND_URL%
echo Check browser console - errors should be gone!
echo.


