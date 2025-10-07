@echo off
setlocal enabledelayedexpansion

REM Configuration
set PROJECT_ID=disease-intelligence-program
set REGION=us-west1
set FRONTEND_SERVICE=dip-frontend
set BACKEND_SERVICE=dip-backend
set DOMAIN=dip.broadlyepi.com

echo Starting deployment to Google Cloud Run...

REM Check if gcloud is installed
where gcloud >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Error: gcloud CLI is not installed. Please install it first.
    exit /b 1
)

REM Check if user is logged in
gcloud auth list --filter=status:ACTIVE --format="value(account)" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo You need to log in to Google Cloud first. Run: gcloud auth login
    exit /b 1
)

REM Set the project
echo Setting project to %PROJECT_ID%...
gcloud config set project %PROJECT_ID%

REM Deploy backend
echo Building and deploying backend...
cd ..\backend

REM Build the container
echo Building backend container...
gcloud builds submit --tag gcr.io/%PROJECT_ID%/%BACKEND_SERVICE%

REM Deploy to Cloud Run
echo Deploying backend to Cloud Run...
gcloud run deploy %BACKEND_SERVICE% ^
  --image gcr.io/%PROJECT_ID%/%BACKEND_SERVICE% ^
  --platform managed ^
  --region %REGION% ^
  --allow-unauthenticated ^
  --memory 1Gi ^
  --cpu 1 ^
  --port 8080 ^
  --set-env-vars="ENVIRONMENT=production"

REM Get the backend URL
for /f "tokens=*" %%a in ('gcloud run services describe %BACKEND_SERVICE% --platform managed --region %REGION% --format "value(status.url)"') do (
    set BACKEND_URL=%%a
)
echo Backend deployed at: !BACKEND_URL!

REM Deploy frontend
echo Building and deploying frontend...
cd ..\frontend

REM Build the container
echo Building frontend container...
gcloud builds submit --tag gcr.io/%PROJECT_ID%/%FRONTEND_SERVICE%

REM Deploy to Cloud Run
echo Deploying frontend to Cloud Run...
gcloud run deploy %FRONTEND_SERVICE% ^
  --image gcr.io/%PROJECT_ID%/%FRONTEND_SERVICE% ^
  --platform managed ^
  --region %REGION% ^
  --allow-unauthenticated ^
  --memory 512Mi ^
  --cpu 1 ^
  --port 8080

REM Get the frontend URL
for /f "tokens=*" %%a in ('gcloud run services describe %FRONTEND_SERVICE% --platform managed --region %REGION% --format "value(status.url)"') do (
    set FRONTEND_URL=%%a
)
echo Frontend deployed at: !FRONTEND_URL!

REM Map custom domain
echo Mapping custom domain %DOMAIN%...
gcloud beta run domain-mappings create ^
  --service %FRONTEND_SERVICE% ^
  --domain %DOMAIN% ^
  --platform managed ^
  --region %REGION%

echo Deployment completed!
echo Please ensure your DNS records for %DOMAIN% are properly configured.
echo Frontend: https://%DOMAIN%
echo Backend: !BACKEND_URL!
echo Note: It may take some time for the DNS changes to propagate.

endlocal
