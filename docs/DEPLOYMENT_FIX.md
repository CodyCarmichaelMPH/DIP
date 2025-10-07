# Deployment Fix Guide

## Critical Issues Resolved

### 1. Document.body Null Error
**Problem:** JavaScript tried to access `document.body.style` before the body element was created.

**Fixed:** Modified `Production/frontend/index.html` to:
- Apply theme to `document.documentElement` first (always available)
- Check if `document.body` exists before accessing it
- Use `DOMContentLoaded` event if body doesn't exist yet

### 2. Backend 404 Error
**Problem:** The backend service at `dip-backend-398210810947.us-west1.run.app` returns 404.

**Root Causes:**
- Service may not be deployed
- Incorrect service name/URL
- Backend not properly configured

### 3. CORS and Method Mismatch
**Problem:** Frontend makes GET requests but backend only accepted POST.

**Fixed:** 
- Added `@app.get("/starsim/simulate")` decorator to support GET requests
- Modified Dockerfile to use `simple_backend.py` which has proper CORS configuration

### 4. API Path Mismatch
**Problem:** Frontend expects `/api/starsim/simulate` but backend served `/starsim/simulate`.

**Fixed:** Dockerfile now uses `simple_backend:root_app` which mounts the API under `/api`.

---

## Deployment Instructions

### Option A: Deploy Backend to Google Cloud Run

```bash
# Navigate to backend directory
cd Production/backend

# Set your GCP project
export PROJECT_ID="your-project-id"
export REGION="us-west1"

# Build and deploy
gcloud run deploy dip-backend \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 8000 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --set-env-vars ENV=production \
  --project $PROJECT_ID

# Get the service URL
gcloud run services describe dip-backend \
  --region $REGION \
  --format 'value(status.url)' \
  --project $PROJECT_ID
```

### Option B: Deploy Both Services Together

```bash
cd Production

# Deploy backend first
gcloud run deploy dip-backend \
  --source ./backend \
  --region us-west1 \
  --allow-unauthenticated \
  --port 8000

# Get backend URL
export BACKEND_URL=$(gcloud run services describe dip-backend --region us-west1 --format 'value(status.url)')

# Deploy frontend with backend URL
cd frontend
# Build with backend URL
export VITE_API_BASE_URL="${BACKEND_URL}/api"
npm run build

# Deploy frontend
gcloud run deploy dip-frontend \
  --source . \
  --region us-west1 \
  --allow-unauthenticated \
  --port 8080
```

### Option C: Update Frontend to Use Correct Backend URL

If the backend is already deployed at a different URL, update the frontend build:

```bash
cd Production/frontend

# Set the correct backend URL
export VITE_API_BASE_URL="https://your-actual-backend-url.run.app/api"

# Rebuild frontend
npm run build

# Redeploy
gcloud run deploy dip-frontend \
  --source . \
  --region us-west1 \
  --allow-unauthenticated \
  --port 8080
```

---

## Verification Steps

### 1. Test Backend Health
```bash
curl https://dip-backend-398210810947.us-west1.run.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "message": "Backend is running"
}
```

### 2. Test Backend API Health
```bash
curl https://dip-backend-398210810947.us-west1.run.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "message": "Backend is running"
}
```

### 3. Test Starsim Endpoint
```bash
curl "https://dip-backend-398210810947.us-west1.run.app/api/starsim/simulate?disease=COVID&population_size=1000&duration_days=30&n_reps=1"
```

Should return simulation results (not 404).

### 4. Test CORS
```bash
curl -H "Origin: https://dip.broadlyepi.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://dip-backend-398210810947.us-west1.run.app/api/starsim/simulate
```

Should return CORS headers allowing the frontend domain.

---

## Troubleshooting

### Backend Returns 404

**Check if service exists:**
```bash
gcloud run services list --region us-west1 | grep dip-backend
```

**If not listed, deploy it:**
```bash
cd Production/backend
gcloud run deploy dip-backend --source . --region us-west1
```

### CORS Errors Persist

**Verify CORS configuration in `simple_backend.py`:**
- Check line 434: `allow_origin_regex` includes your domain
- Ensure regex pattern matches: `^https://([a-z0-9-]+\.)?broadlyepi\.com$`

**Test CORS headers:**
```bash
curl -I -H "Origin: https://dip.broadlyepi.com" \
  https://dip-backend-398210810947.us-west1.run.app/api/health
```

Look for:
```
Access-Control-Allow-Origin: https://dip.broadlyepi.com
Access-Control-Allow-Credentials: true
```

### Frontend Can't Connect

**Check frontend environment variables:**
1. Inspect the built JavaScript bundle
2. Look for API URL configuration
3. Verify it points to the correct backend URL

**Browser console:**
```javascript
// Check what URL the frontend is using
console.log(import.meta.env.VITE_API_BASE_URL);
```

---

## Files Modified

1. **Production/frontend/index.html**
   - Fixed `document.body` null error
   - Added proper DOM loading checks

2. **Production/backend/model_worker/main.py**
   - Added GET method support to `/starsim/simulate`

3. **Production/backend/Dockerfile**
   - Changed from `model_worker.main:app` to `simple_backend:root_app`
   - Ensures proper `/api` path mounting and CORS configuration

---

## Next Steps

1. **Rebuild and redeploy both services**
   ```bash
   cd Production
   ./scripts/deploy.sh  # If you have a deployment script
   ```

2. **Verify the deployment**
   - Check backend health endpoint
   - Test API endpoints
   - Verify CORS headers
   - Test frontend connection

3. **Monitor logs**
   ```bash
   # Backend logs
   gcloud run logs read dip-backend --region us-west1 --limit 50
   
   # Frontend logs
   gcloud run logs read dip-frontend --region us-west1 --limit 50
   ```

4. **Test the application**
   - Open https://dip.broadlyepi.com
   - Check browser console for errors
   - Verify simulations run successfully

---

## Prevention

To prevent these issues in the future:

1. **Always test locally first**
   ```bash
   docker-compose -f docker-compose.prod.yml up
   ```

2. **Use environment variables for URLs**
   - Never hardcode URLs in source code
   - Use `.env` files for configuration

3. **Test CORS before deployment**
   - Use browser developer tools
   - Check preflight OPTIONS requests

4. **Verify service URLs after deployment**
   ```bash
   gcloud run services list --region us-west1
   ```

5. **Set up health check monitoring**
   - Cloud Monitoring alerts
   - Uptime checks
   - Log-based metrics


