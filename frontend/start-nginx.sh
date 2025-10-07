#!/bin/sh
# Simple nginx startup script

set -e

echo "🚀 Starting nginx with PORT=${PORT:-8080}"

# Set default port if not provided
export PORT=${PORT:-8080}

# Update the nginx config to use the correct port
sed -i "s/listen 8080;/listen ${PORT};/g" /etc/nginx/conf.d/default.conf

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
nginx -t

# Start nginx
echo "🌟 Starting nginx on port ${PORT}..."
exec nginx -g 'daemon off;'




