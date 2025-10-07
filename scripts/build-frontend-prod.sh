#!/bin/bash
# Production frontend build script

set -e

echo "🏗️ Building frontend for production..."

# Set production environment variables
export VITE_API_BASE_URL=/api
export NODE_ENV=production

# Build the frontend
cd ../app
npm run build

# Copy built files to production directory
echo "📦 Copying built files to production directory..."
cp -r dist/* ../Production/frontend/

echo "✅ Frontend build complete!"




