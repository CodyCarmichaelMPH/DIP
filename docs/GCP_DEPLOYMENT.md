# Google Cloud Platform Deployment Guide

This guide explains how to deploy the Disease Intelligence Program (DIP) to Google Cloud Platform using Cloud Run.

## Prerequisites

1. Google Cloud Platform account
2. Google Cloud SDK installed locally
3. Docker installed locally (for testing builds)
4. Domain name configured (dip.broadlyepi.com)

## Deployment Steps

### Automated Deployment

For automated deployment, run one of the following scripts:

- **Windows**: `deploy-to-gcp.bat` in the root directory
- **Linux/Mac**: `Production/scripts/deploy-gcp.sh`

### Manual Deployment

If you prefer to deploy manually, follow these steps:

#### Backend Deployment

1. Navigate to the backend directory:
   ```
   cd Production/backend
   ```

2. Build the container:
   ```
   gcloud builds submit --tag gcr.io/broadlyepi-dip/dip-backend
   ```

3. Deploy to Cloud Run:
   ```
   gcloud run deploy dip-backend \
     --image gcr.io/broadlyepi-dip/dip-backend \
     --platform managed \
     --region us-west1 \
     --allow-unauthenticated \
     --memory 1Gi \
     --cpu 1 \
     --port 8080 \
     --set-env-vars="ENVIRONMENT=production"
   ```

#### Frontend Deployment

1. Navigate to the frontend directory:
   ```
   cd Production/frontend
   ```

2. Build the container:
   ```
   gcloud builds submit --tag gcr.io/broadlyepi-dip/dip-frontend
   ```

3. Deploy to Cloud Run:
   ```
   gcloud run deploy dip-frontend \
     --image gcr.io/broadlyepi-dip/dip-frontend \
     --platform managed \
     --region us-west1 \
     --allow-unauthenticated \
     --memory 512Mi \
     --cpu 1 \
     --port 8080
   ```

4. Map the custom domain:
   ```
   gcloud beta run domain-mappings create \
     --service dip-frontend \
     --domain dip.broadlyepi.com \
     --platform managed \
     --region us-west1
   ```

## DNS Configuration

After deployment, you need to configure your DNS settings:

1. Get the verification details from GCP:
   ```
   gcloud beta run domain-mappings describe \
     --domain dip.broadlyepi.com \
     --platform managed \
     --region us-west1
   ```

2. Add the required DNS records to your domain provider.

## Troubleshooting

### MIME Type Issues

If you encounter MIME type issues with the frontend, check the following:

1. Verify that the nginx.conf.template file has the correct MIME type configurations
2. Ensure that the assets are being served with the correct Content-Type headers
3. Check the browser console for specific MIME type errors

### CORS Issues

If you encounter CORS issues:

1. Verify that the backend has the correct CORS settings in main.py
2. Check that the frontend is making requests to the correct API endpoint
3. Ensure the domain is properly configured in the CORS allowed origins

## Monitoring

Monitor your deployment using Google Cloud Console:

- Cloud Run services: https://console.cloud.google.com/run
- Logs: https://console.cloud.google.com/logs
- Error Reporting: https://console.cloud.google.com/errors

