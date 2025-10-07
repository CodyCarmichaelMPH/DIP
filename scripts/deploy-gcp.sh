#!/bin/bash
set -e

# Configuration
PROJECT_ID="disease-intelligence-program"
REGION="us-west1"
FRONTEND_SERVICE="dip-frontend"
BACKEND_SERVICE="dip-backend"
DOMAIN="dip.broadlyepi.com"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting deployment to Google Cloud Run...${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Check if user is logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo "You need to log in to Google Cloud first. Run: gcloud auth login"
    exit 1
fi

# Set the project
echo -e "${YELLOW}Setting project to ${PROJECT_ID}...${NC}"
gcloud config set project ${PROJECT_ID}

# Deploy backend
echo -e "${GREEN}Building and deploying backend...${NC}"
cd ../backend

# Build the container
echo "Building backend container..."
gcloud builds submit --tag gcr.io/${PROJECT_ID}/${BACKEND_SERVICE}

# Deploy to Cloud Run
echo "Deploying backend to Cloud Run..."
gcloud run deploy ${BACKEND_SERVICE} \
  --image gcr.io/${PROJECT_ID}/${BACKEND_SERVICE} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --port 8080 \
  --set-env-vars="ENVIRONMENT=production"

# Get the backend URL
BACKEND_URL=$(gcloud run services describe ${BACKEND_SERVICE} --platform managed --region ${REGION} --format 'value(status.url)')
echo -e "${GREEN}Backend deployed at: ${BACKEND_URL}${NC}"

# Deploy frontend
echo -e "${GREEN}Building and deploying frontend...${NC}"
cd ../frontend

# Build the container
echo "Building frontend container..."
gcloud builds submit --tag gcr.io/${PROJECT_ID}/${FRONTEND_SERVICE}

# Deploy to Cloud Run
echo "Deploying frontend to Cloud Run..."
gcloud run deploy ${FRONTEND_SERVICE} \
  --image gcr.io/${PROJECT_ID}/${FRONTEND_SERVICE} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --port 8080

# Get the frontend URL
FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SERVICE} --platform managed --region ${REGION} --format 'value(status.url)')
echo -e "${GREEN}Frontend deployed at: ${FRONTEND_URL}${NC}"

# Map custom domain
echo -e "${YELLOW}Mapping custom domain ${DOMAIN}...${NC}"
gcloud beta run domain-mappings create \
  --service ${FRONTEND_SERVICE} \
  --domain ${DOMAIN} \
  --platform managed \
  --region ${REGION}

echo -e "${GREEN}Deployment completed!${NC}"
echo -e "Please ensure your DNS records for ${DOMAIN} are properly configured."
echo -e "Frontend: https://${DOMAIN}"
echo -e "Backend: ${BACKEND_URL}"
echo -e "${YELLOW}Note: It may take some time for the DNS changes to propagate.${NC}"
