# Supabase Migration - Remaining Tasks

## ✅ Completed Routes (4/8)
- auth.routes.ts
- user.routes.ts
- property.routes.ts
- project.routes.ts

## ⚠️ Routes Needing Full Migration (4/8)

### 1. bid.routes.ts
**Current Status:** Uses Prisma
**Complexity:** HIGH (includes Socket.IO notifications)

**Endpoints to migrate:**
- `GET /` - Get all bids (filtered by role)
- `GET /:id` - Get single bid
- `POST /` - Submit bid (emit notification)
- `PUT /:id` - Update bid
- `PUT /:id/accept` - Accept bid (emit notification)
- `PUT /:id/reject` - Reject bid (emit notification)
- `DELETE /:id` - Delete bid

**Key Changes:**
- Replace Prisma queries with Supabase
- Keep Socket.IO emit logic
- Use supabaseAdmin for notifications table

### 2. message.routes.ts
**Current Status:** Uses Prisma
**Complexity:** MEDIUM (includes Socket.IO)

**Endpoints to migrate:**
- `GET /` - Get messages
- `POST /` - Send message (emit Socket.IO event)
- `PUT /:id/read` - Mark as read

### 3. notification.routes.ts
**Current Status:** Uses Prisma
**Complexity:** LOW

**Endpoints to migrate:**
- `GET /` - Get notifications
- `PUT /:id/read` - Mark as read
- `DELETE /:id` - Delete notification

### 4. document.routes.ts
**Current Status:** Uses Multer + Prisma
**Complexity:** HIGH (file upload migration)

**Endpoints to migrate:**
- `POST /upload` - Upload to Supabase Storage (not Multer)
- `GET /:id` - Get document
- `DELETE /:id` - Delete from Storage + DB

**Migration Steps:**
1. Replace Multer with Supabase Storage upload
2. Store file in: `{user_id}/projects/{project_id}/` or `{user_id}/bids/{bid_id}/`
3. Get signed URL for downloads
4. Update documents table with storage URLs

## 🔧 Quick Fix Option

To get the server running NOW for auth testing, you can stub these routes:

```typescript
// Temporary stub - replace with full implementation
router.get('/', authenticate, async (req, res) => {
  res.json([]);
});
```

Then migrate fully later.

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

## 🎯 Priority Order

1. **CRITICAL:** Test auth routes work (already done!)
2. **HIGH:** bid.routes.ts (core functionality)
3. **MEDIUM:** message.routes.ts & notification.routes.ts
4. **MEDIUM:** document.routes.ts (Storage migration)

## 🚀 Testing Plan

After full migration:
1. Register new user
2. Login
3. Create property (PM)
4. Create project (PM)
5. Submit bid (Vendor)
6. Accept bid (PM)
7. Upload document
8. Send message

Each step tests different routes!
