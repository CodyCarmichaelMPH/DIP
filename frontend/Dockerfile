FROM nginx:alpine

# bring envsubst (from gettext) to render ${PORT}
RUN apk add --no-cache gettext

# copy all files first, then selectively copy to nginx directory
COPY . /tmp/build/
WORKDIR /tmp/build

# copy files safely using shell logic
RUN set -e && \
    # Always copy index.html (required)
    cp index.html /usr/share/nginx/html/ && \
    # Copy assets directory if it exists
    if [ -d "assets" ]; then cp -r assets/ /usr/share/nginx/html/; fi && \
    # Copy data files if they exist
    for pattern in "*.geojson" "*.json" "*.csv" "*.png"; do \
        if ls $pattern 1> /dev/null 2>&1; then cp $pattern /usr/share/nginx/html/; fi; \
    done && \
    # Copy data directories if they exist
    for dir in "DiseaseStateLevelData" "LocalData" "data"; do \
        if [ -d "$dir" ]; then cp -r $dir/ /usr/share/nginx/html/; fi; \
    done && \
    echo "Files copied successfully"

# Note: API URL should be set during build process using build-frontend-prod.sh

# Use minimal nginx config
COPY nginx-minimal.conf /etc/nginx/conf.d/default.conf

# Start nginx directly
CMD ["nginx", "-g", "daemon off;"]

# bring envsubst (from gettext) to render ${PORT}
RUN apk add --no-cache gettext

# copy all files first, then selectively copy to nginx directory
COPY . /tmp/build/
WORKDIR /tmp/build

# copy files safely using shell logic
RUN set -e && \
    # Always copy index.html (required)
    cp index.html /usr/share/nginx/html/ && \
    # Copy assets directory if it exists
    if [ -d "assets" ]; then cp -r assets/ /usr/share/nginx/html/; fi && \
    # Copy data files if they exist
    for pattern in "*.geojson" "*.json" "*.csv" "*.png"; do \
        if ls $pattern 1> /dev/null 2>&1; then cp $pattern /usr/share/nginx/html/; fi; \
    done && \
    # Copy data directories if they exist
    for dir in "DiseaseStateLevelData" "LocalData" "data"; do \
        if [ -d "$dir" ]; then cp -r $dir/ /usr/share/nginx/html/; fi; \
    done && \
    echo "Files copied successfully"

# Note: API URL should be set during build process using build-frontend-prod.sh

# Use minimal nginx config
COPY nginx-minimal.conf /etc/nginx/conf.d/default.conf

# Start nginx directly
CMD ["nginx", "-g", "daemon off;"]


