# Deployment Guide - Vendor Bidding Platform

This guide will walk you through deploying your application to production using **Vercel** (frontend) and **Railway** (backend + database).

> **⚠️ IMPORTANT**: If you're getting a 404 error from Vercel, see the [VERCEL_SETUP.md](./VERCEL_SETUP.md) guide for the correct monorepo configuration!

## Architecture Overview

```
┌─────────────────┐      ┌─────────────────┐      ┌──────────────────┐
│  Vercel         │      │  Railway        │      │  Railway         │
│  (Next.js)      │─────▶│  (Express API)  │─────▶│  (PostgreSQL)    │
│  Frontend       │      │  Backend        │      │  Database        │
└─────────────────┘      └─────────────────┘      └──────────────────┘
```

- **Vercel**: Hosts the Next.js frontend (free tier available)
- **Railway**: Hosts the Express backend + PostgreSQL database ($5/month free credit)

---

## Part 1: Deploy Backend to Railway

### Step 1: Push Code to GitHub

If you haven't already:

```bash
cd vendor-bidding-platform
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Sign in with GitHub
4. Authorize Railway to access your repositories

### Step 3: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your `vendor-bidding-platform` repository
4. Railway will detect the project automatically

### Step 4: Add PostgreSQL Database

1. In your Railway project dashboard, click **"+ New"**
2. Select **"Database"**
3. Choose **"PostgreSQL"**
4. Railway will automatically create and connect the database

### Step 5: Configure Environment Variables

In Railway, go to your backend service → **Variables** tab and add:

```bash
# Database (Railway provides this automatically as DATABASE_URL)
# You don't need to set DATABASE_URL manually

# Server
PORT=3001
NODE_ENV=production

# JWT Secret - IMPORTANT: Generate a secure one!
# Run in terminal: openssl rand -base64 32
JWT_SECRET=your-super-secure-random-secret-here
JWT_EXPIRES_IN=7d

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# CORS - You'll update this after deploying Vercel
ALLOWED_ORIGINS=http://localhost:3000
```

### Step 6: Configure Build Settings

1. In Railway, go to **Settings** tab
2. Set **Root Directory**: (leave empty or set to `/`)
3. **Build Command**: `cd apps/backend && npm install && npx prisma generate && npm run build`
4. **Start Command**: `cd apps/backend && npm start`
5. Click **"Deploy"**

### Step 7: Run Database Migrations

1. Wait for the deployment to complete
2. Click on your service → **"Shell"** tab (or use Railway CLI)
3. Run:
```bash
cd apps/backend
npx prisma db push
```

### Step 8: Get Your Backend URL

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Copy your Railway URL (e.g., `https://your-app.up.railway.app`)
4. **Save this URL** - you'll need it for Vercel!

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Authorize Vercel to access your repositories

### Step 2: Import Project

1. Click **"Add New..."** → **"Project"**
2. Find and select your `vendor-bidding-platform` repository
3. Click **"Import"**

### Step 3: Configure Project Settings

> **📌 DETAILED GUIDE**: See [VERCEL_SETUP.md](./VERCEL_SETUP.md) for complete step-by-step instructions with troubleshooting.

Vercel will auto-detect Next.js. Update these settings:

**Framework Preset**: Next.js

**Root Directory**: Click **Edit** and set to `apps/web`

**Build Settings** - Click "Override":
- Build Command: `npm install && npm run build`
- Output Directory: `.next` (default)
- Install Command: `npm install`

### Step 4: Add Environment Variables

Click **"Environment Variables"** and add:

```bash
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
```

**Replace** `your-backend.up.railway.app` with your actual Railway backend URL from Part 1, Step 8!

### Step 5: Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for the build to complete
3. Vercel will give you a deployment URL (e.g., `https://your-app.vercel.app`)

---

## Part 3: Connect Frontend and Backend

### Step 1: Update Railway CORS Settings

1. Go back to **Railway** dashboard
2. Click on your backend service → **Variables**
3. Update `ALLOWED_ORIGINS`:

```bash
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-app-*.vercel.app
```

**Replace** `your-app` with your actual Vercel deployment URL!

The wildcard `*` allows preview deployments to work.

### Step 2: Redeploy Backend

1. In Railway, click **"Deploy"** or trigger a redeploy
2. Wait for it to complete

---

## Part 4: Test Your Deployment

### Visit Your App

1. Go to your Vercel URL: `https://your-app.vercel.app`
2. Create an account (choose Property Manager or Vendor)
3. Test the features:
   - Create properties (Property Manager)
   - Create projects (Property Manager)
   - Browse projects (Vendor)
   - Submit bids (Vendor)
   - Real-time notifications
   - Messaging

### Check Backend Health

Visit: `https://your-backend.up.railway.app/api/health`

You should see:
```json
{
  "status": "ok",
  "timestamp": "2024-..."
}
```

---

## Troubleshooting

### Issue: "Network Error" or "Failed to fetch"

**Cause**: Frontend can't reach backend

**Solutions**:
1. Check `NEXT_PUBLIC_API_URL` in Vercel environment variables
2. Verify Railway backend is running (check logs)
3. Ensure CORS is configured correctly in Railway

### Issue: Database Connection Error

**Cause**: Backend can't connect to PostgreSQL

**Solutions**:
1. Check `DATABASE_URL` in Railway (should be auto-set)
2. Run migrations: `npx prisma db push` in Railway shell
3. Check Railway PostgreSQL service is running

### Issue: 500 Internal Server Error

**Cause**: Backend error

**Solutions**:
1. Check Railway logs: Dashboard → your service → **Logs**
2. Look for errors in the logs
3. Verify all environment variables are set correctly

### Issue: CORS Errors in Browser Console

**Cause**: Frontend URL not in ALLOWED_ORIGINS

**Solutions**:
1. Check `ALLOWED_ORIGINS` includes your Vercel URL
2. Include wildcard for preview deployments: `https://your-app-*.vercel.app`
3. Redeploy backend after changing CORS settings

### Issue: WebSocket/Real-time Features Not Working

**Cause**: Socket.IO connection issues

**Solutions**:
1. Verify CORS includes your frontend URL
2. Railway supports WebSockets by default, so this should work
3. Check browser console for Socket.IO errors

---

## Environment Variables Checklist

### Railway (Backend)

- [ ] `NODE_ENV=production`
- [ ] `PORT=3001`
- [ ] `JWT_SECRET` (generate secure random string)
- [ ] `JWT_EXPIRES_IN=7d`
- [ ] `UPLOAD_DIR=./uploads`
- [ ] `MAX_FILE_SIZE=10485760`
- [ ] `ALLOWED_ORIGINS` (your Vercel URL)
- [ ] `DATABASE_URL` (auto-set by Railway)

### Vercel (Frontend)

- [ ] `NEXT_PUBLIC_API_URL` (your Railway backend URL)

---

## Monitoring & Maintenance

### View Logs

**Railway**:
1. Dashboard → Your Service → **Logs**
2. Real-time logs showing all backend activity

**Vercel**:
1. Project Dashboard → **Deployments**
2. Click any deployment → **View Function Logs**

### Database Management

**Option 1: Railway Dashboard**
1. Railway → PostgreSQL service → **Data** tab
2. View and query data directly

**Option 2: Prisma Studio (Local)**
```bash
# Connect to Railway database from local machine
DATABASE_URL="your-railway-database-url" npx prisma studio
```

Get the database URL from Railway → PostgreSQL service → **Connect** tab

### Redeploy

**Automatic**:
- Both Vercel and Railway auto-deploy on `git push` to main

**Manual**:
- **Vercel**: Dashboard → Deployments → **Redeploy**
- **Railway**: Dashboard → Service → **Deploy**

---

## Custom Domain (Optional)

### Add Custom Domain to Vercel

1. Vercel Dashboard → Your Project → **Settings** → **Domains**
2. Add your domain (e.g., `yourdomain.com`)
3. Follow DNS setup instructions

### Add Custom Domain to Railway

1. Railway Dashboard → Backend Service → **Settings** → **Networking**
2. Click **"Add Custom Domain"**
3. Enter your domain (e.g., `api.yourdomain.com`)
4. Add CNAME record to your DNS provider

**Update**: Remember to update `ALLOWED_ORIGINS` and `NEXT_PUBLIC_API_URL` with your custom domains!

---

## Costs

### Free Tier Limits

**Vercel**:
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS

**Railway**:
- ✅ $5 free credit per month
- ✅ ~500 hours of uptime (enough for 24/7)
- ⚠️ After $5, pay $0.000463/minute

**Total**: Effectively **FREE** for small to medium traffic!

### Upgrading

When you exceed free tiers:
- **Vercel Pro**: $20/month (more bandwidth)
- **Railway**: Pay as you go after $5 credit

---

## Next Steps

1. ✅ Set up monitoring (Railway logs + Vercel analytics)
2. ✅ Configure custom domains (optional)
3. ✅ Set up backup strategy for PostgreSQL
4. ✅ Add error tracking (Sentry, LogRocket)
5. ✅ Set up CI/CD (already automatic with GitHub)

---

## Support

- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **Prisma Docs**: https://www.prisma.io/docs

Need help? Check the GitHub repository issues or create a new one!

---

**Congratulations! Your Vendor Bidding Platform is now live! 🎉**
