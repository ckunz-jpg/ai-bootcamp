#!/bin/bash

echo "🚀 Setting up Vendor Bidding Platform..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until pg_isready -h localhost -U postgres; do
  sleep 1
done

echo "✅ PostgreSQL is ready!"

# Setup environment files if they don't exist
if [ ! -f "apps/backend/.env" ]; then
  echo "📝 Creating backend .env file..."
  cp apps/backend/.env.example apps/backend/.env
fi

if [ ! -f "apps/web/.env" ]; then
  echo "📝 Creating web .env file..."
  cp apps/web/.env.example apps/web/.env
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Generate Prisma client and push schema
echo "🗄️ Setting up database..."
cd apps/backend
pnpm db:generate
pnpm db:push

echo ""
echo "✨ Setup complete!"
echo ""
echo "To start the application, run:"
echo "  pnpm dev           # Start both frontend and backend"
echo "  pnpm dev:backend   # Start only backend"
echo "  pnpm dev:web       # Start only frontend"
echo ""
echo "Frontend will be available at: http://localhost:3000"
echo "Backend API at: http://localhost:3001"
