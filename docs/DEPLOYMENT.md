# CatchUp Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the CatchUp application to production environments. It covers environment setup, database configuration, external service integration, and scaling considerations.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Database Setup](#database-setup)
4. [External Services](#external-services)
5. [Deployment Options](#deployment-options)
6. [Scaling Considerations](#scaling-considerations)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Backup and Recovery](#backup-and-recovery)
9. [Security Checklist](#security-checklist)

## Prerequisites

### System Requirements

**Minimum Requirements:**
- Node.js 18.x or higher
- PostgreSQL 14.x or higher
- Redis 6.x or higher
- 2GB RAM
- 20GB storage

**Recommended for Production:**
- Node.js 20.x LTS
- PostgreSQL 15.x
- Redis 7.x
- 4GB+ RAM
- 50GB+ SSD storage
- Load balancer (nginx, AWS ALB, etc.)

### Required Accounts

Before deployment, create accounts for:
- Google Cloud Platform (for Calendar and Contacts APIs)
- Twilio (for SMS notifications)
- SendGrid (for email notifications)
- OpenAI (for voice transcription and NLP)
- Cloud storage provider (AWS S3, Google Cloud Storage, etc.)


## Environment Variables

### Configuration File

Copy the example environment file and configure:

```bash
cp .env.example .env
```

### Required Variables

#### Database Configuration

```bash
# PostgreSQL connection settings
DATABASE_HOST=your-db-host.com
DATABASE_PORT=5432
DATABASE_NAME=catchup_production
DATABASE_USER=catchup_user
DATABASE_PASSWORD=<strong-password>
DATABASE_SSL=true

# Connection pool settings
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20
```

**Notes:**
- Use SSL in production (`DATABASE_SSL=true`)
- Increase pool size based on expected concurrent connections
- Use managed database services (AWS RDS, Google Cloud SQL) for production

#### Application Settings

```bash
NODE_ENV=production
PORT=3000
```

**Notes:**
- Always set `NODE_ENV=production` in production
- Port can be changed based on your infrastructure

#### Security - JWT Authentication

```bash
# Generate using: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<your-secure-jwt-secret>
JWT_EXPIRES_IN=7d
```

**Important:**
- Generate a cryptographically secure random string
- Never commit JWT_SECRET to version control
- Rotate JWT_SECRET periodically (requires all users to re-login)

#### Security - Data Encryption

```bash
# Generate using: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=<your-64-character-hex-key>
```

**Important:**
- Used for encrypting sensitive data at rest
- Must be exactly 64 hexadecimal characters (32 bytes)
- Changing this key will make existing encrypted data unreadable

#### Redis Configuration

```bash
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password>
REDIS_DB=0
REDIS_URL=redis://:password@host:6379
```

**Notes:**
- Use managed Redis services (AWS ElastiCache, Redis Cloud) for production
- Enable password authentication
- Use TLS/SSL for Redis connections in production


### External Service Configuration

#### Google Calendar OAuth

```bash
GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback
```

**Setup Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google Calendar API and Google Contacts API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs
6. Copy Client ID and Client Secret

**Required OAuth Scopes:**
- `https://www.googleapis.com/auth/calendar.readonly`
- `https://www.googleapis.com/auth/contacts.readonly`

#### Twilio SMS

```bash
TWILIO_ACCOUNT_SID=<your-account-sid>
TWILIO_AUTH_TOKEN=<your-auth-token>
TWILIO_PHONE_NUMBER=+1234567890
```

**Setup Steps:**
1. Sign up at [Twilio](https://www.twilio.com)
2. Get a phone number with SMS capabilities
3. Copy Account SID and Auth Token from dashboard
4. Configure webhook URLs for incoming SMS (for reply processing)

**Webhook Configuration:**
- Incoming SMS webhook: `https://your-domain.com/api/webhooks/sms`
- Method: POST
- Content-Type: application/x-www-form-urlencoded

#### SendGrid Email

```bash
SENDGRID_API_KEY=<your-sendgrid-api-key>
SENDGRID_FROM_EMAIL=noreply@your-domain.com
```

**Setup Steps:**
1. Sign up at [SendGrid](https://sendgrid.com)
2. Verify your sender domain
3. Create an API key with "Mail Send" permissions
4. Configure webhook for email events (optional)

**Webhook Configuration (Optional):**
- Event webhook: `https://your-domain.com/api/webhooks/email`
- Events: delivered, bounced, failed

#### OpenAI API

```bash
OPENAI_API_KEY=<your-openai-api-key>
```

**Setup Steps:**
1. Sign up at [OpenAI](https://platform.openai.com)
2. Create an API key
3. Set up billing and usage limits

**Used For:**
- Voice transcription (Whisper API)
- Entity extraction from transcripts (GPT-4)
- Contact disambiguation (GPT-4)


## Database Setup

### Initial Setup

#### 1. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE catchup_production;
CREATE USER catchup_user WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE catchup_production TO catchup_user;

# Exit psql
\q
```

#### 2. Run Migrations

The application uses SQL migration files located in `scripts/migrations/`.

```bash
# Make setup script executable
chmod +x scripts/setup-db.sh

# Run database setup (creates tables and indexes)
npm run db:setup
```

**Migration Files:**
- `001_create_core_tables.sql` - Users, contacts, groups, tags
- `002_create_interaction_suggestion_tables.sql` - Interactions, suggestions, voice notes
- `003_create_preferences_tables.sql` - Availability and notification preferences
- `004_add_composite_indexes.sql` - Performance indexes
- `005_create_users_table.sql` - Authentication tables
- `006_create_audit_logs_table.sql` - Audit logging

#### 3. Verify Setup

```bash
# Test database connection
npm run db:test
```

### Database Migrations

#### Running Migrations Manually

```bash
# Run all pending migrations
bash scripts/run-migrations.sh
```

#### Creating New Migrations

1. Create a new SQL file in `scripts/migrations/`
2. Name it with incrementing number: `007_your_migration_name.sql`
3. Include both UP and DOWN migrations if possible
4. Test on development environment first

**Migration Template:**
```sql
-- Migration: 007_add_new_feature
-- Description: Add tables for new feature

BEGIN;

-- Create new table
CREATE TABLE IF NOT EXISTS new_feature (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_new_feature_user_id ON new_feature(user_id);

COMMIT;
```

### Database Optimization

#### Indexes

The application creates indexes on frequently queried fields:

```sql
-- User-based queries
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_suggestions_user_id ON suggestions(user_id);

-- Status-based queries
CREATE INDEX idx_suggestions_status ON suggestions(status);

-- Time-based queries
CREATE INDEX idx_suggestions_created_at ON suggestions(created_at);

-- Composite indexes for common query patterns
CREATE INDEX idx_suggestions_user_status ON suggestions(user_id, status);
CREATE INDEX idx_contacts_user_archived ON contacts(user_id, archived);
```

#### Connection Pooling

Configure connection pool based on expected load:

```javascript
// Low traffic (< 100 concurrent users)
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

// Medium traffic (100-1000 concurrent users)
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20

// High traffic (> 1000 concurrent users)
DATABASE_POOL_MIN=10
DATABASE_POOL_MAX=50
```

#### Vacuum and Analyze

Set up regular maintenance:

```sql
-- Run weekly
VACUUM ANALYZE;

-- For heavily updated tables
VACUUM ANALYZE contacts;
VACUUM ANALYZE suggestions;
VACUUM ANALYZE interaction_logs;
```


## External Services

### Google Calendar API Setup

#### 1. Create Google Cloud Project

```bash
# Visit Google Cloud Console
https://console.cloud.google.com

# Create new project
Project Name: CatchUp Production
Project ID: catchup-prod-xxxxx
```

#### 2. Enable APIs

Enable the following APIs:
- Google Calendar API
- Google Contacts API (People API)

```bash
# Using gcloud CLI
gcloud services enable calendar-json.googleapis.com
gcloud services enable people.googleapis.com
```

#### 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in application information:
   - App name: CatchUp
   - User support email: support@your-domain.com
   - Developer contact: dev@your-domain.com
4. Add scopes:
   - `../auth/calendar.readonly`
   - `../auth/contacts.readonly`
5. Add test users (for testing)
6. Submit for verification (required for production)

#### 4. Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Application type: Web application
4. Name: CatchUp Web Client
5. Authorized redirect URIs:
   - `https://your-domain.com/auth/google/callback`
   - `http://localhost:3000/auth/google/callback` (for development)
6. Save Client ID and Client Secret

### Twilio SMS Setup

#### 1. Create Twilio Account

```bash
# Sign up at
https://www.twilio.com/try-twilio
```

#### 2. Get Phone Number

1. Go to Phone Numbers > Buy a Number
2. Select country and capabilities (SMS required)
3. Purchase number

#### 3. Configure Webhooks

1. Go to Phone Numbers > Manage > Active Numbers
2. Click on your phone number
3. Configure Messaging:
   - Webhook URL: `https://your-domain.com/api/webhooks/sms`
   - HTTP Method: POST
   - Content-Type: application/x-www-form-urlencoded

#### 4. Set Up Messaging Service (Optional)

For better deliverability:
1. Go to Messaging > Services
2. Create new Messaging Service
3. Add your phone number to the service
4. Configure sender pool

### SendGrid Email Setup

#### 1. Create SendGrid Account

```bash
# Sign up at
https://signup.sendgrid.com
```

#### 2. Verify Sender Domain

1. Go to Settings > Sender Authentication
2. Click "Authenticate Your Domain"
3. Follow DNS configuration steps
4. Wait for verification (can take up to 48 hours)

#### 3. Create API Key

1. Go to Settings > API Keys
2. Click "Create API Key"
3. Name: CatchUp Production
4. Permissions: Full Access (or Mail Send only)
5. Copy and save the API key

#### 4. Configure Event Webhook (Optional)

1. Go to Settings > Mail Settings > Event Webhook
2. Enable Event Webhook
3. HTTP Post URL: `https://your-domain.com/api/webhooks/email`
4. Select events: Delivered, Bounced, Failed
5. Save

### OpenAI API Setup

#### 1. Create OpenAI Account

```bash
# Sign up at
https://platform.openai.com/signup
```

#### 2. Set Up Billing

1. Go to Settings > Billing
2. Add payment method
3. Set usage limits (recommended)

#### 3. Create API Key

1. Go to API Keys
2. Click "Create new secret key"
3. Name: CatchUp Production
4. Copy and save the key

#### 4. Configure Usage Limits

Recommended limits to prevent unexpected costs:
- Hard limit: $100/month
- Soft limit: $50/month (email notification)

### Cloud Storage Setup (for Voice Notes)

#### AWS S3

```bash
# Create S3 bucket
aws s3 mb s3://catchup-voice-notes-prod

# Configure bucket policy
aws s3api put-bucket-policy --bucket catchup-voice-notes-prod --policy file://bucket-policy.json

# Enable versioning
aws s3api put-bucket-versioning --bucket catchup-voice-notes-prod --versioning-configuration Status=Enabled
```

**Bucket Policy (bucket-policy.json):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT-ID:role/catchup-app-role"
      },
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::catchup-voice-notes-prod/*"
    }
  ]
}
```

#### Google Cloud Storage

```bash
# Create bucket
gsutil mb -p catchup-prod gs://catchup-voice-notes-prod

# Set lifecycle policy
gsutil lifecycle set lifecycle.json gs://catchup-voice-notes-prod
```


## Deployment Options

### Option 1: Docker Deployment

#### 1. Create Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

#### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: catchup_production
      POSTGRES_USER: catchup_user
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### 3. Deploy

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Option 2: AWS Deployment

#### Architecture

```
Internet
    ↓
Application Load Balancer (ALB)
    ↓
ECS Fargate (Auto-scaling)
    ↓
├── RDS PostgreSQL (Multi-AZ)
├── ElastiCache Redis
└── S3 (Voice Notes)
```

#### 1. Create ECS Task Definition

```json
{
  "family": "catchup-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "catchup-app",
      "image": "your-ecr-repo/catchup:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:catchup/db-password"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/catchup-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### 2. Deploy with AWS CLI

```bash
# Create ECR repository
aws ecr create-repository --repository-name catchup

# Build and push Docker image
docker build -t catchup .
docker tag catchup:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/catchup:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/catchup:latest

# Create ECS cluster
aws ecs create-cluster --cluster-name catchup-production

# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
  --cluster catchup-production \
  --service-name catchup-app \
  --task-definition catchup-app \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Option 3: Heroku Deployment

#### 1. Create Heroku App

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create catchup-production

# Add PostgreSQL
heroku addons:create heroku-postgresql:standard-0

# Add Redis
heroku addons:create heroku-redis:premium-0
```

#### 2. Configure Environment Variables

```bash
# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret
heroku config:set GOOGLE_CLIENT_ID=your-client-id
heroku config:set GOOGLE_CLIENT_SECRET=your-secret
heroku config:set TWILIO_ACCOUNT_SID=your-sid
heroku config:set TWILIO_AUTH_TOKEN=your-token
heroku config:set SENDGRID_API_KEY=your-key
heroku config:set OPENAI_API_KEY=your-key
```

#### 3. Deploy

```bash
# Deploy to Heroku
git push heroku main

# Run migrations
heroku run npm run db:setup

# View logs
heroku logs --tail
```

### Option 4: DigitalOcean App Platform

#### 1. Create App Spec

```yaml
name: catchup-production
services:
  - name: web
    github:
      repo: your-username/catchup-app
      branch: main
      deploy_on_push: true
    build_command: npm run build
    run_command: npm start
    environment_slug: node-js
    instance_count: 2
    instance_size_slug: professional-xs
    http_port: 3000
    envs:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        type: SECRET
      - key: REDIS_URL
        type: SECRET
databases:
  - name: catchup-db
    engine: PG
    version: "15"
    size: db-s-1vcpu-1gb
```

#### 2. Deploy

```bash
# Install doctl
brew install doctl

# Authenticate
doctl auth init

# Create app
doctl apps create --spec app-spec.yaml

# View deployment
doctl apps list
```


## Scaling Considerations

### Horizontal Scaling

#### Application Servers

Run multiple instances behind a load balancer:

```bash
# AWS Auto Scaling
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name catchup-asg \
  --min-size 2 \
  --max-size 10 \
  --desired-capacity 2 \
  --target-group-arns arn:aws:elasticloadbalancing:... \
  --health-check-type ELB \
  --health-check-grace-period 300
```

**Scaling Metrics:**
- CPU utilization > 70%: Scale up
- CPU utilization < 30%: Scale down
- Request count > 1000/min per instance: Scale up

#### Database Scaling

**Read Replicas:**
```sql
-- Configure read replicas for query-heavy operations
-- Use primary for writes, replicas for reads

-- In application code:
const readPool = new Pool({ host: 'read-replica-host' });
const writePool = new Pool({ host: 'primary-host' });
```

**Connection Pooling:**
```javascript
// Use PgBouncer for connection pooling
DATABASE_URL=postgres://user:pass@pgbouncer-host:6432/catchup_db
```

**Partitioning:**
```sql
-- Partition large tables by user_id
CREATE TABLE suggestions_partitioned (
  LIKE suggestions INCLUDING ALL
) PARTITION BY HASH (user_id);

-- Create partitions
CREATE TABLE suggestions_p0 PARTITION OF suggestions_partitioned
  FOR VALUES WITH (MODULUS 4, REMAINDER 0);
```

#### Redis Scaling

**Redis Cluster:**
```bash
# Configure Redis cluster for high availability
REDIS_CLUSTER_NODES=redis1:6379,redis2:6379,redis3:6379
```

**Caching Strategy:**
```javascript
// Cache frequently accessed data
const cacheKeys = {
  contacts: (userId) => `contacts:${userId}`,
  suggestions: (userId) => `suggestions:${userId}`,
  calendar: (userId) => `calendar:${userId}`
};

// Set appropriate TTLs
const cacheTTL = {
  contacts: 300,      // 5 minutes
  suggestions: 3600,  // 1 hour
  calendar: 1800      // 30 minutes
};
```

### Background Jobs

#### Job Queue Scaling

```javascript
// Configure Bull queue with concurrency
const suggestionQueue = new Queue('suggestions', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

// Process jobs with concurrency
suggestionQueue.process('generate', 5, async (job) => {
  // Process suggestion generation
});
```

#### Job Scheduling

```javascript
// Suggestion generation: Every 6 hours
suggestionQueue.add('generate', {}, {
  repeat: { cron: '0 */6 * * *' }
});

// Batch notifications: User-configured time
notificationQueue.add('batch', { userId }, {
  repeat: { cron: '0 9 * * 0' } // Sunday 9am
});

// Calendar sync: Every 30 minutes
calendarQueue.add('sync', { userId }, {
  repeat: { cron: '*/30 * * * *' }
});
```

### Performance Optimization

#### Database Query Optimization

```sql
-- Use EXPLAIN ANALYZE to identify slow queries
EXPLAIN ANALYZE
SELECT * FROM suggestions
WHERE user_id = 'xxx' AND status = 'pending'
ORDER BY created_at DESC;

-- Add covering indexes
CREATE INDEX idx_suggestions_user_status_created
ON suggestions(user_id, status, created_at DESC)
INCLUDE (contact_id, trigger_type, reasoning);
```

#### API Response Caching

```javascript
// Cache API responses
app.get('/api/contacts', cacheMiddleware(300), async (req, res) => {
  // Handler
});

// Invalidate cache on updates
app.put('/api/contacts/:id', async (req, res) => {
  await updateContact(req.params.id, req.body);
  await cache.del(`contacts:${req.userId}`);
  res.json({ success: true });
});
```

#### CDN for Static Assets

```nginx
# nginx configuration
location /static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```


## Monitoring and Logging

### Application Monitoring

#### Health Check Endpoint

```javascript
// Add health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      memory: process.memoryUsage()
    }
  };
  
  const isHealthy = Object.values(health.checks)
    .every(check => check.status === 'ok');
  
  res.status(isHealthy ? 200 : 503).json(health);
});
```

#### Logging

**Structured Logging with Winston:**

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log important events
logger.info('Suggestion generated', {
  userId,
  suggestionId,
  triggerType
});
```

**Log Aggregation:**

```bash
# Ship logs to CloudWatch
aws logs create-log-group --log-group-name /catchup/production

# Or use ELK Stack
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  elasticsearch:8.11.0

docker run -d \
  --name kibana \
  -p 5601:5601 \
  --link elasticsearch \
  kibana:8.11.0
```

### Metrics and Alerting

#### Prometheus Metrics

```javascript
const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

const suggestionGenerationCounter = new prometheus.Counter({
  name: 'suggestions_generated_total',
  help: 'Total number of suggestions generated',
  labelNames: ['trigger_type']
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

#### Alerting Rules

```yaml
# Prometheus alerting rules
groups:
  - name: catchup_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
          
      - alert: DatabaseConnectionPoolExhausted
        expr: database_pool_waiting_count > 10
        for: 2m
        annotations:
          summary: "Database connection pool exhausted"
          
      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes > 2e9
        for: 5m
        annotations:
          summary: "High memory usage detected"
```

### Error Tracking

#### Sentry Integration

```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1
});

// Error handling middleware
app.use(Sentry.Handlers.errorHandler());
```

### Performance Monitoring

#### APM Tools

**New Relic:**
```bash
npm install newrelic
```

```javascript
// At the top of your main file
require('newrelic');
```

**DataDog:**
```bash
npm install dd-trace
```

```javascript
const tracer = require('dd-trace').init({
  service: 'catchup-app',
  env: process.env.NODE_ENV
});
```


## Backup and Recovery

### Database Backups

#### Automated Backups

```bash
# PostgreSQL automated backups
# Create backup script: scripts/backup-db.sh

#!/bin/bash
BACKUP_DIR="/backups/postgresql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/catchup_backup_$TIMESTAMP.sql.gz"

# Create backup
pg_dump -h $DATABASE_HOST \
        -U $DATABASE_USER \
        -d $DATABASE_NAME \
        | gzip > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://catchup-backups/postgresql/

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
```

```bash
# Schedule with cron
crontab -e

# Daily backup at 2 AM
0 2 * * * /path/to/scripts/backup-db.sh
```

#### Point-in-Time Recovery

```bash
# Enable WAL archiving in postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://catchup-backups/wal/%f'

# Restore to specific point in time
pg_restore -h $DATABASE_HOST \
           -U $DATABASE_USER \
           -d $DATABASE_NAME \
           --clean \
           backup_file.sql
```

### Redis Backups

```bash
# Configure Redis persistence
# In redis.conf:
save 900 1      # Save after 900 seconds if at least 1 key changed
save 300 10     # Save after 300 seconds if at least 10 keys changed
save 60 10000   # Save after 60 seconds if at least 10000 keys changed

# Manual backup
redis-cli BGSAVE

# Copy RDB file
cp /var/lib/redis/dump.rdb /backups/redis/dump_$(date +%Y%m%d).rdb
```

### Application State Backup

```bash
# Backup environment configuration
cp .env /backups/config/.env.$(date +%Y%m%d)

# Backup uploaded files (voice notes)
aws s3 sync s3://catchup-voice-notes-prod s3://catchup-backups/voice-notes/
```

### Disaster Recovery Plan

#### Recovery Time Objective (RTO): 4 hours
#### Recovery Point Objective (RPO): 1 hour

**Recovery Steps:**

1. **Database Recovery**
```bash
# Restore from latest backup
aws s3 cp s3://catchup-backups/postgresql/latest.sql.gz .
gunzip latest.sql.gz
psql -h $NEW_DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME -f latest.sql
```

2. **Application Deployment**
```bash
# Deploy to new infrastructure
docker-compose up -d

# Or redeploy to cloud provider
aws ecs update-service --cluster catchup-production --service catchup-app --force-new-deployment
```

3. **DNS Update**
```bash
# Update DNS to point to new infrastructure
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://dns-change.json
```

4. **Verification**
```bash
# Run health checks
curl https://api.catchup.app/health

# Verify critical functionality
npm run test:integration
```


## Security Checklist

### Pre-Deployment Security

- [ ] All secrets stored in environment variables or secret manager
- [ ] No hardcoded credentials in code
- [ ] `.env` file added to `.gitignore`
- [ ] Strong JWT secret generated (64+ characters)
- [ ] Encryption key generated (32 bytes / 64 hex characters)
- [ ] Database passwords are strong (16+ characters, mixed case, numbers, symbols)
- [ ] SSL/TLS enabled for all external connections
- [ ] HTTPS enforced in production
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options, etc.)
- [ ] CORS properly configured with allowed origins
- [ ] Rate limiting enabled on all endpoints
- [ ] Input validation implemented
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] CSRF protection enabled
- [ ] File upload size limits configured
- [ ] Audit logging enabled for sensitive operations

### Infrastructure Security

- [ ] Firewall rules configured (only necessary ports open)
- [ ] Database not publicly accessible
- [ ] Redis password authentication enabled
- [ ] VPC/network isolation configured
- [ ] Security groups properly configured
- [ ] IAM roles follow least privilege principle
- [ ] MFA enabled for admin accounts
- [ ] SSH keys rotated regularly
- [ ] Automated security updates enabled
- [ ] Intrusion detection system configured
- [ ] DDoS protection enabled
- [ ] WAF (Web Application Firewall) configured

### Application Security

- [ ] Dependencies regularly updated
- [ ] Security vulnerabilities scanned (`npm audit`)
- [ ] Code reviewed for security issues
- [ ] Authentication required for all protected endpoints
- [ ] Authorization checks implemented
- [ ] Session management secure
- [ ] Password hashing with bcrypt (cost factor 10+)
- [ ] Sensitive data encrypted at rest
- [ ] PII data handling compliant with regulations
- [ ] Error messages don't leak sensitive information
- [ ] Logging doesn't include sensitive data
- [ ] Third-party API keys secured
- [ ] OAuth tokens encrypted in database

### Compliance

- [ ] GDPR compliance (data export, deletion)
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie consent implemented
- [ ] Data retention policy defined
- [ ] Incident response plan documented
- [ ] Security contact published
- [ ] Vulnerability disclosure policy published

### Monitoring and Response

- [ ] Security monitoring enabled
- [ ] Failed login attempts tracked
- [ ] Suspicious activity alerts configured
- [ ] Audit logs retained for required period
- [ ] Backup and recovery tested
- [ ] Incident response team identified
- [ ] Security incident runbook created
- [ ] Regular security audits scheduled

## Post-Deployment

### Verification Steps

1. **Health Check**
```bash
curl https://api.catchup.app/health
```

2. **API Functionality**
```bash
# Test authentication
curl -X POST https://api.catchup.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test protected endpoint
curl https://api.catchup.app/api/contacts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

3. **Database Connectivity**
```bash
npm run db:test
```

4. **External Services**
```bash
# Test Google Calendar connection
# Test Twilio SMS sending
# Test SendGrid email sending
# Test OpenAI API
```

### Monitoring Setup

1. Configure uptime monitoring (Pingdom, UptimeRobot)
2. Set up error tracking (Sentry)
3. Configure log aggregation (CloudWatch, ELK)
4. Set up performance monitoring (New Relic, DataDog)
5. Configure alerting (PagerDuty, Opsgenie)

### Documentation

1. Update runbook with deployment-specific details
2. Document infrastructure architecture
3. Create troubleshooting guide
4. Document rollback procedures
5. Update team contact information

## Troubleshooting

### Common Issues

**Database Connection Errors**
```bash
# Check database connectivity
psql -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME

# Check connection pool
# Look for "connection pool exhausted" errors
# Increase DATABASE_POOL_MAX if needed
```

**Redis Connection Errors**
```bash
# Test Redis connectivity
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping

# Check Redis memory usage
redis-cli INFO memory
```

**High Memory Usage**
```bash
# Check Node.js memory usage
node --max-old-space-size=4096 dist/index.js

# Profile memory leaks
node --inspect dist/index.js
```

**Slow API Responses**
```bash
# Enable query logging
DATABASE_LOG_QUERIES=true

# Check slow queries
SELECT * FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Support

For deployment assistance:
- Email: devops@catchup.app
- Slack: #catchup-deployments
- Documentation: https://docs.catchup.app

