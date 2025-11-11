# Quick Deployment Checklist

Use this checklist when deploying to production. Full details in [DEPLOYMENT.md](./DEPLOYMENT.md).

## Before Deployment

- [ ] Code is committed and pushed to GitHub
- [ ] All tests pass locally (if you have tests)
- [ ] Environment variable examples are up to date
- [ ] README is updated with any new features

## Railway (Backend) Setup

### Account & Project
- [ ] Created Railway account at [railway.app](https://railway.app)
- [ ] Connected GitHub repository
- [ ] Created new project from GitHub repo

### Database
- [ ] Added PostgreSQL database service
- [ ] Database is connected to backend service

### Environment Variables
- [ ] `NODE_ENV=production`
- [ ] `PORT=3001`
- [ ] `JWT_SECRET` (generate: `openssl rand -base64 32`)
- [ ] `JWT_EXPIRES_IN=7d`
- [ ] `UPLOAD_DIR=./uploads`
- [ ] `MAX_FILE_SIZE=10485760`
- [ ] `ALLOWED_ORIGINS` (will update after Vercel deployment)

### Build Configuration
- [ ] Build command configured
- [ ] Start command configured
- [ ] Deployment successful

### Database Migration
- [ ] Ran `npx prisma db push` in Railway shell
- [ ] Database schema created successfully

### Domain
- [ ] Generated Railway domain
- [ ] Copied backend URL for Vercel setup

## Vercel (Frontend) Setup

### Account & Project
- [ ] Created Vercel account at [vercel.com](https://vercel.com)
- [ ] Connected GitHub repository
- [ ] Imported project

### Configuration
- [ ] Root directory set to `apps/web`
- [ ] Build command configured
- [ ] Framework preset: Next.js

### Environment Variables
- [ ] `NEXT_PUBLIC_API_URL` (Railway backend URL)

### Deployment
- [ ] Initial deployment successful
- [ ] Copied Vercel deployment URL

## Final Configuration

### Update Railway CORS
- [ ] Updated `ALLOWED_ORIGINS` with Vercel URL
- [ ] Included wildcard for preview deployments
- [ ] Redeployed backend

## Testing

### Basic Functionality
- [ ] Can access frontend at Vercel URL
- [ ] Backend health check works (`/api/health`)
- [ ] Can create an account
- [ ] Can log in
- [ ] Property Manager can create properties
- [ ] Property Manager can create projects
- [ ] Vendors can browse projects
- [ ] Vendors can submit bids
- [ ] Real-time notifications work
- [ ] Messaging system works
- [ ] File uploads work

### Browser Console
- [ ] No CORS errors
- [ ] No 404 errors for API calls
- [ ] Socket.IO connects successfully

## Optional Enhancements

- [ ] Added custom domain to Vercel
- [ ] Added custom domain to Railway
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Configured backup strategy
- [ ] Set up analytics

## Documentation

- [ ] Updated README with production URLs
- [ ] Documented any environment-specific settings
- [ ] Created admin documentation (if needed)

---

## Quick URLs Reference

**Frontend (Vercel)**: `https://your-app.vercel.app`

**Backend (Railway)**: `https://your-app.up.railway.app`

**Health Check**: `https://your-app.up.railway.app/api/health`

**Railway Dashboard**: `https://railway.app/project/your-project-id`

**Vercel Dashboard**: `https://vercel.com/your-username/your-app`

---

## Rollback Plan

If something goes wrong:

### Vercel
1. Go to Deployments tab
2. Find previous working deployment
3. Click "..." → "Promote to Production"

### Railway
1. Go to Deployments tab
2. Find previous working deployment
3. Click "Redeploy"

---

## Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| CORS errors | Update `ALLOWED_ORIGINS` in Railway |
| API not reachable | Check `NEXT_PUBLIC_API_URL` in Vercel |
| Database errors | Run migrations in Railway shell |
| Build fails | Check build logs, verify dependencies |
| 500 errors | Check Railway logs for backend errors |

---

**Last Updated**: {DATE}
**Deployed By**: {YOUR_NAME}
**Production Status**: ✅ Live / ⚠️ Issues / 🚧 In Progress
