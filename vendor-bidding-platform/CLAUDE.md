# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Vendor Bidding Platform** - A property management application where property managers request bids from vendors for projects, events, construction, and maintenance work.

- **Type**: Monorepo (pnpm workspaces)
- **Backend**: Node.js + Express + TypeScript + Prisma ORM (PostgreSQL)
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Zustand
- **Real-time**: Socket.IO for notifications and messaging
- **Authentication**: JWT with role-based access control

### User Roles
- **PROPERTY_MANAGER**: Creates properties, posts projects, reviews/accepts bids
- **VENDOR**: Browses projects, submits bids, messages property managers
- **ADMIN**: System administration (not fully implemented)

## Development Commands

### Root Level
```bash
pnpm dev              # Start both backend and frontend in parallel
pnpm dev:backend      # Start only backend (port 3001)
pnpm dev:web          # Start only frontend (port 3000)
pnpm build            # Build all apps for production
```

### Backend (apps/backend/)
```bash
pnpm dev              # Run with hot-reload (tsx watch)
pnpm build            # Compile TypeScript to dist/
pnpm start            # Run compiled JS (production)

# Database Commands (Prisma)
pnpm db:generate      # Generate Prisma Client after schema changes
pnpm db:push          # Push schema to database (development)
pnpm db:migrate       # Create and run migrations (production)
pnpm db:studio        # Open Prisma Studio GUI
```

### Frontend (apps/web/)
```bash
pnpm dev              # Next.js dev server
pnpm build            # Production build
pnpm start            # Serve production build
```

## Architecture

### Monorepo Structure

The project uses pnpm workspaces defined in root `package.json`:
```
apps/
  backend/          # Express API server
  web/              # Next.js frontend
packages/           # Shared code (placeholder for future)
```

Commands at root level use `--filter` to target specific apps. When working on backend or frontend, you can `cd` into the app directory and run commands directly.

### Backend Architecture

**Core Stack**: Express.js + TypeScript + Prisma + Socket.IO

**Entry Point**: `apps/backend/src/index.ts`
- Creates Express app and HTTP server
- Initializes Socket.IO with CORS config
- Mounts route handlers at `/api/*`
- Makes Socket.IO accessible via `req.app.get('io')`

**Authentication Flow**:
1. User registers/logs in via `/api/auth/*` routes
2. Backend returns JWT token + user object
3. Frontend stores token in localStorage
4. All subsequent requests include `Authorization: Bearer <token>` header
5. `authenticate` middleware (from `middleware/auth.ts`) verifies JWT and adds `req.user`

**Authorization Pattern**:
```typescript
// In routes:
router.post('/', authenticate, authorize('PROPERTY_MANAGER'), handler);
```
- `authenticate`: Verifies JWT, sets req.user
- `authorize(...roles)`: Checks if req.user.role matches allowed roles

**Route Structure**:
All routes are in `apps/backend/src/routes/*.routes.ts`:
- `auth.routes.ts`: Registration, login, get current user
- `property.routes.ts`: CRUD for properties (Property Manager only)
- `project.routes.ts`: CRUD for projects (filtered by role)
- `bid.routes.ts`: Vendors submit bids, managers accept/reject
- `message.routes.ts`: Direct messaging between users
- `notification.routes.ts`: User notifications
- `document.routes.ts`: File uploads (Multer)

**Prisma Integration**:
- Schema: `apps/backend/prisma/schema.prisma`
- Client is imported as: `import { PrismaClient } from '@prisma/client'`
- Each route file creates its own `const prisma = new PrismaClient()`
- After schema changes, always run `pnpm db:generate` to regenerate client

**Socket.IO Integration**:
Routes emit real-time events after database operations:
```typescript
const io: Server = req.app.get('io');
io.to(`user_${userId}`).emit('notification', data);
```

**CORS Configuration**:
- Configured in `index.ts` with dynamic origin checking
- Supports wildcards: `https://*.vercel.app` matches all Vercel preview deployments
- Reads from `ALLOWED_ORIGINS` env var (comma-separated)

### Database Schema (Prisma)

**Key Models and Relationships**:

```
User (role: PROPERTY_MANAGER | VENDOR | ADMIN)
  ├─→ properties[]      (Property Manager only)
  ├─→ projects[]        (Property Manager only)
  ├─→ bids[]            (Vendor only)
  ├─→ sentMessages[]
  ├─→ receivedMessages[]
  └─→ notifications[]

Property
  ├─→ manager (User)
  └─→ projects[]

Project (status: DRAFT | OPEN | IN_REVIEW | AWARDED | IN_PROGRESS | COMPLETED | CANCELLED)
  ├─→ property
  ├─→ manager (User)
  ├─→ bids[]
  ├─→ documents[]
  └─→ messages[]

Bid (status: PENDING | ACCEPTED | REJECTED | WITHDRAWN)
  ├─→ project
  ├─→ vendor (User)
  └─→ documents[]

Document (polymorphic: belongs to Project OR Bid)
  ├─→ project? (optional)
  └─→ bid? (optional)

Message
  ├─→ sender (User)
  ├─→ receiver (User)
  └─→ project? (optional)

Notification
  └─→ user (User)
```

**Important Patterns**:
- All IDs are UUIDs (`@id @default(uuid())`)
- Cascading deletes: Deleting a user deletes their properties, projects, etc. (`onDelete: Cascade`)
- Indexes on foreign keys and frequently queried fields (role, status, email)
- Enums for status fields prevent invalid states

**Working with the Database**:
1. Modify `prisma/schema.prisma`
2. Run `pnpm db:generate` to update Prisma Client
3. Run `pnpm db:push` (dev) or `pnpm db:migrate` (prod) to update database
4. Import and use: `import { PrismaClient } from '@prisma/client'`

### Frontend Architecture

**Framework**: Next.js 14 with App Router (not Pages Router)

**Key Directories**:
- `src/app/`: Next.js App Router pages
  - `layout.tsx`: Root layout
  - `page.tsx`: Home (redirects to login or dashboard)
  - `login/page.tsx`: Login form
  - `register/page.tsx`: Registration form
  - `dashboard/page.tsx`: Main dashboard
- `src/lib/`: Utilities
  - `api.ts`: Axios instance with interceptors
  - `socket.ts`: Socket.IO client service
- `src/store/`: Zustand state management
  - `authStore.ts`: Authentication state

**API Integration**:

Created in `lib/api.ts`:
```typescript
import api from '@/lib/api';

// Automatically includes Authorization header if token exists
const response = await api.get('/projects');
const project = await api.post('/projects', data);
```

**Interceptors**:
- Request: Adds `Authorization: Bearer <token>` from localStorage
- Response: Redirects to `/login` on 401 errors

**State Management (Zustand)**:

Auth store (`store/authStore.ts`):
```typescript
const { user, token, login, logout, fetchUser } = useAuthStore();

await login(email, password);  // Sets user + token, stores in localStorage
logout();                       // Clears user + token, removes from localStorage
await fetchUser();             // Fetches current user from /api/auth/me
```

**Real-Time Features**:

Socket service (`lib/socket.ts`):
```typescript
import { socketService } from '@/lib/socket';

socketService.connect(token);
socketService.on('notification', callback);
socketService.emit('typing', data);
socketService.disconnect();
```

**Routing Pattern**:
- All pages use `'use client'` directive (client components)
- Authentication check in useEffect, redirect if no token
- Use Next.js `useRouter()` for navigation

### Real-Time Communication (Socket.IO)

**Server Setup** (`apps/backend/src/socket.ts`):
- JWT authentication in connection middleware
- User joins `user_{userId}` room on connect
- Manual room management: `join_project`, `leave_project`

**Event Patterns**:

Emit to specific user:
```typescript
io.to(`user_${userId}`).emit('notification', data);
```

Emit to project room:
```typescript
io.to(`project_${projectId}`).emit('bid_received', data);
```

**Client Events**:
- `notification`: New notification received
- `message`: New message received
- `user_typing`: Someone is typing

**Server Events** (client sends):
- `join_project`: Join project room
- `leave_project`: Leave project room
- `typing`: Send typing indicator

**Authentication Flow**:
1. Client connects with token in auth: `io(url, { auth: { token } })`
2. Server verifies JWT in middleware
3. On success, socket.data.user contains decoded token data
4. On failure, connection is rejected

## Environment Variables

### Backend (apps/backend/.env)
```bash
DATABASE_URL="postgresql://user:pass@host:5432/db"  # Prisma connection string
PORT=3001                                            # Server port
NODE_ENV=development                                 # Environment
JWT_SECRET="your-secret-key"                         # For signing JWTs
JWT_EXPIRES_IN=7d                                    # Token expiration
UPLOAD_DIR=./uploads                                 # File upload directory
MAX_FILE_SIZE=10485760                               # 10MB in bytes
ALLOWED_ORIGINS=http://localhost:3000,https://*.vercel.app  # CORS (comma-separated, supports wildcards)
```

### Frontend (apps/web/.env)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001            # Backend API URL (must have NEXT_PUBLIC_ prefix)
```

**Important**:
- Frontend env vars must start with `NEXT_PUBLIC_` to be accessible in browser
- Templates: `.env.example` (development), `.env.production.example` (production)
- Never commit `.env` files (in .gitignore)

## Key Workflows

### Adding a New API Endpoint

1. Create route in `apps/backend/src/routes/*.routes.ts`
2. Use `authenticate` and `authorize` middleware if needed
3. Use `express-validator` for input validation
4. Perform database operations with Prisma
5. Emit Socket.IO events if real-time updates needed
6. Create notifications in database if applicable
7. Export router and import in `index.ts`

Example:
```typescript
router.post(
  '/',
  authenticate,
  authorize('PROPERTY_MANAGER'),
  [body('title').trim().notEmpty()],
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // ... business logic
  }
);
```

### Adding a New Database Model

1. Add model to `apps/backend/prisma/schema.prisma`
2. Define relations to existing models
3. Add indexes for foreign keys
4. Run `pnpm db:generate` to update Prisma Client
5. Run `pnpm db:push` (dev) or create migration with `pnpm db:migrate`
6. Create corresponding API routes
7. Update frontend types if needed

### Adding Real-Time Feature

1. **Backend**: After database operation, emit event:
   ```typescript
   const io: Server = req.app.get('io');
   io.to(`user_${recipientId}`).emit('event_name', data);
   ```

2. **Frontend**: Subscribe to event in component:
   ```typescript
   useEffect(() => {
     socketService.on('event_name', handleEvent);
     return () => socketService.off('event_name', handleEvent);
   }, []);
   ```

3. Create notification record in database for persistence

## Deployment

- **Frontend**: Vercel (see `VERCEL_SETUP.md`)
  - Root directory: `apps/web`
  - Build command: `npm install && npm run build`
  - Environment variable: `NEXT_PUBLIC_API_URL`

- **Backend**: Railway (see `DEPLOYMENT.md`)
  - Includes PostgreSQL database
  - Environment variables: All from backend .env
  - Run `npx prisma db push` after first deployment

- **Important**: Update `ALLOWED_ORIGINS` in Railway after deploying to Vercel to include your Vercel URL

## Common Gotchas

1. **Prisma Client Not Found**: Run `pnpm db:generate` after pulling schema changes
2. **CORS Errors**: Check `ALLOWED_ORIGINS` includes your frontend URL (with protocol)
3. **Socket.IO Not Connecting**: Verify JWT token is valid and passed in connection auth
4. **401 on All Requests**: Check token in localStorage, may need to re-login
5. **Module Not Found**: Run `pnpm install` at root (installs all workspace dependencies)
6. **Database Connection Error**: Verify `DATABASE_URL` format and database exists
7. **Next.js Env Vars**: Must prefix with `NEXT_PUBLIC_` for client-side access

## File Upload Pattern

Backend uses Multer middleware:
```typescript
const upload = multer({
  storage: multer.diskStorage({ ... }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => { /* validate type */ }
});

router.post('/upload', authenticate, upload.single('file'), handler);
```

Files stored in `UPLOAD_DIR` (default: `./uploads/`)
File URLs: `/uploads/filename` (served by Express)

## Important Code Patterns

### Access Control Pattern
```typescript
// Property Manager checks
if (project.managerId !== userId) {
  return res.status(403).json({ error: 'Access denied' });
}

// Vendor checks
if (bid.vendorId !== userId) {
  return res.status(403).json({ error: 'Access denied' });
}
```

### Notification + Real-Time Pattern
```typescript
// 1. Create database notification
await prisma.notification.create({
  data: { userId, title, message, type, link }
});

// 2. Emit real-time event
io.to(`user_${userId}`).emit('notification', {
  title, message, type, link
});
```

### Frontend Auth Check Pattern
```typescript
useEffect(() => {
  if (!token) {
    router.push('/login');
    return;
  }
  fetchUser();
}, [token]);
```

## Additional Documentation

- `README.md`: Full project overview and features
- `DEPLOYMENT.md`: Production deployment guide (Vercel + Railway)
- `VERCEL_SETUP.md`: Fix for Vercel 404 errors in monorepo
- `DEPLOYMENT_CHECKLIST.md`: Quick deployment checklist
- `QUICK_START.md`: Local development setup
- `CODESPACES_GUIDE.md`: GitHub Codespaces setup
