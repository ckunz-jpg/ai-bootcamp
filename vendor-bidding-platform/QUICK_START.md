# Quick Start Guide

Get your Vendor Bidding Platform up and running in 5 minutes!

## Prerequisites

Make sure you have installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/installation) - Install with: `npm install -g pnpm`
- [PostgreSQL](https://www.postgresql.org/download/) database

## Step 1: Install Dependencies

```bash
cd vendor-bidding-platform
pnpm install
```

## Step 2: Set Up Environment Files

### Backend Environment
```bash
cp apps/backend/.env.example apps/backend/.env
```

Edit `apps/backend/.env` with your database credentials:
```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/vendor_bidding"
JWT_SECRET="your-super-secret-key-change-this"
PORT=3001
```

### Frontend Environment
```bash
cp apps/web/.env.example apps/web/.env
```

The default settings should work, but you can customize:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Step 3: Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create the database
CREATE DATABASE vendor_bidding;

# Exit psql
\q
```

## Step 4: Set Up Database Schema

```bash
cd apps/backend
pnpm db:push
```

This will create all the necessary tables in your database.

## Step 5: Start the Application

From the root directory:

```bash
pnpm dev
```

This starts both the backend and frontend:
- Backend API: http://localhost:3001
- Frontend Web: http://localhost:3000

## Step 6: Create Your First Account

1. Open http://localhost:3000 in your browser
2. Click "Create a new account"
3. Fill in your details
4. Choose either:
   - **Property Manager** - to create projects and receive bids
   - **Vendor** - to browse projects and submit bids

## What's Next?

### For Property Managers:
1. Create a property from the Properties section
2. Add a project for that property
3. Wait for vendors to submit bids
4. Review and accept the best bid

### For Vendors:
1. Browse available projects
2. Review project details and requirements
3. Submit your bid with pricing
4. Communicate with property managers
5. Get notified when your bid is accepted

## Useful Commands

```bash
# View database with Prisma Studio
cd apps/backend && pnpm db:studio

# Run only backend
pnpm dev:backend

# Run only frontend
pnpm dev:web

# Build for production
pnpm build
```

## Troubleshooting

### Database Connection Error
- Make sure PostgreSQL is running
- Check your DATABASE_URL in `apps/backend/.env`
- Verify the database exists: `psql -U postgres -l`

### Port Already in Use
- Backend (3001): Change `PORT` in `apps/backend/.env`
- Frontend (3000): Next.js will automatically try 3001, 3002, etc.

### Cannot Find Module Errors
- Run `pnpm install` again from the root directory
- Clear node_modules: `rm -rf node_modules && pnpm install`

## Need Help?

- Check the main [README.md](./README.md) for detailed documentation
- Review the API endpoints section for integration details
- Check database schema in `apps/backend/prisma/schema.prisma`

Happy bidding!
