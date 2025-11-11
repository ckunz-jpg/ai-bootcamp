# GitHub Codespaces Setup Guide

This guide will help you run the Vendor Bidding Platform in GitHub Codespaces (no local installation required!).

## Step 1: Push to GitHub

First, let's get your code on GitHub:

### Option A: Using Git Bash or Terminal

```bash
cd vendor-bidding-platform

# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Vendor Bidding Platform"

# Create a new repository on GitHub at https://github.com/new
# Then link it (replace YOUR_USERNAME and YOUR_REPO):
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### Option B: Using GitHub Desktop

1. Download [GitHub Desktop](https://desktop.github.com/)
2. Open GitHub Desktop
3. Click "Add" → "Add Existing Repository"
4. Navigate to the `vendor-bidding-platform` folder
5. Click "Publish repository" button
6. Choose a name and click "Publish Repository"

## Step 2: Open in Codespaces

1. **Go to your GitHub repository** in your browser
2. **Click the green "Code" button**
3. **Select the "Codespaces" tab**
4. **Click "Create codespace on main"**

GitHub will now:
- Create a cloud development environment
- Install Node.js and all dependencies
- Set up PostgreSQL database
- Configure everything automatically

This takes about 2-3 minutes on first launch.

## Step 3: Run the Setup Script

Once Codespaces opens, you'll see VS Code in your browser. In the terminal at the bottom:

```bash
# Make setup script executable
chmod +x setup.sh

# Run setup
./setup.sh
```

This will:
- Set up environment files
- Install all dependencies
- Initialize the database
- Generate Prisma client

## Step 4: Start the Application

```bash
pnpm dev
```

This starts both the frontend and backend servers.

## Step 5: Access the Application

GitHub Codespaces will automatically detect the ports and show you notifications:

- **Frontend**: Click the notification for port 3000 (or go to the "PORTS" tab and click the globe icon)
- **Backend API**: Available at port 3001

## Using the Application

1. **Create an Account**
   - Click "Create a new account"
   - Choose either "Property Manager" or "Vendor"
   - Fill in your details

2. **As a Property Manager:**
   - Add properties
   - Create projects
   - Receive and review bids
   - Message vendors

3. **As a Vendor:**
   - Browse available projects
   - Submit bids
   - Message property managers

## Useful Commands

```bash
# Start both servers
pnpm dev

# Start only backend
pnpm dev:backend

# Start only frontend
pnpm dev:web

# View database with Prisma Studio
cd apps/backend && pnpm db:studio

# Run database migrations
cd apps/backend && pnpm db:migrate

# Reset database (if needed)
cd apps/backend && pnpm db:push --force-reset
```

## Viewing the Database

To see your data in a GUI:

```bash
cd apps/backend
pnpm db:studio
```

Prisma Studio will open in a new browser tab.

## Troubleshooting

### PostgreSQL Not Ready
If you see connection errors, wait a moment for PostgreSQL to start, then run:
```bash
./setup.sh
```

### Port Already in Use
Codespaces automatically handles ports. Just refresh the browser tab.

### Dependencies Issues
```bash
rm -rf node_modules
pnpm install
```

### Database Issues
```bash
cd apps/backend
pnpm db:push --force-reset
```

## Features Available

✅ Full backend API with all endpoints
✅ PostgreSQL database
✅ Real-time notifications (Socket.IO)
✅ File uploads
✅ In-app messaging
✅ JWT authentication
✅ Next.js frontend

## Free Tier Limits

GitHub provides:
- **60 hours/month** for free users
- **120 hours/month** for Pro users
- Codespaces automatically stop after 30 minutes of inactivity

Your work is automatically saved, so you can stop and restart anytime!

## Stopping Codespaces

1. Click your profile icon (bottom left)
2. Select "Stop Current Codespace"

Or it will auto-stop after 30 minutes of inactivity.

## Next Time

Just go to your repo and click "Code" → "Codespaces" → Click your existing codespace to resume!

---

**Enjoy building with your Vendor Bidding Platform! 🚀**
