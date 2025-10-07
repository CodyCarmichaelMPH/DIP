# CORS and Routing Fix - Production Backend

## Problem Summary

The backend was returning 404 errors and CORS issues when accessed from `https://dip.broadlyepi.com`. The test showed:
1. Backend responded with 404 (route not found)
2. CORS headers were missing (because FastAPI doesn't send them on error responses)

## Root Cause

**`main.py` was importing the wrong app from `simple_backend.py`:**

- `simple_backend.py` exports TWO apps:
  - `app` - The base FastAPI app WITHOUT CORS middleware
  - `root_app` - The properly configured app WITH CORS middleware and routes mounted at `/api`

- `main.py` was creating a NEW `root_app` and mounting the base `app` at `/`, which:
  - Lost all CORS configuration from `simple_backend.py`
  - Changed the route paths from `/api/*` to `/*`
  - Didn't include `https://dip.broadlyepi.com` in allowed origins

## Fix Applied

**Updated `Production/backend/main.py`:**

```python
# Import the properly configured root_app from simple_backend
# This includes CORS middleware and all routes mounted at /api
from simple_backend import root_app
```

Now `main.py` simply re-exports the properly configured `root_app` from `simple_backend.py`.

## What This Fixes

### 1. CORS Configuration
The `root_app` in `simple_backend.py` already has proper CORS middleware with:
```python
allow_origins=[
    "https://dip.broadlyepi.com",           # ✅ Production domain
    "https://dip-frontend-398210810947.us-west1.run.app",
    "http://localhost:5173",
    "http://localhost:5174", 
    "http://localhost:3000",
    "http://localhost"
]
```

### 2. Route Paths
Routes are properly mounted at `/api`:
- Backend routes: `/api/starsim/simulate`, `/api/seir/simulate`, etc.
- Frontend calls: `fetch("/api/starsim/simulate")`
- Nginx proxy: Forwards `/api/*` → backend `/api/*`

### 3. Request Flow
```
Frontend Browser (https://dip.broadlyepi.com)
  ↓
  fetch("/api/starsim/simulate")
  ↓
Nginx (same origin, no CORS needed)
  ↓
  location /api/ { proxy_pass https://backend; }
  ↓
Backend (https://dip-backend-398210810947.us-west1.run.app/api/starsim/simulate)
  ↓
  CORS middleware checks origin → ✅ Allowed
  ↓
  Route handler executes → ✅ Returns JSON
  ↓
  Response with proper CORS headers
```

## Verification Steps

After redeploying the backend, test with:

### Test 1: Direct Backend Access
```javascript
// In browser console at https://dip.broadlyepi.com
fetch("https://dip-backend-398210810947.us-west1.run.app/api/starsim/simulate", {
  method: "POST"
})
  .then(r => r.json())
  .then(console.log)
```

Expected: JSON response with simulation results, no CORS errors

### Test 2: Through Nginx Proxy
```javascript
// In browser console at https://dip.broadlyepi.com
fetch("/api/starsim/simulate", {
  method: "POST"
})
  .then(r => r.json())
  .then(console.log)
```

Expected: Same JSON response, no CORS errors

### Test 3: Health Check
```javascript
fetch("/api/health")
  .then(r => r.json())
  .then(console.log)
```

Expected: `{"status": "healthy", "message": "Backend is running"}`

## Configuration Summary

| Component | Configuration | Purpose |
|-----------|--------------|---------|
| `simple_backend.py` | Creates `root_app` with CORS | Main app configuration |
| `main.py` | Imports `root_app` from simple_backend | Uvicorn entrypoint |
| Dockerfile | `uvicorn main:root_app` | Container entrypoint |
| Nginx | `location /api/` → `proxy_pass https://backend` | Route forwarding |

## Notes

- The Nginx proxy does NOT have a trailing slash on `proxy_pass`, which preserves the full path `/api/*`
- CORS middleware is only on `root_app`, not on the mounted `app` (to avoid double-processing)
- Both origin regex and explicit origin list are used for maximum compatibility
- Frontend calls should use relative paths (`/api/*`) to avoid CORS issues entirely


