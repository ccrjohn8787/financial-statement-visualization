# Deployment Guide

This guide covers the complete production deployment process for the Financial Statement Visualization application.

## Architecture Overview

- **Frontend**: Next.js application deployed on Vercel
- **Backend**: Express.js API deployed on Railway/Fly.io
- **Database**: Managed PostgreSQL (Railway/Fly.io Postgres)
- **Cache**: Managed Redis (Railway/Fly.io Redis)
- **Monitoring**: Integrated error tracking and performance monitoring

## Prerequisites

1. **Accounts Required**:
   - Vercel account (for frontend)
   - Railway or Fly.io account (for backend)
   - GitHub account (for code repository)

2. **Local Setup**:
   - Node.js 18+ installed
   - Git configured
   - Docker (for Fly.io deployment)

## Backend Deployment

### Option A: Railway Deployment

1. **Prepare the Backend**:
   ```bash
   cd backend
   npm run build
   ```

2. **Set up Railway**:
   ```bash
   npm install -g @railway/cli
   railway login
   railway init
   ```

3. **Deploy Services**:
   ```bash
   # Deploy PostgreSQL
   railway add postgresql
   
   # Deploy Redis
   railway add redis
   
   # Deploy the application
   railway up
   ```

4. **Configure Environment Variables** in Railway dashboard:
   ```env
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
   SEC_USER_AGENT=your-email@domain.com
   CORS_ORIGINS=https://your-frontend-domain.vercel.app
   ```

### Option B: Fly.io Deployment

1. **Install Fly.io CLI**:
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   ```

2. **Initialize Fly.io App**:
   ```bash
   cd backend
   fly launch
   ```

3. **Set up Database**:
   ```bash
   fly postgres create --name finviz-db
   fly postgres attach finviz-db
   ```

4. **Set up Redis**:
   ```bash
   fly redis create --name finviz-redis
   fly redis attach finviz-redis
   ```

5. **Deploy**:
   ```bash
   fly deploy
   ```

## Frontend Deployment

### Vercel Deployment

1. **Connect GitHub Repository**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Build Settings**:
   - Framework Preset: Next.js
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `.next`

3. **Set Environment Variables** in Vercel dashboard:
   ```env
   NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app/api
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```

4. **Deploy**:
   - Vercel will automatically deploy on every push to main branch

## Database Setup

### Run Migrations

After deploying the backend, run the database migrations:

```bash
# For Railway
railway run npx prisma migrate deploy

# For Fly.io
fly ssh console
npx prisma migrate deploy
```

### Seed Initial Data (Optional)

```bash
# For Railway
railway run npm run db:seed

# For Fly.io
fly ssh console
npm run db:seed
```

## Environment Variables

### Backend Environment Variables

Create these in your deployment platform:

```env
# Core Settings
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Cache
REDIS_URL=redis://user:password@host:6379

# SEC API
SEC_USER_AGENT=your-email@domain.com

# CORS
CORS_ORIGINS=https://your-frontend-domain.vercel.app

# Monitoring (Optional)
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

### Frontend Environment Variables

Create these in Vercel:

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Analytics (Optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_HOTJAR_ID=XXXXXXXXX

# Error Tracking (Optional)
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn
```

## Domain Configuration

### Custom Domain Setup

1. **Backend Domain**:
   - Railway: Add custom domain in Railway dashboard
   - Fly.io: Configure custom domain with `fly domains add your-api-domain.com`

2. **Frontend Domain**:
   - Add custom domain in Vercel dashboard
   - Update `NEXT_PUBLIC_APP_URL` environment variable

3. **SSL Certificates**:
   - Both Railway and Vercel automatically provision SSL certificates
   - Fly.io requires manual certificate setup

## Monitoring Setup

### Error Tracking

1. **Set up Sentry** (optional):
   ```bash
   npm install @sentry/nextjs @sentry/node
   ```

2. **Configure Sentry DSN** in environment variables

3. **Add Sentry configuration** to both frontend and backend

### Performance Monitoring

1. **Web Vitals**: Already configured in frontend
2. **API Monitoring**: Health check endpoints available at `/health`
3. **Database Monitoring**: Use Railway/Fly.io built-in monitoring

## Production Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Database migrations ready
- [ ] Build processes tested locally
- [ ] Health checks implemented
- [ ] Error tracking configured

### Post-Deployment

- [ ] Health checks passing (`/health` endpoint)
- [ ] Database connectivity verified
- [ ] API endpoints responding correctly
- [ ] Frontend loads and displays data
- [ ] Search functionality works
- [ ] Charts render properly
- [ ] Error tracking receiving data

### Security

- [ ] CORS origins configured correctly
- [ ] Rate limiting enabled
- [ ] Input validation in place
- [ ] SQL injection protection (Prisma)
- [ ] XSS protection headers
- [ ] HTTPS enforced

## Monitoring URLs

After deployment, monitor these URLs:

- **Frontend**: `https://your-app.vercel.app`
- **Backend Health**: `https://your-api.railway.app/api/health`
- **Frontend Health**: `https://your-app.vercel.app/health`

## Scaling Considerations

### Backend Scaling

1. **Railway**: Automatic scaling based on CPU/memory usage
2. **Fly.io**: Configure horizontal scaling in `fly.toml`

### Database Scaling

1. **Connection Pooling**: Already configured with Prisma
2. **Read Replicas**: Available on managed PostgreSQL services
3. **Query Optimization**: Monitor slow queries

### Frontend Scaling

1. **Vercel**: Automatic scaling with global CDN
2. **Edge Caching**: Configured for static assets
3. **Image Optimization**: Built-in Next.js optimization

## Troubleshooting

### Common Issues

1. **CORS Errors**: Check `CORS_ORIGINS` environment variable
2. **Database Connection**: Verify `DATABASE_URL` format
3. **Build Failures**: Check Node.js version compatibility
4. **Health Check Failures**: Verify service dependencies

### Logs

- **Railway**: Use Railway CLI or dashboard
- **Fly.io**: Use `fly logs` command
- **Vercel**: Check function logs in Vercel dashboard

## Rollback Procedure

### Frontend Rollback (Vercel)

1. Go to Vercel dashboard
2. Select previous deployment
3. Click "Promote to Production"

### Backend Rollback

1. **Railway**: Use Railway CLI to rollback
2. **Fly.io**: Deploy previous version with `fly deploy`

## Support

For deployment issues:

1. Check the logs first
2. Verify environment variables
3. Test health endpoints
4. Check GitHub Issues for known problems
5. Contact support if needed

---

**Last Updated**: September 10, 2025
**Version**: 1.0.0