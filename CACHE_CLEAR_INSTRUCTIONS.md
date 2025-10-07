# Clear Browser Cache Instructions

## The Problem
Your browser may be caching the old version of the site with the bugs. The new fixed version is deployed, but you need to force your browser to download the fresh files.

## Solution: Hard Refresh

### Windows (Chrome, Firefox, Edge)
Press **`Ctrl + Shift + R`** or **`Ctrl + F5`**

### Mac (Chrome, Firefox, Safari)
Press **`Cmd + Shift + R`**

### Alternative: Clear Cache Manually

#### Chrome
1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Select "Cached images and files"
3. Time range: "Last hour" or "Last 24 hours"
4. Click "Clear data"
5. Reload the page

#### Firefox
1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Select "Cache"
3. Time range: "Last hour"
4. Click "Clear Now"
5. Reload the page

## Verify the Fix

After clearing cache, open the browser console (F12) and you should **NOT** see:
- ❌ `TypeError: can't access property "style", document.body is null`

Instead, the page should load without errors.

## What Was Fixed

### Frontend (Deployed ✅)
- **File:** `index.html`
- **Fix:** Theme script now safely handles the case where `document.body` doesn't exist yet
- **URL:** https://dip.broadlyepi.com/

### Backend (Deployed ✅)
- **File:** `simple_backend.py` - Removed duplicate code
- **File:** `Dockerfile` - Added dynamic PORT handling
- **URL:** https://dip-backend-398210810947.us-west1.run.app

## Still Seeing Errors?

If you still see errors after clearing cache, please share:
1. The exact error message from the browser console (F12)
2. Which URL you're accessing
3. Which browser and version you're using

I'll help diagnose any remaining issues!


