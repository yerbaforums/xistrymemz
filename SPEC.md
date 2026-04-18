# XistryMemz - Collaborative Planning & Community Platform

## 1. Project Overview

**Project Name:** XistryMemz  
**Type:** Full-stack web application  
**Core Functionality:** Users create projects, submit requests to complete them, and connect with community members globally for collaboration
**Target Users:** Individuals and teams who want to plan tasks, collaborate, and connect with others worldwide

---

## 2. Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** SQLite (for simplicity, easily swappable to PostgreSQL)
- **ORM:** Prisma
- **Auth:** NextAuth.js with credentials provider
- **Styling:** CSS Modules + CSS Variables
- **Language:** TypeScript

---

## 3. UI/UX Specification

### Color Palette

| Role | Color | Usage |
|------|-------|-------|
| Background Primary | `#0d0d0d` | Main page background |
| Background Secondary | `#161616` | Cards, panels |
| Background Tertiary | `#1f1f1f` | Hover states, inputs |
| Accent Primary | `#00d9ff` | Primary buttons, links, highlights |
| Accent Secondary | `#ff3366` | Destructive actions, warnings |
| Accent Success | `#00ff88` | Success states, completed items |
| Text Primary | `#ffffff` | Headings, primary text |
| Text Secondary | `#888888` | Descriptions, labels |
| Text Muted | `#555555` | Placeholders, disabled |
| Border | `#2a2a2a` | Card borders, dividers |

### Typography

- **Font Family:** `"JetBrains Mono", "Fira Code", monospace` for headings, `"IBM Plex Sans", system-ui, sans-serif` for body
- **Headings:** 
  - H1: 2.5rem, weight 700
  - H2: 1.75rem, weight 600
  - H3: 1.25rem, weight 600
- **Body:** 1rem, weight 400, line-height 1.6
- **Small:** 0.875rem

### Spacing System

- Base unit: 4px
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64px

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  HEADER: Logo | Navigation | Messages | User Menu      │
├─────────────────────────────────────────────────────────┤
│  MAIN CONTENT                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Page Title + Actions                          │   │
│  ├─────────────────────────────────────────────────┤   │
│  │                                                 │   │
│  │  Content Area                                   │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Responsive Breakpoints

- Mobile: < 768px (sidebar collapses to hamburger menu)
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Visual Effects

- Cards: `border: 1px solid #2a2a2a`, `border-radius: 12px`
- Shadows: `0 4px 24px rgba(0, 217, 255, 0.05)` on hover
- Transitions: `all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`
- Glow effect on accent elements: `box-shadow: 0 0 20px rgba(0, 217, 255, 0.3)`

---

## 4. Component Specifications

### Header
- Fixed position, height 64px
- Logo (left), Navigation (center), Messages + User dropdown (right)
- Navigation: Dashboard, Projects, Requests, Events, Marketplace, **Community**, **Messages**
- Background: `#0d0d0d` with bottom border `#2a2a2a`

### Member Card
- Avatar (64px circle), name, email, location, bio
- Connection status indicator
- Actions: View Profile, Connect/Message buttons

### Message Interface
- Two-column layout: Conversations list (320px) + Chat area
- Message bubbles with sender avatar, content, timestamp
- Unread count badges
- Real-time message input

### Connection Request Card
- Requester avatar and name
- Accept/Decline buttons
- Pending status indicator

### Project Card
- Padding: 24px
- Title (H3), description, progress bar, request count
- Status badge (Draft, Active, Completed)
- Actions: Edit, Delete, View Requests
- Pinned indicator for featured projects

### Request Card
- Plan reference, status, submitter, date
- Status badges: Pending (yellow), Approved (green), Rejected (red)
- Actions: Approve, Reject, View Details

### Buttons
- Primary: `#00d9ff` background, `#0d0d0d` text
- Secondary: transparent, `#00d9ff` border and text
- Danger: `#ff3366` background
- Padding: 12px 24px, border-radius: 8px
- Hover: slight scale (1.02) + glow

### Forms
- Input fields: `#1f1f1f` background, `#2a2a2a` border
- Focus: `#00d9ff` border with glow
- Labels: `#888888`, positioned above inputs

### Modal
- Centered overlay with backdrop blur
- Max-width: 500px
- Close button top-right

---

## 5. Database Schema

### User
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  password      String
  image         String?
  coverImage    String?
  userClass     String?
  bio           String?
  location      String?
  website       String?
  shopName      String?
  shopAbout     String?
  shopSlug      String?   @unique
  schoolName    String?
  schoolAbout   String?
  schoolSlug    String?   @unique
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  plans         Plan[]
  requests      Request[]
  comments      Comment[]
  joiners       PlanJoiner[]
  eventJoiners  PlanEventJoiner[]
  products      Product[]
  schoolContentsOwned    SchoolContent[] @relation("SchoolOwner")
  schoolContentsAuthored SchoolContent[] @relation("SchoolAuthor")
  sentConnections     Connection[] @relation("ConnectionRequester")
  receivedConnections Connection[] @relation("ConnectionReceiver")
  sentMessages        Message[] @relation("MessageSender")
  receivedMessages    Message[] @relation("MessageReceiver")
  posts       Post[]
}
```

### Connection
```prisma
model Connection {
  id          String    @id @default(cuid())
  requesterId String
  requester   User      @relation("ConnectionRequester", fields: [requesterId], references: [id], onDelete: Cascade)
  receiverId  String
  receiver    User      @relation("ConnectionReceiver", fields: [receiverId], references: [id], onDelete: Cascade)
  status      String    @default("PENDING")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([requesterId, receiverId])
}
```

### Message
```prisma
model Message {
  id           String    @id @default(cuid())
  senderId     String
  sender       User      @relation("MessageSender", fields: [senderId], references: [id], onDelete: Cascade)
  receiverId   String
  receiver     User      @relation("MessageReceiver", fields: [receiverId], references: [id], onDelete: Cascade)
  content      String
  read         Boolean   @default(false)
  createdAt    DateTime  @default(now())
}

model EmailSubscriber {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  subscribed Boolean  @default(true)
  source    String   @default("landing_page")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        String   @id @default(cuid())
  content   String
  imageUrl  String?
  pinned    Boolean  @default(false)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  likes     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Plan
```prisma
model Plan {
  id             String     @id @default(cuid())
  title          String
  description    String?
  goals          String?
  mileposts      String?
  milepostStatus String?   @default("[]")
  status         String     @default("DRAFT")
  published      Boolean    @default(false)
  pinned         Boolean    @default(false)
  userId         String
  user           User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  requests       Request[]
  joiners        PlanJoiner[]
  events         PlanEvent[]
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
}
```

### PlanEvent
```prisma
model PlanEvent {
  id              String   @id @default(cuid())
  title           String
  description     String?
  eventCategory   String?
  eventDate       DateTime?
  location        String?
  locationDetails String?
  latitude        Float?
  longitude       Float?
  maxJoiners      Int      @default(0)
  pinned          Boolean  @default(false)
  planId          String
  plan            Plan     @relation(fields: [planId], references: [id], onDelete: Cascade)
  joiners         PlanEventJoiner[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### Request
```prisma
model Request {
  id          String    @id @default(cuid())
  title       String
  description String?
  status      String    @default("PENDING")
  planId      String
  plan        Plan      @relation(fields: [planId], references: [id], onDelete: Cascade)
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId   String?
  product     Product?  @relation(fields: [productId], references: [id], onDelete: SetNull)
  comments    Comment[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

### Comment
```prisma
model Comment {
  id        String   @id @default(cuid())
  content   String
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  requestId String
  request   Request  @relation(fields: [requestId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}
```

### Product
```prisma
model Product {
  id          String   @id @default(cuid())
  title       String
  description String?
  price       Float?
  type        String   @default("PRODUCT")
  category    String?
  condition   String?
  location    String?
  imageUrl    String?
  published   Boolean  @default(true)
  pinned      Boolean  @default(false)
  paymentMethods String?
  acceptsRequests Boolean @default(false)
  requestPrice Float?
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  requests    Request[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## 6. Page Structure

### `/` - Landing Page (unauthenticated)
- Hero section with app description
- Features highlight
- Login/Register buttons
- Email signup form for updates/newsletter

### `/dashboard` - User Dashboard
- Overview stats (total projects, pending requests, completed, connections)
- Recent projects list
- Pending requests needing action
- Activity feed from connections

### `/community` - Community Hub
- **Browse Members** tab - Search and filter all members
- **My Connections** tab - List of connected users
- **Pending Requests** tab - Incoming connection requests
- Connect with members globally

### `/community/[id]` - Member Profile
- User info (avatar, name, bio, location, website)
- Public plans list
- Connection count
- Connect/Message actions

### `/messages` - Messages
- Two-column layout: conversations list + active chat
- Send/receive messages with connected users
- Unread message indicators

### `/profile/[id]` - User Profile
- Profile header with stats
- Edit own profile (name, bio, location, website)
- Plans tab / About tab
- Connect with other users

### `/plans` - Projects List
- Filterable by status
- Search by title
- Create new project button

### `/plans/public` - Explore Projects
- Browse all public projects from community
- Filter by status (All, Active, Completed)
- Search by title or description
- Shows pinned/featured projects prominently
- Displays project author, goals, and stats (requests, joiners)

### `/plans/[id]` - Project Detail
- Project info, edit form
- Associated requests list
- Add request button
- Join project functionality

### `/requests` - All Requests
- Filterable by status, plan
- Bulk actions

### `/requests/[id]` - Request Detail
- Full request info
- Comments section
- Approve/Reject actions

### `/auth/login` - Login Page
### `/auth/register` - Registration Page
### `/onboarding` - Onboarding Flow
- Welcome screen with introduction
- Profile setup step (name, bio, location)
- Create first project step
- Community overview with quick links
- Completion screen with tips

---

## 7. API Routes

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/[...nextauth]` | Auth handlers |

### Community & Connections
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/community/members` | List all members |
| POST | `/api/community/connect` | Send connection request |
| GET | `/api/community/connections` | List user's connections |
| PUT | `/api/community/connections/[id]` | Accept connection |
| DELETE | `/api/community/connections/[id]` | Decline/remove connection |

### Messaging
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages/conversations` | List conversations |
| GET | `/api/messages` | Get messages with user |
| POST | `/api/messages` | Send message |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/[id]` | Get user profile |
| PUT | `/api/users/[id]` | Update own profile |
| GET | `/api/users/me` | Get current user profile |
| PUT | `/api/users/me` | Update own profile |

### Email Subscription
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/subscribe` | Subscribe to email updates |
| DELETE | `/api/subscribe` | Unsubscribe from emails |

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts` | List posts (optional userId filter) |
| POST | `/api/posts` | Create a post |
| GET | `/api/posts/[id]` | Get single post |
| PUT | `/api/posts/[id]` | Update post |
| DELETE | `/api/posts/[id]` | Delete post |

### Pin
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/pin` | Pin/unpin post, plan, product, or event |

### Plans
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/plans` | List/Create plans |
| GET/PUT/DELETE | `/api/plans/[id]` | Plan CRUD |

### Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/requests` | List/Create requests |
| GET/PUT/DELETE | `/api/requests/[id]` | Request CRUD |
| POST | `/api/requests/[id]/approve` | Approve request |
| POST | `/api/requests/[id]/reject` | Reject request |
| GET/POST | `/api/requests/[id]/comments` | Comments CRUD |

---

## 8. Acceptance Criteria

### Core Features
- [x] User can register and login
- [x] User can create, edit, delete plans
- [x] User can submit requests to complete plans
- [x] User can view all their requests
- [x] User can approve/reject requests
- [x] User can add comments to requests
- [x] Dashboard shows relevant stats

### Community Features
- [x] User can browse all community members
- [x] User can send/receive connection requests
- [x] User can accept/decline connection requests
- [x] User can view their connections list
- [x] User can send direct messages to connections
- [x] User can view message conversations
- [x] User can edit their profile (name, bio, location, website)
- [x] User can view other user profiles

### Technical Requirements
- [ ] Responsive design works on mobile
- [ ] Dark theme applied consistently
- [ ] Form validations work
- [ ] Error handling displays user-friendly messages
- [ ] Unread message indicators
- [ ] Real-time message updates (future)

### Email Subscription
- [x] Users can subscribe to email updates from landing page
- [x] Email opt-in during registration
- [x] Email validation before submission
- [x] Duplicate email handling (resubscribe if unsubscribed)

### Onboarding Flow
- [x] New users redirected to onboarding after registration
- [x] Profile setup step
- [x] First plan creation step
- [x] Community overview with quick links
- [x] Skip option to go directly to dashboard

### Preview Functionality
- [x] Users can preview their shop from shop setup page
- [x] Users can preview their school from school setup page
- [x] Users can preview their published projects
- [x] Users can preview their product listings
- [x] Dashboard shows preview buttons for shop and school

### User Classes
Users can select one or more classes that represent their skills/roles:
- Healer, Revealer, Seer, Teacher, Guide, Warrior, Guardian, Sage, Mystic, Architect, Artist, Builder, Explorer, Mentor

### Pinning Functionality
- [x] Users can pin posts to top of their profile
- [x] Users can pin projects to top of their profile
- [x] Users can pin products to top of their profile
- [x] Pinned items show with highlighted styling (📌 Featured badge)

### User Profiles
- [x] Users can edit profile picture (via URL)
- [x] Users can add/edit cover image
- [x] Users can edit bio, location, website
- [x] Profile shows posts, plans, products, and connections count
- [x] Users can create posts on their profile
- [x] Users can delete their own posts
- [x] Posts display with author info and date
- [x] Profile displays user's shop listings
- [x] Profile links to user's school
- [x] Users can select one or multiple classes (Healer, Revealer, Seer, Teacher, etc.)
- [x] Users can send message when connecting
- [x] Users can pin posts, plans, and products to top of profile
- [x] Pinned items show with highlighted styling

---

## 9. Navigation Structure

```
HEADER
├── Dashboard
├── Projects
│   ├── /plans
│   ├── /plans/[id]
│   └── /plans/public
├── Requests
│   ├── /requests
│   └── /requests/[id]
├── Events
├── Marketplace
│   └── /products/[id]
├── Community
│   └── /profile/[id]
└── Messages
    └── /messages?user=[id]
```
