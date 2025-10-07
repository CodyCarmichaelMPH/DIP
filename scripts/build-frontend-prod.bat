@echo off
REM Production frontend build script for Windows

echo Building frontend for production...

REM Set production environment variables
set VITE_API_BASE_URL=/api
set NODE_ENV=production

REM Build the frontend
cd ..\app
npm run build

REM Copy built files to production directory
echo Copying built files to production directory...
xcopy /E /Y dist\* ..\Production\frontend\

echo Frontend build complete!




