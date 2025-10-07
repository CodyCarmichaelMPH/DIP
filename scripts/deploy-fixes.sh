#!/bin/bash
# Quick deployment script to deploy the fixed backend and frontend

set -e  # Exit on error

echo "========================================="
echo "Deploying Backend and Frontend Fixes"
echo "========================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud CLI not found. Please install it first."
    exit 1
fi

# Set defaults
PROJECT_ID=${PROJECT_ID:-$(gcloud config get-value project)}
REGION=${REGION:-"us-west1"}

echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Navigate to Production directory
cd "$(dirname "$0")/.."

# Deploy Backend
echo "========================================="
echo "Step 1: Deploying Backend"
echo "========================================="

cd backend
echo "Building and deploying backend to Cloud Run..."

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

# Get backend URL
BACKEND_URL=$(gcloud run services describe dip-backend \
  --region $REGION \
  --format 'value(status.url)' \
  --project $PROJECT_ID)

echo ""
echo "Backend deployed successfully!"
echo "Backend URL: $BACKEND_URL"
echo ""

# Test backend health
echo "Testing backend health..."
if curl -f "${BACKEND_URL}/health" > /dev/null 2>&1; then
    echo "✓ Backend health check passed"
else
    echo "✗ Backend health check failed"
    exit 1
fi

if curl -f "${BACKEND_URL}/api/health" > /dev/null 2>&1; then
    echo "✓ Backend API health check passed"
else
    echo "✗ Backend API health check failed"
    exit 1
fi

echo ""

# Deploy Frontend
echo "========================================="
echo "Step 2: Deploying Frontend"
echo "========================================="

cd ../frontend
echo "Deploying frontend to Cloud Run..."

gcloud run deploy dip-frontend \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 60 \
  --max-instances 10 \
  --set-env-vars VITE_API_BASE_URL="${BACKEND_URL}/api" \
  --project $PROJECT_ID

# Get frontend URL
FRONTEND_URL=$(gcloud run services describe dip-frontend \
  --region $REGION \
  --format 'value(status.url)' \
  --project $PROJECT_ID)

echo ""
echo "Frontend deployed successfully!"
echo "Frontend URL: $FRONTEND_URL"
echo ""

# Summary
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Backend URL:  $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""
echo "Next steps:"
echo "1. Update your domain DNS to point to: $FRONTEND_URL"
echo "2. Test the application at: $FRONTEND_URL"
echo "3. Check browser console for any errors"
echo ""
echo "Verification commands:"
echo "  Backend health:  curl ${BACKEND_URL}/health"
echo "  API health:      curl ${BACKEND_URL}/api/health"
echo "  Frontend:        curl ${FRONTEND_URL}"
echo ""


