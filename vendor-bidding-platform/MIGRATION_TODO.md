# Supabase Migration - Complete! ✅

## ✅ All Routes Migrated (8/8)
- auth.routes.ts ✅
- user.routes.ts ✅
- property.routes.ts ✅
- project.routes.ts ✅
- notification.routes.ts ✅
- message.routes.ts ✅
- bid.routes.ts ✅
- document.routes.ts ✅ (Supabase Storage)

## 🎉 Migration Complete!

All backend routes have been successfully migrated from Prisma to Supabase!

### What Was Migrated

#### 1. **notification.routes.ts** ✅
- GET `/` - Fetch notifications with filters
- GET `/unread-count` - Get unread notification count
- PATCH `/:id/read` - Mark single notification as read
- POST `/mark-all-read` - Mark all notifications as read
- DELETE `/:id` - Delete notification

#### 2. **message.routes.ts** ✅
- GET `/conversations` - Get all conversations with unread counts
- GET `/with/:userId` - Get messages with specific user (auto-marks as read)
- POST `/` - Send message (creates notification + Socket.IO event)
- PATCH `/:id/read` - Mark message as read

#### 3. **bid.routes.ts** ✅
- GET `/` - Get all bids (filtered by role: vendors see theirs, managers see their projects)
- GET `/:id` - Get single bid with full details
- POST `/` - Submit bid (creates notification + Socket.IO event)
- PUT `/:id` - Update bid (vendors only, pending bids only)
- PATCH `/:id/status` - Accept/reject bid (managers only, updates project status, auto-rejects other bids)
- DELETE `/:id` - Withdraw bid (vendors only, pending bids only)

#### 4. **document.routes.ts** ✅
- POST `/upload` - Upload file to Supabase Storage
  - Uses multer for memory storage (no disk writes)
  - Uploads to organized paths: `{userId}/projects/{projectId}/*` or `{userId}/bids/{bidId}/*`
  - Creates database record with file metadata
  - Validates file types and permissions
- GET `/:id` - Get document with signed URL (1 hour validity)
  - Generates temporary signed URL for secure downloads
  - Checks access permissions (uploader, project manager, or bid vendor)
- DELETE `/:id` - Delete from Storage + database
  - Removes file from Supabase Storage
  - Deletes database record
  - Permission check: uploader or admin only

## 📝 Migration Pattern Reference

### Prisma → Supabase Query Examples

**Find Many:**
```typescript
// Before
const items = await prisma.table.findMany({
  where: { userId },
  include: { related: true }
});

// After
const { data: items } = await supabaseAdmin
  .from('table')
  .select('*, related(*)')
  .eq('user_id', userId);
```

**Create:**
```typescript
// Before
const item = await prisma.table.create({
  data: { name, userId }
});

// After
const { data: item } = await supabaseAdmin
  .from('table')
  .insert({ name, user_id: userId })
  .select()
  .single();
```

**Update:**
```typescript
// Before
const item = await prisma.table.update({
  where: { id },
  data: { name }
});

// After
const { data: item } = await supabaseAdmin
  .from('table')
  .update({ name })
  .eq('id', id)
  .select()
  .single();
```

## 🚀 Next Steps

### 1. Install Dependencies
In your development environment (Codespaces or local):
```bash
cd apps/backend
npm install   # or pnpm install
```

This will install the newly added `multer` dependency for file uploads.

### 2. Start the Server
```bash
cd apps/backend
npm run dev   # or pnpm dev
```

The server should start successfully on port 3001.

### 3. Testing Plan

Test all endpoints to verify the migration:

**Authentication:**
1. POST `/api/auth/register` - Register new user
2. POST `/api/auth/login` - Login and get token
3. GET `/api/auth/me` - Verify token works

**Property Manager Flow:**
4. POST `/api/properties` - Create property
5. GET `/api/properties` - List properties
6. POST `/api/projects` - Create project
7. GET `/api/projects` - View projects

**Vendor Flow:**
8. GET `/api/projects` - Browse open projects (as vendor)
9. POST `/api/bids` - Submit bid
10. GET `/api/bids` - View own bids

**Property Manager - Bid Management:**
11. GET `/api/bids?projectId=<id>` - View bids for project
12. PATCH `/api/bids/:id/status` - Accept/reject bid
13. Verify other bids auto-rejected when one accepted

**Messaging:**
14. POST `/api/messages` - Send message
15. GET `/api/messages/conversations` - List conversations
16. GET `/api/messages/with/:userId` - View messages with user

**Notifications:**
17. GET `/api/notifications` - View notifications
18. PATCH `/api/notifications/:id/read` - Mark as read
19. POST `/api/notifications/mark-all-read` - Mark all read

**Document Upload:**
20. POST `/api/documents/upload` - Upload file (requires multipart form-data)
21. GET `/api/documents/:id` - Get document with signed URL
22. DELETE `/api/documents/:id` - Delete document

## 🎯 Key Migration Changes

### Database
- All Prisma queries → Supabase client queries
- `prisma.model.findMany()` → `supabaseAdmin.from('table').select()`
- Relationships use foreign key notation: `vendor:users!bids_vendor_id_fkey(*)`
- camelCase → snake_case for column names

### Authentication
- Custom JWT → Supabase Auth
- `jwt.verify()` → `supabaseAdmin.auth.getUser(token)`
- User data split: auth.users (Supabase) + public.users (app data)
- Automatic user profile creation via database trigger

### File Storage
- Multer disk storage → Supabase Storage
- Local file paths → Cloud storage with signed URLs
- Organized storage structure: `{userId}/projects/{projectId}/*`
- Automatic cleanup on delete

### Real-Time Features
- Socket.IO integration maintained
- Notifications stored in database + emitted via Socket.IO
- Room-based broadcasting: `io.to(`user_${userId}`).emit(...)`
