# Disease Intelligence Program - Deployment Guide

## 🎯 Production Deployment Guide

This guide provides detailed instructions for deploying the Disease Intelligence Program in a production environment.

## 📋 Pre-Deployment Checklist

### System Requirements
- [ ] Docker 20.10+ installed
- [ ] Docker Compose 2.0+ installed
- [ ] 4GB+ RAM available
- [ ] 5GB+ disk space available
- [ ] Ports 80 and 8000 available
- [ ] Internet connectivity

### Security Considerations
- [ ] Firewall configured for ports 80/8000
- [ ] SSL certificates ready (if using HTTPS)
- [ ] Domain name configured (if applicable)
- [ ] Backup strategy planned

## 🚀 Step-by-Step Deployment

### 1. Prepare the Environment

```bash
# Create deployment directory
mkdir -p /opt/dip-production
cd /opt/dip-production

# Copy production files
cp -r /path/to/Production/* .

# Set permissions
chmod +x scripts/*.sh
chown -R 1000:1000 data/
```

### 2. Configure Environment

Create `.env` file:
```env
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO
ALLOWED_HOSTS=localhost,yourdomain.com
CORS_ORIGINS=http://localhost,https://yourdomain.com
```

### 3. SSL Configuration (Optional)

For HTTPS deployment:
```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy your SSL certificates
cp your-cert.pem nginx/ssl/
cp your-key.pem nginx/ssl/

# Update nginx configuration for HTTPS
```

### 4. Deploy the Application

```bash
# Run deployment script
./scripts/deploy.sh

# Or manually:
docker-compose -f docker-compose.prod.yml up -d
```

### 5. Verify Deployment

```bash
# Check service health
curl http://localhost/health
curl http://localhost:8000/health

# Check logs
docker-compose -f docker-compose.prod.yml logs
```

## 🔧 Configuration Options

### Backend Configuration

Edit `backend/simple_backend.py`:
```python
# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Frontend Configuration

Edit `frontend/nginx.conf`:
```nginx
# Update server_name
server_name yourdomain.com;

# Add SSL configuration
listen 443 ssl;
ssl_certificate /etc/nginx/ssl/your-cert.pem;
ssl_certificate_key /etc/nginx/ssl/your-key.pem;
```

### Database Configuration (Future)

For persistent data storage:
```yaml
# Add to docker-compose.prod.yml
services:
  database:
    image: postgres:15
    environment:
      POSTGRES_DB: dip_production
      POSTGRES_USER: dip_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

## 📊 Monitoring Setup

### Health Monitoring

```bash
# Create monitoring script
cat > scripts/monitor.sh << 'EOF'
#!/bin/bash
while true; do
    if ! curl -f http://localhost/health > /dev/null 2>&1; then
        echo "$(date): Frontend health check failed" >> logs/health.log
    fi
    if ! curl -f http://localhost:8000/health > /dev/null 2>&1; then
        echo "$(date): Backend health check failed" >> logs/health.log
    fi
    sleep 60
done
EOF

chmod +x scripts/monitor.sh
```

### Log Management

```bash
# Set up log rotation
cat > /etc/logrotate.d/dip << 'EOF'
/opt/dip-production/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF
```

## 🔄 Update Procedures

### Application Updates

1. **Backup current deployment**:
```bash
docker-compose -f docker-compose.prod.yml down
cp -r . ../backup-$(date +%Y%m%d)
```

2. **Update application files**:
```bash
# Replace with new files
cp -r /path/to/new/Production/* .
```

3. **Rebuild and restart**:
```bash
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### Data Updates

```bash
# Update data files
cp -r /path/to/new/data/* data/

# Restart backend to reload data
docker-compose -f docker-compose.prod.yml restart backend
```

## 🛠️ Maintenance

### Regular Maintenance Tasks

1. **Log cleanup**:
```bash
find logs/ -name "*.log" -mtime +7 -delete
```

2. **Container cleanup**:
```bash
docker system prune -f
```

3. **Health check**:
```bash
./scripts/monitor.sh
```

### Backup Procedures

```bash
# Full backup
tar -czf dip-backup-$(date +%Y%m%d).tar.gz \
    --exclude='logs' \
    --exclude='*.log' \
    .

# Data-only backup
tar -czf dip-data-$(date +%Y%m%d).tar.gz data/
```

## 🆘 Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check port usage
netstat -tulpn | grep :80
netstat -tulpn | grep :8000

# Kill processes using ports
sudo fuser -k 80/tcp
sudo fuser -k 8000/tcp
```

#### Memory Issues
```bash
# Check memory usage
docker stats

# Increase Docker memory limit
# Edit Docker Desktop settings or /etc/docker/daemon.json
```

#### Permission Issues
```bash
# Fix permissions
sudo chown -R 1000:1000 .
chmod +x scripts/*.sh
```

### Debug Commands

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs frontend
docker-compose -f docker-compose.prod.yml logs backend

# Access container
docker-compose -f docker-compose.prod.yml exec backend bash

# Check container status
docker-compose -f docker-compose.prod.yml ps
```

## 📞 Support

For deployment issues:
- **Email**: Cody.Carmichael@broadlyepi.com
- **Documentation**: Check `docs/` directory
- **Logs**: Review application logs for error details

---

**Last Updated**: $(date)
**Version**: 1.0.0
