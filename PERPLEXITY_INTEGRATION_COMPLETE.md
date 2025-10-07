# Perplexity AI Integration - Complete

**Date:** October 7, 2025  
**Status:** ✅ Backend Deployed | ⏳ Frontend Ready (Not Yet Deployed)

## Overview

The Perplexity AI integration has been completely refactored to use a **server-side API key** stored in Google Cloud Secret Manager, rather than requiring users to provide their own API keys.

## Backend Changes ✅ DEPLOYED

### 1. New Backend Service
**File:** `Production/backend/model_worker/services/perplexity_service.py`
- Created `PerplexityService` class for managing Perplexity API calls
- Reads `PERPLEXITY_API_KEY` from environment (injected from Secret Manager)
- Handles API requests, error handling, and citation processing

### 2. API Endpoints
**File:** `Production/backend/simple_backend.py`

#### POST `/api/perplexity/chat`
Proxy endpoint for Perplexity AI chat completions.

**Request Body:**
```json
{
  "message": "User's query",
  "system_prompt": "Optional system prompt",
  "model": "sonar-pro",
  "max_tokens": 1500,
  "temperature": 0.2
}
```

**Response:**
```json
{
  "content": "AI response content",
  "citations": [
    {
      "title": "Source Title",
      "url": "https://...",
      "date": "2025-01-01"
    }
  ],
  "model": "sonar-pro"
}
```

#### GET `/api/perplexity/status`
Check Perplexity API configuration and health.

**Response:**
```json
{
  "available": true,
  "configured": true,
  "valid": true,
  "message": "Perplexity API is ready"
}
```

### 3. Environment Configuration
**Secret:** `perplexity-api-key` (Google Cloud Secret Manager)
- **Current Version:** 3
- **Injected as:** `PERPLEXITY_API_KEY` environment variable
- **Automatically stripped** of whitespace/newlines by backend code

### 4. Deployment
- **Service:** `dip-backend`
- **Latest Revision:** `dip-backend-00033-zlf`
- **Image:** `us-west1-docker.pkg.dev/disease-intelligence-program/dip-repo/backend:perplexity-v3`
- **URL:** https://dip-backend-398210810947.us-west1.run.app
- **Load Balancer:** https://dip.broadlyepi.com/api
- **Status:** ✅ **DEPLOYED AND RUNNING**

## Frontend Changes ⏳ READY

### Files Modified
1. **`app/src/pages/ResearchAssistant.tsx`**
   - Updated `callPerplexity()` function to call backend proxy
   - Removed direct Perplexity API calls
   - Removed API key from request headers
   
2. **`app/src/components/SilasResearcher.tsx`**
   - Updated `callPerplexity()` function to call backend proxy
   - Removed direct Perplexity API calls
   - Removed API key from request headers

### Changes Summary
**Before:**
```typescript
const response = await fetch('https://api.perplexity.ai/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({ model, messages, ... })
})
```

**After:**
```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const response = await fetch(`${API_BASE}/perplexity/chat`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: message,
    system_prompt: systemPrompt,
    model: 'sonar-pro',
    max_tokens: 1500,
    temperature: 0.2
  })
})
```

## User Experience Changes

### Before
- ❌ Users had to provide their own Perplexity API key
- ❌ API keys stored in browser localStorage
- ❌ Each user needed their own Perplexity account
- ❌ No centralized API key management

### After
- ✅ Server-side API key (secure, centralized)
- ✅ No user configuration required
- ✅ Works immediately without setup
- ✅ Centralized API key management via Google Secret Manager
- ✅ API usage monitoring at organization level

## Testing

### Backend Health Check
```bash
curl https://dip.broadlyepi.com/api/perplexity/status
```

**Expected Response (when API key is valid):**
```json
{
  "available": true,
  "configured": true,
  "valid": true,
  "message": "Perplexity API is ready"
}
```

**Current Status:**
- ⚠️ Returns `valid: false` - API key needs verification
- Possible causes:
  1. API key format incorrect (should start with `pplx-`)
  2. API key not yet activated in Perplexity account
  3. API key permissions not configured

### Test Chat Endpoint
```bash
curl -X POST https://dip.broadlyepi.com/api/perplexity/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is 2+2?",
    "max_tokens": 50
  }'
```

## Next Steps

### 1. Verify Perplexity API Key ⚠️
The current API key in Secret Manager is returning 401 Unauthorized. Please verify:

```bash
# Check current secret
gcloud secrets versions access latest --secret="perplexity-api-key"

# Update with valid Perplexity API key if needed
echo "YOUR_PERPLEXITY_KEY" | gcloud secrets versions add perplexity-api-key --data-file=-

# Redeploy to pick up new key
gcloud run deploy dip-backend \
  --image us-west1-docker.pkg.dev/disease-intelligence-program/dip-repo/backend:perplexity-v3 \
  --region us-west1 \
  --allow-unauthenticated
```

**Note:** Perplexity API keys should start with `pplx-` (not `sk-proj-` like OpenAI)

### 2. Deploy Frontend (Once API Key is Verified)
The frontend code has been updated but not yet deployed. Once the API key is working:

```bash
cd app
npm run build
# Copy built files to Production/frontend
# Deploy frontend
```

### 3. Remove Old API Key UI (Optional)
Since users no longer need to provide API keys, you may want to:
- Remove API key input modals
- Remove localStorage API key storage
- Simplify the SILAS interface

## API Key Configuration

### Getting a Perplexity API Key
1. Visit https://www.perplexity.ai/settings/api
2. Create an API key
3. Add to Secret Manager:
   ```bash
   echo "pplx-..." | gcloud secrets versions add perplexity-api-key --data-file=-
   ```

### Current Secret Configuration
- **Secret Name:** `perplexity-api-key`
- **Project:** `disease-intelligence-program`
- **Latest Version:** 3
- **Injected Into:** Cloud Run service `dip-backend` as `PERPLEXITY_API_KEY`
- **Auto-stripped:** Yes (whitespace/newlines removed by backend)

## Security

### Benefits of Server-Side Key
1. **No Key Exposure:** API key never exposed to browser/client
2. **Centralized Control:** Single key managed in Secret Manager
3. **Easy Rotation:** Update secret, redeploy (no user action needed)
4. **Usage Monitoring:** All API calls tracked at server level
5. **Cost Control:** Organization manages API usage and costs

### CORS Configuration
Backend CORS allows requests from:
- `https://dip.broadlyepi.com`
- `https://dip-frontend-*.run.app`
- Localhost (development)

## Troubleshooting

### "Backend API error: 401"
- API key is invalid or not a Perplexity key
- Check secret: `gcloud secrets versions access latest --secret="perplexity-api-key"`
- Verify key starts with `pplx-`

### "Backend API error: 503"
- Perplexity API key not configured
- Check Cloud Run environment variables
- Verify secret is injected correctly

### "available: false"
- `PERPLEXITY_API_KEY` environment variable not set
- Check Cloud Run service configuration:
  ```bash
  gcloud run services describe dip-backend --region us-west1 \
    --format="yaml(spec.template.spec.containers[0].env)"
  ```

## Files Changed

### Backend
- `Production/backend/model_worker/services/perplexity_service.py` (NEW)
- `Production/backend/model_worker/main.py` (MODIFIED - added endpoints)
- `Production/backend/simple_backend.py` (MODIFIED - added proxy endpoints)

### Frontend (Not Yet Deployed)
- `app/src/pages/ResearchAssistant.tsx` (MODIFIED)
- `app/src/components/SilasResearcher.tsx` (MODIFIED)

### Documentation
- `Production/PERPLEXITY_INTEGRATION_COMPLETE.md` (THIS FILE)

## Support

If issues persist after verifying the API key:

1. Check backend logs:
   ```bash
   gcloud run services logs read dip-backend --region us-west1 --limit 50
   ```

2. Test status endpoint:
   ```bash
   curl https://dip.broadlyepi.com/api/perplexity/status
   ```

3. Verify secret access:
   ```bash
   gcloud secrets versions access latest --secret="perplexity-api-key"
   ```

---

**Backend Status:** ✅ Deployed and operational (pending valid API key)  
**Frontend Status:** ⏳ Code updated, ready to deploy  
**Integration Status:** 🔄 Awaiting API key verification


