# Vendor Bidding Platform

A comprehensive property management platform that enables property managers to request vendor bids for projects, events, construction, and other on-site needs.

## Features

### Core Functionality
- **Role-Based Access Control**: Separate interfaces for Property Managers and Vendors
- **Project Management**: Create, manage, and track projects requiring vendor services
- **Bid Submission & Management**: Vendors can submit bids, property managers can review and accept/reject
- **Real-Time Notifications**: Socket.IO powered instant updates for bid submissions, messages, and status changes
- **In-App Messaging**: Direct communication between property managers and vendors
- **Document Management**: Upload and manage project specifications, photos, contracts, and bid documents
- **Property Management**: Property managers can manage multiple properties

### Project Types
- Construction
- Maintenance
- Events
- Landscaping
- Cleaning
- Other

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (JSON Web Tokens)
- **Real-Time**: Socket.IO
- **File Upload**: Multer
- **Validation**: express-validator

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **API Client**: Axios
- **Real-Time**: Socket.IO Client

## Project Structure

```
vendor-bidding-platform/
├── apps/
│   ├── backend/               # Express API server
│   │   ├── prisma/
│   │   │   └── schema.prisma  # Database schema
│   │   └── src/
│   │       ├── routes/        # API route handlers
│   │       ├── middleware/    # Auth & error handling
│   │       ├── socket.ts      # Socket.IO setup
│   │       └── index.ts       # Server entry point
│   │
│   └── web/                   # Next.js web application
│       ├── src/
│       │   ├── app/           # Next.js app router pages
│       │   ├── components/    # React components
│       │   ├── lib/           # Utilities (API, socket)
│       │   └── store/         # Zustand stores
│       └── public/            # Static assets
│
└── packages/                  # Shared packages (future)
```

## Database Schema

### Main Entities

1. **User**
   - Property Managers and Vendors
   - Email/password authentication
   - Role-based access

2. **Property**
   - Managed by Property Managers
   - Address, location details

3. **Project**
   - Created by Property Managers
   - Type, description, budget, timeline
   - Status tracking (Draft, Open, In Review, Awarded, etc.)

4. **Bid**
   - Submitted by Vendors
   - Amount, timeline, description
   - Status (Pending, Accepted, Rejected, Withdrawn)

5. **Message**
   - Direct messaging between users
   - Project-specific conversations

6. **Notification**
   - Real-time alerts for important events

7. **Document**
   - File attachments for projects and bids

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database
- Git

### Installation

1. **Clone the repository**
   ```bash
   cd vendor-bidding-platform
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up the database**

   Create a PostgreSQL database and update the connection string in `apps/backend/.env`:

   ```bash
   # Copy environment files
   cp apps/backend/.env.example apps/backend/.env
   cp apps/web/.env.example apps/web/.env
   ```

   Update `apps/backend/.env`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/vendor_bidding"
   JWT_SECRET=your-secure-random-secret
   PORT=3001
   ```

4. **Run database migrations**
   ```bash
   cd apps/backend
   pnpm db:push
   # or for migrations
   pnpm db:migrate
   ```

5. **Start the development servers**

   From the root directory:
   ```bash
   # Start both frontend and backend
   pnpm dev

   # Or start them separately:
   pnpm dev:backend  # Backend on port 3001
   pnpm dev:web      # Frontend on port 3000
   ```

6. **Access the application**
   - Web app: http://localhost:3000
   - API: http://localhost:3001
   - Prisma Studio (database GUI): `cd apps/backend && pnpm db:studio`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - List projects (filtered by role)
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create project (Property Manager)
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Bids
- `GET /api/bids` - List bids
- `GET /api/bids/:id` - Get bid details
- `POST /api/bids` - Submit bid (Vendor)
- `PUT /api/bids/:id` - Update bid
- `PATCH /api/bids/:id/status` - Accept/Reject bid (Property Manager)
- `DELETE /api/bids/:id` - Withdraw bid

### Properties
- `GET /api/properties` - List properties
- `POST /api/properties` - Create property
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property

### Messages
- `GET /api/messages/conversations` - Get all conversations
- `GET /api/messages/with/:userId` - Get messages with user
- `POST /api/messages` - Send message
- `PATCH /api/messages/:id/read` - Mark as read

### Notifications
- `GET /api/notifications` - Get notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PATCH /api/notifications/:id/read` - Mark as read
- `POST /api/notifications/mark-all-read` - Mark all as read

### Documents
- `POST /api/documents/upload` - Upload file
- `GET /api/documents` - Get documents
- `DELETE /api/documents/:id` - Delete document

## Real-Time Features

The platform uses Socket.IO for real-time updates:

### Events Emitted to Clients
- `notification` - New notification received
- `message` - New message received
- `user_typing` - User is typing indicator

### Events from Clients
- `join_project` - Join project room
- `leave_project` - Leave project room
- `typing` - Send typing indicator

## User Workflows

### Property Manager Workflow
1. Register/Login as Property Manager
2. Add properties to manage
3. Create a project for a property
4. Wait for vendor bids
5. Review bids and communicate with vendors
6. Accept a bid and award the project
7. Track project completion

### Vendor Workflow
1. Register/Login as Vendor
2. Browse available open projects
3. Review project details and requirements
4. Submit a bid with pricing and timeline
5. Communicate with property manager
6. Get notified of bid acceptance
7. Complete the awarded project

## Development

### Database Management

```bash
# Generate Prisma Client
pnpm --filter backend db:generate

# Push schema changes to database
pnpm --filter backend db:push

# Create and run migrations
pnpm --filter backend db:migrate

# Open Prisma Studio
pnpm --filter backend db:studio
```

### Running Tests
```bash
# Backend tests
pnpm --filter backend test

# Frontend tests
pnpm --filter web test
```

### Building for Production

```bash
# Build all apps
pnpm build

# Build specific app
pnpm --filter backend build
pnpm --filter web build
```

## Future Enhancements

### Mobile App (React Native)
The project structure includes a placeholder for a React Native mobile app in `apps/mobile`. To add mobile support:

1. Create React Native app in `apps/mobile`
2. Share TypeScript types via `packages/shared`
3. Reuse API client and business logic
4. Connect to the same backend

### Additional Features to Consider
- Payment integration (Stripe, PayPal)
- Vendor ratings and reviews
- Project templates
- Advanced search and filtering
- Analytics dashboard
- Email notifications
- Calendar integration
- Multi-language support
- Dark mode

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/vendor_bidding
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Security Considerations

1. **Authentication**: JWT tokens with secure secret
2. **Authorization**: Role-based access control on all endpoints
3. **Input Validation**: express-validator on all inputs
4. **File Upload**: Type and size restrictions
5. **SQL Injection**: Prisma ORM prevents SQL injection
6. **XSS Protection**: React automatically escapes content
7. **CORS**: Configured allowed origins

## Deployment

### Backend Deployment
1. Set up PostgreSQL database
2. Set environment variables
3. Run database migrations
4. Build and start the server

### Frontend Deployment
1. Set `NEXT_PUBLIC_API_URL` to production API
2. Build the Next.js app
3. Deploy to Vercel, Netlify, or similar

### Recommended Services
- **Database**: Supabase, Railway, Neon
- **Backend**: Railway, Render, Fly.io
- **Frontend**: Vercel, Netlify
- **File Storage**: AWS S3, Cloudinary

## License

MIT

## Support

For issues and questions, please create an issue in the repository.
