# GitHub Pages Deployment Guide

This guide explains how to deploy the Disease Intelligence Program to GitHub Pages with the backend on Google Cloud Run.

## Architecture Overview

```
Frontend (GitHub Pages)
    ↓ HTTPS API calls
Backend (Google Cloud Run)
```

## Prerequisites

1. **GitHub Account**: Access to https://github.com/CodyCarmichaelMPH/DIP
2. **Google Cloud Project**: Backend already deployed to Cloud Run
3. **Git**: Installed locally

## Step-by-Step Deployment

### Step 1: Push Code to GitHub

```bash
# Navigate to Production folder
cd Production

# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial commit: DIP application"

# Add remote repository
git remote add origin https://github.com/CodyCarmichaelMPH/DIP.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 2: Configure GitHub Pages

1. Go to https://github.com/CodyCarmichaelMPH/DIP
2. Click **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. The workflow will automatically trigger on push

### Step 3: Redeploy Backend with Updated CORS

The backend has already been updated to allow requests from GitHub Pages.

Redeploy the backend:

```bash
cd Production/backend

# Build backend Docker image
docker build -t us-west1-docker.pkg.dev/disease-intelligence-program/dip-repo/backend:prod-latest .

# Push to Google Container Registry
docker push us-west1-docker.pkg.dev/disease-intelligence-program/dip-repo/backend:prod-latest

# Deploy to Cloud Run
gcloud run deploy dip-backend \
  --image us-west1-docker.pkg.dev/disease-intelligence-program/dip-repo/backend:prod-latest \
  --region us-west1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 900 \
  --max-instances 10
```

### Step 4: Monitor Deployment

1. Go to https://github.com/CodyCarmichaelMPH/DIP/actions
2. Watch the "Deploy to GitHub Pages" workflow
3. Once complete, your site will be live at: https://codycarmic haelmph.github.io/DIP/

## Verifying the Deployment

### Frontend Health Check
Visit: https://codycarmic haelmph.github.io/DIP/

You should see:
- ✅ Login page loads
- ✅ Logo displays
- ✅ Dark mode toggle works

### Backend Health Check
Visit: https://dip-backend-398210810947.us-west1.run.app/health

You should see:
```json
{"status": "healthy", "message": "Root is running"}
```

### API Communication Check
1. Log in to the application
2. Navigate to Dashboard
3. Check browser console for:
   - ✅ API calls to `https://dip-backend-398210810947.us-west1.run.app/api/*`
   - ✅ No CORS errors
   - ✅ Data loads successfully

## Troubleshooting

### Issue: 404 on GitHub Pages
**Solution**: Check that the repository name matches `DIP` (case-sensitive)

### Issue: CORS Errors
**Solution**: 
1. Verify backend CORS includes `https://codycarmic haelmph.github.io`
2. Redeploy backend with updated CORS settings

### Issue: API Calls Failing
**Solution**:
1. Check that `VITE_API_BASE_URL` is set correctly in GitHub Actions workflow
2. Verify backend is running: `curl https://dip-backend-398210810947.us-west1.run.app/health`

### Issue: Blank Page After Deploy
**Solution**:
1. Check browser console for errors
2. Verify `vite.config.ts` has `base: '/DIP/'`
3. Clear browser cache

## Updating the Application

### Frontend Changes
Simply push to the `main` branch:
```bash
git add .
git commit -m "Update frontend"
git push origin main
```

GitHub Actions will automatically rebuild and deploy.

### Backend Changes
Rebuild and redeploy the Docker image:
```bash
cd Production/backend
docker build -t us-west1-docker.pkg.dev/disease-intelligence-program/dip-repo/backend:prod-latest .
docker push us-west1-docker.pkg.dev/disease-intelligence-program/dip-repo/backend:prod-latest
gcloud run deploy dip-backend --image us-west1-docker.pkg.dev/disease-intelligence-program/dip-repo/backend:prod-latest --region us-west1
```

## URLs Reference

| Service | URL |
|---------|-----|
| **Live Application** | https://codycarmic haelmph.github.io/DIP/ |
| **GitHub Repository** | https://github.com/CodyCarmichaelMPH/DIP |
| **Backend API** | https://dip-backend-398210810947.us-west1.run.app/api |
| **Backend Health** | https://dip-backend-398210810947.us-west1.run.app/health |
| **API Docs** | https://dip-backend-398210810947.us-west1.run.app/api/docs |

## Security Notes

- ✅ API keys are stored in Google Cloud Secrets
- ✅ CORS is restricted to specific origins
- ✅ HTTPS enforced for all communications
- ✅ No sensitive data in frontend repository

## Support

For issues or questions:
- **Email**: Cody.Carmichael@broadlyepi.com
- **Repository**: https://github.com/CodyCarmichaelMPH/DIP/issues

---

Last Updated: October 7, 2025

