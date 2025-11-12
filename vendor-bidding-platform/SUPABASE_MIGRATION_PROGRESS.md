# Supabase Migration Progress

## ✅ Completed

### 1. Database Setup
- ✅ Created Supabase project
- ✅ Executed all SQL migrations (tables, RLS policies, storage)
- ✅ 7 tables created: users, properties, projects, bids, documents, messages, notifications
- ✅ Row Level Security enabled on all tables
- ✅ Storage bucket "documents" created with policies

### 2. Backend Configuration
- ✅ Updated `package.json` (removed Prisma, added @supabase/supabase-js)
- ✅ Created `.env` with Supabase credentials
- ✅ Created `src/lib/supabase.ts` (Supabase client configuration)
- ✅ Created `src/types/supabase.ts` (TypeScript types)
- ✅ Fixed dotenv loading order in `src/index.ts`

### 3. Migrated Routes (3/8)
- ✅ **auth.routes.ts** - Full Supabase Auth (register, login, /me)
- ✅ **user.routes.ts** - Profile get/update
- ✅ **property.routes.ts** - CRUD operations

### 4. Middleware
- ✅ **auth.ts** - Updated to use Supabase Auth tokens

## 🔄 In Progress

### 5. Remaining Routes to Migrate (5/8)
- ⏳ **project.routes.ts** - CRUD operations
- ⏳ **bid.routes.ts** - CRUD operations + notifications
- ⏳ **message.routes.ts** - CRUD operations
- ⏳ **notification.routes.ts** - CRUD operations
- ⏳ **document.routes.ts** - File upload to Supabase Storage

## 📋 Next Steps

1. Migrate remaining 5 route files
2. Test backend server startup
3. Test authentication flow (register/login)
4. Update frontend to use Supabase
5. Deploy and test

## 🗂️ Database Schema

```
auth.users (Supabase Auth)
  └─> users (public table with profile data)
       ├─> properties
       │    └─> projects
       │         ├─> bids
       │         │    └─> documents
       │         ├─> documents
       │         └─> messages
       └─> notifications
```

## 🔑 Key Changes

### Prisma → Supabase Query Examples

**Before (Prisma):**
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId }
});
```

**After (Supabase):**
```typescript
const { data: user } = await supabaseAdmin
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();
```

### Field Name Changes (snake_case in DB)
- `firstName` → `first_name`
- `lastName` → `last_name`
- `zipCode` → `zip_code`
- `managerId` → `manager_id`
- `createdAt` → `created_at`
- `updatedAt` → `updated_at`

## 🔒 Security (RLS Policies)

- Property managers can only access their own properties/projects
- Vendors can only see OPEN projects
- Users can only access their own profile data
- Admin role can view all data
- RLS is enforced at the database level

## 📝 Environment Variables

```bash
SUPABASE_URL=https://nzvitmfuvkfacnjpxydm.supabase.co
SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19006
```
