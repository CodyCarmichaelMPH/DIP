@echo off
REM Quick deployment script to deploy the fixed backend and frontend

echo =========================================
echo Deploying Backend and Frontend Fixes
echo =========================================

REM Check if gcloud is installed
where gcloud >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: gcloud CLI not found. Please install it first.
    exit /b 1
)

REM Set defaults
if "%PROJECT_ID%"=="" (
    for /f "tokens=*" %%i in ('gcloud config get-value project') do set PROJECT_ID=%%i
)
if "%REGION%"=="" set REGION=us-west1

echo Project ID: %PROJECT_ID%
echo Region: %REGION%
echo.

REM Navigate to Production directory
cd /d "%~dp0.."

REM Deploy Backend
echo =========================================
echo Step 1: Deploying Backend
echo =========================================

cd backend
echo Building and deploying backend to Cloud Run...

gcloud run deploy dip-backend ^
  --source . ^
  --region %REGION% ^
  --platform managed ^
  --allow-unauthenticated ^
  --port 8000 ^
  --memory 2Gi ^
  --cpu 2 ^
  --timeout 300 ^
  --max-instances 10 ^
  --set-env-vars ENV=production ^
  --project %PROJECT_ID%

if %ERRORLEVEL% NEQ 0 (
    echo Backend deployment failed
    exit /b 1
)

REM Get backend URL
for /f "tokens=*" %%i in ('gcloud run services describe dip-backend --region %REGION% --format "value(status.url)" --project %PROJECT_ID%') do set BACKEND_URL=%%i

echo.
echo Backend deployed successfully!
echo Backend URL: %BACKEND_URL%
echo.

REM Test backend health
echo Testing backend health...
curl -f "%BACKEND_URL%/health" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [32m✓ Backend health check passed[0m
) else (
    echo [31m✗ Backend health check failed[0m
    exit /b 1
)

curl -f "%BACKEND_URL%/api/health" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [32m✓ Backend API health check passed[0m
) else (
    echo [31m✗ Backend API health check failed[0m
    exit /b 1
)

echo.

REM Deploy Frontend
echo =========================================
echo Step 2: Deploying Frontend
echo =========================================

cd ..\frontend
echo Deploying frontend to Cloud Run...

gcloud run deploy dip-frontend ^
  --source . ^
  --region %REGION% ^
  --platform managed ^
  --allow-unauthenticated ^
  --port 8080 ^
  --memory 512Mi ^
  --cpu 1 ^
  --timeout 60 ^
  --max-instances 10 ^
  --set-env-vars VITE_API_BASE_URL=%BACKEND_URL%/api ^
  --project %PROJECT_ID%

if %ERRORLEVEL% NEQ 0 (
    echo Frontend deployment failed
    exit /b 1
)

REM Get frontend URL
for /f "tokens=*" %%i in ('gcloud run services describe dip-frontend --region %REGION% --format "value(status.url)" --project %PROJECT_ID%') do set FRONTEND_URL=%%i

echo.
echo Frontend deployed successfully!
echo Frontend URL: %FRONTEND_URL%
echo.

REM Summary
echo =========================================
echo Deployment Complete!
echo =========================================
echo.
echo Backend URL:  %BACKEND_URL%
echo Frontend URL: %FRONTEND_URL%
echo.
echo Next steps:
echo 1. Update your domain DNS to point to: %FRONTEND_URL%
echo 2. Test the application at: %FRONTEND_URL%
echo 3. Check browser console for any errors
echo.
echo Verification commands:
echo   Backend health:  curl %BACKEND_URL%/health
echo   API health:      curl %BACKEND_URL%/api/health
echo   Frontend:        curl %FRONTEND_URL%
echo.


