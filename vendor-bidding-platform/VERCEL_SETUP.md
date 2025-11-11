# Vercel Deployment Guide (Fixed for Monorepo)

## The Issue

The 404 NOT_FOUND error occurs because Vercel needs special configuration for monorepo projects. We'll configure everything through the Vercel dashboard instead of using vercel.json.

## Step-by-Step Deployment

### 1. Import Your Project

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New..."** → **"Project"**
3. Find and select your `ai-bootcamp` repository
4. Click **"Import"**

### 2. Configure Build Settings

In the import screen, configure these settings:

#### Framework Preset
- Select: **Next.js**

#### Root Directory
- Click **"Edit"** next to Root Directory
- Enter: `apps/web`
- Click **"Continue"**

#### Build and Output Settings

Click **"Override"** and set:

**Build Command**:
```bash
npm install && npm run build
```

**Output Directory**:
```
.next
```

**Install Command**:
```bash
npm install
```

### 3. Environment Variables

Add these environment variables:

**Name**: `NEXT_PUBLIC_API_URL`
**Value**: `http://localhost:3001` (for now, we'll update this after Railway deployment)

### 4. Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for the build

### 5. Update After Railway Deployment

Once your backend is deployed to Railway:

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Edit `NEXT_PUBLIC_API_URL`
3. Set it to your Railway backend URL (e.g., `https://your-app.up.railway.app`)
4. Go to **Deployments** → Click **"Redeploy"**

## Alternative: Using package.json Scripts

If the above doesn't work, you can also configure by ensuring your `apps/web/package.json` has these scripts (which it already does):

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

Vercel will automatically detect and use these.

## Troubleshooting

### Still Getting 404?

**Check Root Directory**:
- Make sure Root Directory is set to `apps/web` in project settings
- Vercel → Project Settings → General → Root Directory

**Check Build Logs**:
1. Go to your deployment in Vercel
2. Click on the failed deployment
3. Check the build logs for specific errors

### Build Command Issues

If build fails, try these alternatives in order:

**Option 1** (Recommended):
```bash
npm install && npm run build
```

**Option 2** (If Option 1 fails):
```bash
cd apps/web && npm install && npm run build
```

**Option 3** (If you have pnpm):
```bash
pnpm install && pnpm run build
```

### Missing Dependencies

If you see missing dependency errors:

1. Check that `apps/web/package.json` includes all dependencies
2. Try cleaning install:
   - Vercel Settings → General → scroll to bottom
   - Clear Build Cache
   - Redeploy

## Quick Configuration Reference

| Setting | Value |
|---------|-------|
| Framework | Next.js |
| Root Directory | `apps/web` |
| Build Command | `npm install && npm run build` |
| Output Directory | `.next` |
| Install Command | `npm install` |
| Node Version | 18.x (automatic) |

## Expected Build Output

A successful build should show:
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

## After Successful Deployment

1. ✅ Copy your Vercel URL (e.g., `https://ai-bootcamp.vercel.app`)
2. ✅ Use this URL when configuring Railway CORS settings
3. ✅ Update Railway's `ALLOWED_ORIGINS` environment variable
4. ✅ Test the deployed application

---

**Need more help?** Check the main [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment guide or Vercel's [troubleshooting docs](https://vercel.com/docs/concepts/deployments/troubleshoot-a-build).
