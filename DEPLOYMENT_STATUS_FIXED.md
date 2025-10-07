# Deployment Status - CORS and Environment Fixed

**Date:** October 7, 2025  
**Status:** ✅ **FULLY OPERATIONAL**

## Issues Fixed

### 1. CORS Configuration ✅
**Problem:** Backend was returning `400 Bad Request - Disallowed CORS origin` for requests from `https://dip.broadlyepi.com`

**Fix Applied:**
- Added `https://dip.broadlyepi.com` explicitly to CORS allowed origins in `Production/backend/simple_backend.py`
- Updated CORS middleware configuration:
  ```python
  allow_origins=[
      "https://dip.broadlyepi.com",
      "https://dip-frontend-398210810947.us-west1.run.app",
      "http://localhost:5173",
      "http://localhost:5174", 
      "http://localhost:3000",
      "http://localhost"
  ]
  ```

**Verification:**
```bash
curl -i -X OPTIONS https://dip.broadlyepi.com/api/starsim/simulate \
  -H "Origin: https://dip.broadlyepi.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

**Result:** ✅ Returns `200 OK` with `access-control-allow-origin: https://dip.broadlyepi.com`

### 2. Environment Variables ✅
**Perplexity API Key Configuration:**
- Environment variable: `PERPLEXITY_API_KEY`
- Source: Google Secret Manager secret `perplexity-api-key`
- Status: ✅ **Already configured in Cloud Run**

**Verification:**
```bash
gcloud run services describe dip-backend --region us-west1 \
  --format="yaml(spec.template.spec.containers[0].env)"
```

**Current Configuration:**
```yaml
env:
- name: DATA_DIR
  value: /data
- name: PERPLEXITY_API_KEY
  valueFrom:
    secretKeyRef:
      key: latest
      name: perplexity-api-key
- name: PERPLEXITY_KEY_FILE
  value: /secrets/perplexity.key
```

## Deployed Services

### Backend
- **Service:** `dip-backend`
- **URL:** https://dip-backend-398210810947.us-west1.run.app
- **Latest Revision:** `dip-backend-00027-96b`
- **Image:** `us-west1-docker.pkg.dev/disease-intelligence-program/dip-repo/backend:cors-fix`
- **Status:** ✅ Serving 100% traffic
- **Health Check:** ✅ `/api/health` returns healthy

### Frontend
- **Service:** `dip-frontend`
- **URL:** https://dip-frontend-398210810947.us-west1.run.app
- **Load Balancer URL:** https://dip.broadlyepi.com
- **Status:** ✅ Operational

## Testing Results

### CORS Preflight Test ✅
```
HTTP/1.1 200 OK
access-control-allow-origin: https://dip.broadlyepi.com
access-control-allow-methods: DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT
access-control-allow-headers: content-type
access-control-allow-credentials: true
access-control-max-age: 600
```

### Backend Health Check ✅
```json
{
  "status": "healthy",
  "message": "Root is running"
}
```

## Next Steps

### For Frontend API Integration
If the frontend still shows API errors:

1. **Clear Browser Cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Or open DevTools → Network tab → check "Disable cache"

2. **Verify API Calls:**
   - Open browser DevTools → Network tab
   - Look for requests to `/api/*` endpoints
   - Check if they're going to `https://dip.broadlyepi.com/api/*` (correct)
   - If going directly to `https://dip-backend-*.run.app`, the frontend needs rebuilding

3. **Test API Directly:**
   ```javascript
   // In browser console at https://dip.broadlyepi.com
   await fetch('/api/health').then(r => r.json()).then(console.log)
   ```

### For Perplexity API Integration
When ready to integrate Perplexity AI:

1. The environment variable `PERPLEXITY_API_KEY` is already available
2. Access it in Python code:
   ```python
   import os
   perplexity_key = os.getenv('PERPLEXITY_API_KEY')
   ```

3. Example usage (when implementing AI features):
   ```python
   from openai import OpenAI
   
   client = OpenAI(
       api_key=os.getenv('PERPLEXITY_API_KEY'),
       base_url="https://api.perplexity.ai"
   )
   ```

## Files Modified

1. **`Production/backend/simple_backend.py`**
   - Added explicit CORS origin for `https://dip.broadlyepi.com`
   - Lines 441-456

2. **`Production/backend/Dockerfile`**
   - Already configured correctly for Cloud Run dynamic PORT

3. **`Production/frontend/index.html`**
   - Already contains fix for `document.body is null` error

## Deployment Commands Used

```bash
# Build backend
cd Production/backend
docker build -t us-west1-docker.pkg.dev/disease-intelligence-program/dip-repo/backend:cors-fix .

# Push to Artifact Registry
docker push us-west1-docker.pkg.dev/disease-intelligence-program/dip-repo/backend:cors-fix

# Deploy to Cloud Run
gcloud run deploy dip-backend \
  --image us-west1-docker.pkg.dev/disease-intelligence-program/dip-repo/backend:cors-fix \
  --region us-west1 \
  --allow-unauthenticated
```

## Support

If issues persist:

1. Check Cloud Run logs:
   ```bash
   gcloud run services logs read dip-backend --region us-west1 --limit 50
   ```

2. Verify service configuration:
   ```bash
   gcloud run services describe dip-backend --region us-west1
   ```

3. Test endpoints:
   ```bash
   # Health check
   curl https://dip-backend-398210810947.us-west1.run.app/api/health
   
   # CORS preflight
   curl -i -X OPTIONS https://dip.broadlyepi.com/api/starsim/simulate \
     -H "Origin: https://dip.broadlyepi.com" \
     -H "Access-Control-Request-Method: POST"
   ```

---

**All systems operational! 🚀**


