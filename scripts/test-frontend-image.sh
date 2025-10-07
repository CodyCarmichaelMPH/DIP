#!/bin/bash
# Test frontend image to verify index.html is present and nginx config is correct

set -e

echo "🔍 Testing frontend image..."

# Build the image
echo "📦 Building frontend image..."
docker build -t dip-frontend-test ./frontend

# Check if index.html exists
echo "📄 Checking for index.html..."
docker run --rm dip-frontend-test ls -la /usr/share/nginx/html/ | grep index.html

# Check if assets directory exists
echo "📁 Checking for assets directory..."
docker run --rm dip-frontend-test ls -la /usr/share/nginx/html/assets/ | head -5

# Check what files are in the root
echo "📋 Files in nginx root:"
docker run --rm dip-frontend-test ls -la /usr/share/nginx/html/ | head -10

# Check if data directories were copied
echo "📁 Checking for data directories:"
docker run --rm dip-frontend-test ls -la /usr/share/nginx/html/ | grep -E "(DiseaseStateLevelData|LocalData)"

# Check nginx config template
echo "⚙️ Checking nginx config template..."
docker run --rm dip-frontend-test cat /etc/nginx/templates/default.conf.template | head -10

# Test nginx config syntax
echo "✅ Testing nginx config syntax..."
docker run --rm -e PORT=8080 dip-frontend-test nginx -t

echo "🎉 Frontend image test completed!"
echo ""
echo "To test locally:"
echo "docker run --rm -p 8080:8080 -e PORT=8080 dip-frontend-test"
echo "curl http://localhost:8080/"


set -e

echo "🔍 Testing frontend image..."

# Build the image
echo "📦 Building frontend image..."
docker build -t dip-frontend-test ./frontend

# Check if index.html exists
echo "📄 Checking for index.html..."
docker run --rm dip-frontend-test ls -la /usr/share/nginx/html/ | grep index.html

# Check if assets directory exists
echo "📁 Checking for assets directory..."
docker run --rm dip-frontend-test ls -la /usr/share/nginx/html/assets/ | head -5

# Check what files are in the root
echo "📋 Files in nginx root:"
docker run --rm dip-frontend-test ls -la /usr/share/nginx/html/ | head -10

# Check if data directories were copied
echo "📁 Checking for data directories:"
docker run --rm dip-frontend-test ls -la /usr/share/nginx/html/ | grep -E "(DiseaseStateLevelData|LocalData)"

# Check nginx config template
echo "⚙️ Checking nginx config template..."
docker run --rm dip-frontend-test cat /etc/nginx/templates/default.conf.template | head -10

# Test nginx config syntax
echo "✅ Testing nginx config syntax..."
docker run --rm -e PORT=8080 dip-frontend-test nginx -t

echo "🎉 Frontend image test completed!"
echo ""
echo "To test locally:"
echo "docker run --rm -p 8080:8080 -e PORT=8080 dip-frontend-test"
echo "curl http://localhost:8080/"


