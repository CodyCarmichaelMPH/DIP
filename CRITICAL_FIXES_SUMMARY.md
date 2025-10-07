# Critical Deployment Fixes - Summary

## Date: October 6, 2025

## Issues Fixed

### 🔴 Critical: document.body is null Error
**Symptom:** Console error: `Uncaught TypeError: can't access property "style", document.body is null`

**Root Cause:** Theme detection script in `index.html` tried to access `document.body.style` before the `<body>` element was created in the DOM.

**Fix Applied:**
- Modified `Production/frontend/index.html`
- Script now applies theme to `document.documentElement` first (always available)
- Checks if `document.body` exists before accessing it
- Falls back to `DOMContentLoaded` event if body doesn't exist yet

**Files Changed:**
- `Production/frontend/index.html` (lines 20-61)

---

### 🔴 Critical: Backend 404 Error
**Symptom:** 
```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at 
https://dip-backend-398210810947.us-west1.run.app/api/starsim/simulate
Status code: 404
```

**Root Causes:**
1. Backend service not deployed or incorrect URL
2. Dockerfile was using wrong entry point (`model_worker.main:app` instead of `simple_backend:root_app`)
3. `simple_backend.py` mounts API under `/api`, but `model_worker/main.py` doesn't

**Fix Applied:**
- Modified `Production/backend/Dockerfile` to use `simple_backend:root_app`
- This ensures:
  - API is mounted under `/api` prefix
  - CORS is properly configured
  - Both GET and POST methods are supported

**Files Changed:**
- `Production/backend/Dockerfile` (line 43)

---

### 🔴 Critical: Method Not Allowed (GET vs POST)
**Symptom:** Frontend makes GET requests with query parameters, but backend only accepted POST

**Root Cause:** `model_worker/main.py` only had `@app.post("/starsim/simulate")` decorator

**Fix Applied:**
- Added `@app.get("/starsim/simulate")` decorator alongside POST
- Now supports both GET and POST methods
- Frontend can make requests using query parameters

**Files Changed:**
- `Production/backend/model_worker/main.py` (line 194)

---

### 🟡 Important: CORS Configuration
**Status:** Already correct in `simple_backend.py`, but wasn't being used

**CORS Settings:**
```python
allow_origin_regex=r"^https://([a-z0-9-]+\.)?broadlyepi\.com$"
allow_credentials=True
allow_methods=["*"]
allow_headers=["*"]
```

**Fix Applied:** Using `simple_backend:root_app` now activates this CORS configuration

---

## Deployment Instructions

### Quick Deploy (Recommended)

**On Windows:**
```cmd
cd Production\scripts
deploy-fixes.bat
```

**On Mac/Linux:**
```bash
cd Production/scripts
chmod +x deploy-fixes.sh
./deploy-fixes.sh
```

### Manual Deploy

**Backend:**
```bash
cd Production/backend
gcloud run deploy dip-backend \
  --source . \
  --region us-west1 \
  --allow-unauthenticated \
  --port 8000 \
  --memory 2Gi \
  --cpu 2
```

**Frontend:**
```bash
cd Production/frontend
gcloud run deploy dip-frontend \
  --source . \
  --region us-west1 \
  --allow-unauthenticated \
  --port 8080
```

---

## Verification Checklist

After deployment, verify these endpoints:

### ✅ Backend Health Checks
```bash
# Root health
curl https://dip-backend-398210810947.us-west1.run.app/health

# API health
curl https://dip-backend-398210810947.us-west1.run.app/api/health

# Starsim status
curl https://dip-backend-398210810947.us-west1.run.app/api/starsim/status

# Starsim simulate (GET method)
curl "https://dip-backend-398210810947.us-west1.run.app/api/starsim/simulate?disease=COVID&population_size=1000&duration_days=30&n_reps=1"
```

### ✅ CORS Headers
```bash
curl -I -H "Origin: https://dip.broadlyepi.com" \
  https://dip-backend-398210810947.us-west1.run.app/api/health
```

Should return:
```
Access-Control-Allow-Origin: https://dip.broadlyepi.com
Access-Control-Allow-Credentials: true
```

### ✅ Frontend
1. Open https://dip.broadlyepi.com in browser
2. Open Browser Console (F12)
3. Check for errors:
   - ❌ No "document.body is null" errors
   - ❌ No CORS errors
   - ❌ No 404 errors
   - ✅ Charts and data should load

---

## Expected Results

### Before Fixes
```
❌ Uncaught TypeError: can't access property "style", document.body is null
❌ Cross-Origin Request Blocked (CORS)
❌ Status code: 404
❌ NetworkError when attempting to fetch resource
```

### After Fixes
```
✅ Theme loads without errors
✅ CORS headers present
✅ Backend responds with 200 OK
✅ Simulation data loads successfully
✅ Dashboard displays properly
```

---

## Files Modified Summary

| File | Changes | Reason |
|------|---------|--------|
| `Production/frontend/index.html` | Fixed theme script | Prevent document.body null error |
| `Production/backend/Dockerfile` | Changed CMD to use simple_backend | Enable /api mounting and CORS |
| `Production/backend/model_worker/main.py` | Added @app.get decorator | Support GET requests |

---

## New Files Created

| File | Purpose |
|------|---------|
| `Production/docs/DEPLOYMENT_FIX.md` | Comprehensive deployment guide |
| `Production/scripts/deploy-fixes.sh` | Unix deployment script |
| `Production/scripts/deploy-fixes.bat` | Windows deployment script |
| `Production/CRITICAL_FIXES_SUMMARY.md` | This file |

---

## Monitoring

After deployment, monitor:

1. **Backend Logs:**
   ```bash
   gcloud run logs read dip-backend --region us-west1 --limit 50
   ```

2. **Frontend Logs:**
   ```bash
   gcloud run logs read dip-frontend --region us-west1 --limit 50
   ```

3. **Error Rate:** Should drop to near zero

4. **Response Times:** Should be under 2 seconds for API calls

---

## Rollback Plan

If issues persist:

1. **Rollback Backend:**
   ```bash
   gcloud run services list --region us-west1
   gcloud run revisions list --service dip-backend --region us-west1
   gcloud run services update-traffic dip-backend \
     --to-revisions PREVIOUS_REVISION=100 \
     --region us-west1
   ```

2. **Rollback Frontend:**
   ```bash
   gcloud run services update-traffic dip-frontend \
     --to-revisions PREVIOUS_REVISION=100 \
     --region us-west1
   ```

---

## Support

If you encounter any issues:

1. Check the logs (commands above)
2. Verify all health endpoints
3. Test CORS headers
4. Review browser console errors
5. Confirm service URLs are correct

For urgent issues, the quickest fix is to ensure:
- Backend is deployed and running
- Backend URL in frontend matches deployed service
- CORS is properly configured
- Both GET and POST methods are supported

---

## Next Steps

1. **Deploy the fixes** using the scripts provided
2. **Verify** all endpoints work
3. **Test** the application in production
4. **Monitor** logs for any new errors
5. **Document** any additional configuration needed

---

## Technical Notes

### Why simple_backend.py?

The `simple_backend.py` file was created specifically to resolve CORS and mounting issues:
- Mounts the API under `/api` prefix
- Has comprehensive CORS configuration
- Supports both GET and POST methods
- Includes health check endpoints at both root and `/api`
- Designed for production deployment

### Why Both GET and POST?

While REST best practices suggest POST for simulations, the frontend was built to use GET with query parameters for simplicity. Supporting both methods ensures:
- Backward compatibility
- Easier debugging (can test with curl)
- Browser-friendly (can paste URLs)
- Frontend flexibility

---

**Status:** ✅ All fixes applied and ready for deployment

**Confidence Level:** High - All root causes identified and addressed

**Estimated Deployment Time:** 10-15 minutes for both services


