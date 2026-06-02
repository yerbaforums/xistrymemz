# Development Priority List

> Generated from comprehensive site architecture review. Prioritized by impact and urgency.

---

## High Priority

### 1. Implement Consistent API Response Format
- **Issue**: API routes return inconsistent formats (`{ error }`, `{ success: true }`, raw data)
- **Solution**: Create standard envelope `{ success: boolean, data?: T, error?: string }`
- **Files to create**: `src/lib/api-helpers.ts`
- **Impact**: Makes frontend error handling predictable, reduces bugs

### 2. Create `requireAdmin()` Helper
- **Issue**: Admin checks duplicated across 30+ API routes with different patterns
- **Solution**: Single helper function with consistent 401/403 responses
- **Example**:
  ```typescript
  export async function requireAdmin(session: Session | null) {
    if (!session?.user?.id) return { error: 'Unauthorized', status: 401 }
    if (session.user.role !== 'ADMIN') return { error: 'Forbidden', status: 403 }
    return null
  }
  ```

### 3. Add React Error Boundary
- **Issue**: No error boundaries exist; crashes show blank screens
- **Solution**: Add `ErrorBoundary` component to wrap major sections
- **Files to create**: `src/components/ErrorBoundary.tsx`
- **Usage**: Wrap dashboard, marketplace, community sections

### 4. Reduce 166 `any` Type Usage
- **Issue**: 166 instances of `any` type, primarily in API routes
- **Solution**: Enable `@typescript-eslint/no-explicit-any` rule, create proper Prisma types
- **First targets**: `src/app/api/admin/users/route.ts`, `where: any = {}` patterns

---

## Medium Priority

### 5. Create Service Layer
- **Move business logic out of API routes**
- Create: `src/services/productService.ts`, `src/services/eventService.ts`, `src/services/walletService.ts`
- API routes should only handle HTTP concerns (request/response)

### 6. Add `withAuth()` Wrapper
- **Reduce boilerplate** in API routes
- Wrap handlers with automatic session checking
- Pattern: `export const GET = withAuth(async (req, session) => { ... })`

### 7. Request Validation Middleware
- **Use Zod schemas consistently** across all API routes
- Create middleware that validates request body against schema
- Return structured validation errors

### 8. Enable Stricter ESLint Rules
```javascript
'@next/next/no-img-element': 'warn',
'react-hooks/exhaustive-deps': 'warn',
'@typescript-eslint/no-explicit-any': 'error',
'@typescript-eslint/no-unused-vars': 'error'
```

### 9. Centralize TypeScript Types
- Create `src/types/` directory
- Move domain types: `Product.ts`, `User.ts`, `Event.ts`, `Request.ts`
- Reuse across frontend components and API routes

### 10. Performance Optimizations
- Add `useMemo` for filtered/sorted lists (PublicPlansClient, EventsPage)
- Add `useCallback` for function props passed to child components
- Add `React.memo()` to frequently-rendered components

### 11. CSS Standardization
- Pick one pattern: CSS modules for components, globals only for design tokens
- Remove mixed Tailwind-like utility classes from `globals.css`
- Document CSS naming conventions

### 12. Expand Test Coverage
- Currently only 6 API test files
- Add React Testing Library for components
- Test hooks: `useCart`, `useToast`, `useSiteSettings`
- Target: 60%+ coverage on critical paths

### 13. Database Transactions
- Use `$transaction()` for multi-step operations
- Affected: order creation, wallet transfers, event join/leave
- Prevents partial state on failure

---

## Low Priority

### 14. Proper Error Handling with `AppError`
```typescript
export class AppError extends Error {
  constructor(public statusCode: number, public message: string) {
    super(message)
  }
}
```

### 15. Health Check Endpoint
- Add `/api/health` for monitoring
- Check database connectivity, return status

### 16. Bundle Optimization
- Use `@next/bundle-analyzer` to identify large dependencies
- Add `dynamic()` imports for heavy components (charts, editors)
- Optimize Leaflet bundle size

### 17. Accessibility Improvements
- Add `role="navigation"` to nav elements
- Add `role="main"` to main content areas
- Test with axe-core for compliance
- Keyboard navigation for all interactive elements

### 18. Environment Validation
- Use Zod to validate `process.env` at startup
- Fail fast with clear error messages for missing required vars

### 19. Logging Framework
- Replace `console.error` with Winston/Pino
- Add correlation IDs for request tracking
- Structured logging for debugging

### 20. API Versioning
- Implement `/api/v1/` strategy
- Plan for backward compatibility
- Document API changes

---

## Patterns to Standardize

| Pattern | Current | Target |
|---------|---------|--------|
| API Responses | Inconsistent | `{ success, data, error }` |
| Admin Checks | Inline duplication | `requireAdmin()` |
| Validation | Good (Zod) | Apply to ALL routes |
| Error Handling | try/catch per route | Error handler wrapper |
| Exports | Mixed default/named | Named exports |
| CSS | Modules + global utils | Standardize per type |

---

## Security Notes

### Current Strengths
- ✅ bcryptjs password hashing
- ✅ Rate limiting in middleware
- ✅ Security headers in next.config.ts
- ✅ Zod validation
- ✅ Session-based auth with JWT

### Needs Improvement
- ⚠️ File upload needs size/type validation
- ⚠️ Input sanitization for XSS
- ⚠️ CORS configuration
- ⚠️ Crypto key encryption audit

---

## Performance Notes

- ✅ Dynamic imports for Leaflet
- ❌ No `React.memo()` on any components
- ❌ No virtualization for long lists
- ⚠️ `useMemo` needed for filtered/sorted lists in PublicPlansClient.tsx

---

# Comprehensive 11-Phase Execution Plan

> Generated from full codebase audit (June 2026). Consolidates existing plans with new findings.

---

## ❌ Errors Found During Audit

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| **CRITICAL** | ESLint crashes on startup | `eslint.config.mjs` — reads `.next/` artifact despite `ignores` | Replace with proper `eslint-config-next` flat config |
| **HIGH** | All 6 API test suites fail | `__tests__/` — `Request`/`fetch`/`setImmediate` undefined in jsdom | Switch to `jest-environment-node`, add polyfills, test DB setup |
| **HIGH** | `bcrypt.compare()` called on empty password | `src/lib/auth.ts:61` — OAuth users crash on credentials login | Add `if (!user.password) return null` before compare |
| **MEDIUM** | Fire-and-forget Prisma write, silent `.catch(noop)` | `src/lib/auth.ts:163` — verification token may silently fail | Await or use proper queue |
| **MEDIUM** | No ESLint presets extended | `eslint.config.mjs` — no `@typescript-eslint`, no `eslint:recommended`, no `eslint-config-next` | Extend proper configs |
| **MEDIUM** | `session` typed as `any` | `src/components/MobileNav.tsx:26` | Add proper Session type import |
| **MEDIUM** | `CustomEvent` lacks generic param | `src/components/Header.tsx:90` — `e.detail` is `any` | Add `CustomEvent<{ traveling: boolean }>` |
| **LOW** | 166+ `any` type usages | Primarily API `where: any = {}` patterns | Enable `@typescript-eslint/no-explicit-any`, fix all |
| **LOW** | Duplicate notification button | `src/components/Header.tsx` — bell icon rendered twice | Refactor into single conditional render |
| **LOW** | Unnecessary `as any` cast | `src/components/MobileNav.tsx:122` — `walletRequired` already on type | Remove cast |
| **LOW** | Middleware deprecation warning | Next.js 16 — `middleware.ts` → rename to `proxy.ts` | Rename per Next.js convention |

---

## Phase 1: Fix the Breaks (Day 1)

### 1.1 Fix ESLint
- Replace bare `eslint.config.mjs` with proper `eslint-config-next` flat config
- Add `@typescript-eslint` plugin
- Ensure `.next/` is properly ignored
- Enable: `@typescript-eslint/no-explicit-any: error`, `no-unused-vars: error`, `react-hooks/exhaustive-deps: warn`

### 1.2 Fix Test Environment
- API tests: switch to `jest-environment-node`
- Add `node-fetch`/`undici` polyfills for `fetch`/`Request`
- Add global `setImmediate` polyfill for Prisma
- Create test DB setup: SQLite in-memory + automated migration before suite
- Add proper user/plan seeding for FK constraint tests

### 1.3 Fix Auth Crashes
- `src/lib/auth.ts:61` — guard `bcrypt.compare` with `if (!user.password) return null`
- `src/lib/auth.ts:163` — convert fire-and-forget to awaited or queued operation

### 1.4 Fix Middleware Deprecation
- Rename `middleware.ts` → `proxy.ts` per Next.js 16 guide
- Update `next.config.js` if needed

### 1.5 Fix Type Safety Gaps
- `MobileNav.tsx:26` — replace `session: any` with typed Session
- `Header.tsx:90` — add `CustomEvent<{ traveling: boolean }>`
- `MobileNav.tsx:122` — remove unnecessary `as any`

---

## Phase 2: Foundation & Infrastructure (Days 2-3)

### 2.1 Unified API Response Envelope
- Create `src/lib/api-helpers.ts`:
  ```typescript
  apiResponse<T>(data: T, status?: number, metadata?: Metadata)
  apiError(message: string, status: number)
  withAuth(handler: (req, session, params) => Promise<Response>)
  requireAdmin(session): null | { error, status }
  withValidation(schema, handler)
  ```
- Refactor all ~170 API routes to use `{ success, data, error, metadata }` envelope
- Frontend fetch helpers: `apiGet<T>(), apiPost<T>(), apiPut<T>(), apiDelete<T>()` that parse envelope and throw on `!success`

### 2.2 Service Layer
- Extract business logic from API routes:
  - `src/services/planService.ts` — CRUD, status updates, join/leave, contributions
  - `src/services/productService.ts` — CRUD, publish, search, filter by hashtag
  - `src/services/requestService.ts` — CRUD, approve/reject, fulfillments, support
  - `src/services/eventService.ts` — CRUD, join/leave, ticketing, volunteer roles
  - `src/services/userService.ts` — profile CRUD, links, donations, locations
  - `src/services/messageService.ts` — send, conversations, unread counts
  - `src/services/hashtagService.ts` (expanded) — extract, link, trending, search across ALL entities
  - `src/services/notificationService.ts` — create, stream, mark read
  - `src/services/walletService.ts` — balance, transactions, escrow
- API routes become thin HTTP handlers calling service methods

### 2.3 Centralized Types
- `src/types/Product.ts` — Product, ProductHashtag, ProductFilters
- `src/types/Plan.ts` — Plan, PlanJoiner, PlanUpdate, PlanStatus
- `src/types/Event.ts` — Event, EventJoiner, EventTicket, EventCategory
- `src/types/Request.ts` — Request, RequestFulfillment, RequestStatus
- `src/types/User.ts` — User, UserLink, DonationAddress, UserLocation
- `src/types/Group.ts` — Group, GroupMember, GroupPost
- `src/types/SchoolContent.ts` — SchoolContent, CurriculumNode, ContentType
- `src/types/Hashtag.ts` — Hashtag, EntityHashtag, TrendingHashtag
- `src/types/Notification.ts` — Notification, NotificationType
- `src/types/Api.ts` — ApiResponse<T>, PaginatedResponse<T>, Metadata

### 2.4 Error Boundaries
- Create `<ErrorBoundary>` component
- Wrap: dashboard layout, marketplace layout, community layout, profile layout, hashtag pages, search results

### 2.5 Database Transactions
- Identify all multi-step operations (order creation, wallet transfers, event join/leave, escrow release)
- Wrap in `prisma.$transaction()` with rollback on any failure

---

## Phase 3: Universal Hashtags + Discovery (Days 3-4)

### 3.1 New Prisma Models
```prisma
model SchoolContentHashtag {
  schoolContentId String
  schoolContent   SchoolContent @relation(fields: [schoolContentId], references: [id], onDelete: Cascade)
  hashtagId       String
  hashtag         Hashtag       @relation(fields: [hashtagId], references: [id], onDelete: Cascade)
  @@unique([schoolContentId, hashtagId])
}

model PlanHashtag {
  planId    String
  plan      Plan    @relation(fields: [planId], references: [id], onDelete: Cascade)
  hashtagId String
  hashtag   Hashtag @relation(fields: [hashtagId], references: [id], onDelete: Cascade)
  @@unique([planId, hashtagId])
}

model RequestHashtag {
  requestId String
  request   Request @relation(fields: [requestId], references: [id], onDelete: Cascade)
  hashtagId String
  hashtag   Hashtag @relation(fields: [hashtagId], references: [id], onDelete: Cascade)
  @@unique([requestId, hashtagId])
}

model GroupHashtag {
  groupId   String
  group     Group   @relation(fields: [groupId], references: [id], onDelete: Cascade)
  hashtagId String
  hashtag   Hashtag @relation(fields: [hashtagId], references: [id], onDelete: Cascade)
  @@unique([groupId, hashtagId])
}
```

### 3.2 HashtagService Expansion
- `extractAndLinkHashtags(text, entityType, entityId)` — works for ALL 9 entity types
- `linkHashtags(entityType, entityId, tagStrings[])` — explicit tag linking
- `removeHashtags(entityType, entityId)` — remove all links for re-index
- `getTrendingHashtags(days, limit, entityType?)` — unified across all entities
- `searchHashtags(query, limit)` — autocomplete search
- Embed extraction in: plan create/update, request create/update, school content create/update, group create/update

### 3.3 HashtagInput Component
- Autocomplete text input with debounced search
- Trending/suggested hashtags dropdown
- Selected hashtags shown as removable pills
- Returns `string[]` for form submission
- Embed in: PlanDetailClient, RequestClient, SchoolContent forms, Group forms, QuickCreateModal

### 3.4 Hashtag API Expansion
- `GET /api/hashtags?search=` — search across all types
- `GET /api/hashtags?mode=trending&entity=plans|requests|groups|schoolContent|services` — filtered trending
- `GET /api/hashtags/[tag]` — detail response includes counts for all 9 entity types + filtered results

### 3.5 Hashtag Page Expansion
- `/hashtag/[tag]` — add tabs: Posts, Products, Events, School Content, Plans, Requests, Groups, Forum Posts, Services
- Card components for each entity type with consistent styling
- Related hashtags sidebar
- `/hashtags` browse page — search, filter by entity type, alphabetical index

### 3.6 Search Enhancement
- Prefix `#` triggers hashtag-first search with entity counts
- Type filters with entity counts (including all hashtagged entities)
- Keyboard navigation (arrow keys + enter) in search results
- Quick actions per result ("Edit", "Share", "View")
- Search history (localStorage, recent 20 searches)

---

## Phase 4: Backlinking + Social Sharing (Days 4-5)

### 4.1 Backlink System
- New Prisma model:
  ```prisma
  model Backlink {
    id           String   @id @default(cuid())
    sourceType   String
    sourceId     String
    targetType   String
    targetId     String
    relationType String   @default("REFERENCES") // REFERENCES | CONTAINS | RELATES_TO | PROMOTES
    @@index([sourceType, sourceId])
    @@index([targetType, targetId])
    @@index([sourceType, sourceId, targetType, targetId], unique: true)
  }
  ```
- API: `POST /api/reference` — create backlink, `GET /api/reference/[type]/[id]` — get all links for entity
- Auto-generate "Related Items" section on every entity detail page
- Manual linking UI: "Link to..." button in editors with entity search
- Display both incoming and outgoing links
- Optional graph visualization

### 4.2 Universal ShareBar Component
- Replace all 4 separate share modals with one `ShareBar`
- Detects entity type from page context or props
- Always available: Copy Link, Share to Feed (creates backlinked post), QR Code
- Social share: X, Facebook, LinkedIn, Telegram, WhatsApp, Email
- Fediverse share option for federated users
- Share count tracking per entity
- Embed on: all entity detail pages, profile, post, product, event, plan, request, school content

### 4.3 Cross-Posting Engine
- Create post → offer cross-post to Wall + Shop + School + Group + Forum simultaneously
- "Share this [entity] to..." menu on every entity action bar
- Repost/Share entity creates a backlinked post in the feed automatically

---

## Phase 5: Federation / ActivityPub (Days 5-7)

### 5.1 Complete Fediverse Routes
- Routes already exist at `/.well-known/webfinger`, `/.well-known/nodeinfo`, `/api/fediverse/actor/[username]`, `/api/fediverse/inbox`, `/api/fediverse/outbox/[userId]`, `/api/fediverse/nodeinfo/2.1`, `/api/cron/deliver-fediverse`
- **Key gaps to close:**
  - User RSA key generation on registration (already in `src/lib/federation.ts`)
  - Store `federatedUrl`, `privateKey`, `publicKey` on User model
  - Add `Follow` model and route handlers for local + remote follow management
  - Wire inbox to process incoming activities (Follow → notify, Accept → update, Like → increment, Announce → boost)
  - Wire outbound cron to actually deliver queued activities
  - Add `Follow`/`Unfollow` UI on profile pages

### 5.2 Federation UI
- Profile: show federated handle (`@username@xistrymemz.xyz`), follower/following counts
- Follow/unfollow buttons (works for local + remote)
- Admin: fediverse settings page (relay URL, blocklist, instance description for NodeInfo)
- Remote user profile display (basic info from ActivityPub Person object)

### 5.3 Outbound Delivery Queue Reliability
- Proper retry logic with exponential backoff (max 3 retries)
- Stale activity cleanup (delete > 7 days old)
- Monitoring: delivery success rate, pending queue size

### 5.4 Incoming Activity Security
- HTTP Signature verification using remote actor's `publicKey`
- Activity dedup via `InboxActivity.activityId` unique constraint
- Reject activities older than 24h
- Rate-limit follow requests per remote actor (10/min)
- Sanitize HTML in incoming `Note.content` (strip `<script>`, disallowed tags)

---

## Phase 6: Navigation & Layout Overhaul (Days 6-7)

### 6.1 ERP-Style Sidebar
- Collapsible icon-only mode (toggle button)
- Section grouping by domain:
  - **Workspace**: Dashboard/Overview, Studio, Plans, Requests
  - **Commerce**: Marketplace, Shop, Services, Rentals
  - **Social**: Community, Messages, Groups, Events
  - **Learn**: Schools, Directory
  - **Finance**: Wallet, Orders, Offers
  - **Admin** (role-gated)
- Hashtag nav item: quick access to `/hashtags` from sidebar + header search
- Unread badges on Messages, Notifications

### 6.2 Unified Breadcrumbs
- Auto-generate from route segments
- Ensure ALL pages have breadcrumbs (currently missing on many sub-pages)
- Responsive: collapse to show only last 2 levels on mobile

### 6.3 Mobile Navigation
- Bottom nav bar: Home, Feed, Create (FAB), Messages, Profile
- All interactive elements ≥44px touch targets
- Bottom nav hides on keyboard open (prevents overlap)

### 6.4 Global Command Palette
- `Cmd+K` / `Ctrl+K` opens modal
- Unified search across ALL entities + hashtags + pages
- Context actions per result: View, Edit, Share, Delete
- Keyboard navigation with arrow keys
- Recent searches and quick links

### 6.5 Navigation Cleanup
- Remove duplicate entry points (`/plans/public` → redirect to `/projects`)
- Remove `Dashboard` label from items already in dashboard sections
- Progressive nav loading (lazy-load heavy sections)
- Hide admin UI from non-admin users

---

## Phase 7: UI/UX Consistency (Days 7-9)

### 7.1 Component Library Standardization
- Refactor ALL components to use existing `ui/` primitives:
  - `ui/Button` — replace all `.btn-primary`, `.btn-secondary` class usage
  - `ui/Card` — standardize card patterns
  - `ui/Modal` — replace all modal overlays
  - `ui/Badge` — status/type badges
  - `ui/Avatar` — user images with fallback
- Remove ALL inline `style={{}}` React props → CSS modules or design tokens
- Audit all pages for consistent padding `--space-6`, card grid `auto-fill minmax`, responsive breakpoints

### 7.2 Loading States
- Create `Skeleton` component with variants: `card`, `list`, `text`, `avatar`, `chart`
- Replace all `<div>Loading...</div>` with contextual `<Skeleton />`
- Skeleton layouts for: product grids, member lists, content lists, message conversations, hashtag clouds, dashboards

### 7.3 Empty States
- Create `<EmptyState>` component with props: `icon`, `title`, `description`, `action` (label + href/onClick)
- Replace all `<div>No results</div>` / `<div>No items found</div>` with contextual `<EmptyState>`
- Empty states for: no plans, no requests, no messages, no products, no search results, no notifications

### 7.4 Toast Notifications
- Consistent toast for ALL CRUD operations:
  - Create: "Plan created successfully" (green)
  - Update: "Profile updated" (blue)
  - Delete: "Post deleted" (red)
  - Error: "Failed to save" (red)
- Auto-dismiss after 3-5s
- Stack multiple toasts

### 7.5 ConfirmDialog
- For all destructive actions: delete plan, delete product, delete post, unpublish, remove connection, leave group
- Props: `title`, `message`, `confirmLabel`, `confirmVariant` (danger/secondary), `onConfirm`, `onCancel`
- Keyboard: Enter confirms, Escape cancels

### 7.6 Error Handling UX
- Wrap every page section with `<ErrorBoundary>` (fallback: "Something went wrong" + retry button)
- API error toasts for all failed mutations
- Form-level validation errors displayed inline below fields
- Network errors: "Connection lost. Retrying..." with auto-retry indicator

### 7.7 Visual Polish
- Card hover: subtle scale(1.02) + border glow with `--shadow-glow`
- Button active: scale(0.97)
- Page transitions: fade-in on route change (CSS `@keyframes fadeIn`)
- Hashtag click: subtle ripple animation
- Success actions: checkmark animation on save

---

## Phase 8: School Content Customization (Days 8-10)

### 8.1 Rich Content Engine
- **Curriculum builder UI**: Module → Lesson → Topic hierarchy with drag-and-drop reorder
- **Content types**: `article`, `video`, `course`, `quiz`, `worksheet`, `resource`, `assignment`
- **Rich text editor**: Bold, italic, headings, lists, code blocks, image/video embeds (via existing `RichEditor`)
- **Progress tracking**: Lesson completion checkbox per student, overall progress percentage
- **Prerequisites**: Dependency chain between content items (must complete A before B)
- **Drip-feed**: Schedule content release dates

### 8.2 Hashtags on School Content
- Extract hashtags from title + content on create/update
- Display hashtag pills on content cards + detail view
- Filter school content by hashtag on `/schools` browse page
- Include school content in trending hashtags API

### 8.3 Student Management
- Enrolled students list per school (with progress %)
- Progress detail per student (which lessons completed, quiz scores)
- Completion certificates (generate PDF or shareable badge)
- Messaging: bulk message all enrolled students

### 8.4 School Setup Enhancements
- Content type presets selection during setup
- Pricing model: per-content / subscription / bundle
- Category + hashtag suggestions on setup
- Sample content templates with hashtags pre-filled

---

## Phase 9: Dashboard as ERP Hub (Days 9-11)

### 9.1 Unified Inbox
- Single section showing: Notifications + Unread Messages + Pending Requests + Connection Requests
- Grouped by type with expand/collapse
- "Mark all read" action
- Count badges per section

### 9.2 Cross-Module Quick Actions
- "Create Plan with Product" → opens plan form with product pre-linked
- "Add Event to Group" → opens event form with group pre-selected
- "Create Request for Plan" → opens request form with plan pre-linked
- "Create Post about [entity]" → opens post form with entity referenced

### 9.3 Dashboard Widgets
- **Hashtag widget**: Trending hashtags relevant to user's content + plan/products
- **Recent activity**: Across ALL modules (plans, products, posts, events, school content, messages)
- **Progress widgets**: Plan completion % (from milepost status), content publishing queue, upcoming appointments, shop orders
- **Analytics**: Total views, total likes, total tips this week/month
- **Drag-and-drop widget layout**: User customizable (save layout preference to User model)

### 9.4 Unified Directory Page
- `/directory` — tabs: Members, Schools, Groups, School Content, Services, Rentals
- Unified filter bar: category + location + hashtag + sort
- Map view for all geotagged entities (members, events, shops, services, rentals)
- Alphabetical index for each entity type

### 9.5 Smart Cross-Linking
- Suggest related Plans/Products/Courses when creating a Request
- Suggest recent entities with same hashtags when creating content
- "Quick Link" button in every editor with entity search + hashtag suggestions

---

## Phase 10: Onboarding & Help (Days 10-11)

### 10.1 Enhanced Onboarding Flow
- **Step 1 — Welcome**: platform video, value prop carousel showing hashtags, backlinking, discovery
- **Step 2 — Profile**: interest tags → auto-converted to hashtag follows
- **Step 3 — Class Setup**: role-specific guided tours (Teacher sees school features, Shopkeeper sees marketplace)
- **Step 4 — Tour**: interactive clickable hotspots explaining key features + "What are hashtags?"
- **Step 5 — Community**: pre-follow suggested members + suggested groups by interest hashtags
- **Step 6 — Complete**: auto-create "Getting Started" plan with pre-filled milestones + hashtags

### 10.2 Contextual Help System
- Inline `(?)` tooltips on complex form fields (especially hashtag input, donation addresses, escrow)
- Guided tours per module: "Tour Dashboard", "Tour Marketplace", "Tour Schools", "Tour Hashtags"
- Dedicated help section explaining how hashtags connect content across the platform
- Help drawer: slide-out panel with relevant articles based on current page

### 10.3 First-Use Triggers
- First plan created → Show sharing dialog with hashtag suggestions + backlink options
- First product listed → "Add hashtags to get discovered!" prompt
- First content published → School customization tips with hashtag prompt
- First connection → Messaging feature highlight
- First hashtag used → Show related content discovery

---

## Phase 11: Polish & Performance (Days 11-12)

### 11.1 CSS Audit & Cleanup
- Remove duplicate declarations between `globals.css`, `design-system.css`, and component modules
- Merge color/spacing/typography vars — single source in `design-system.css`
- Remove Tailwind-like utility classes from `globals.css` (or standardize)
- Standardize naming conventions: module CSS for components, `design-system.css` for tokens, `globals.css` for reset/base
- Document convention in README

### 11.2 Performance Optimization
- `React.memo()` on: ProductCard, MemberCard, MessageBubble, PostCard, EventCard, SharedItemCard
- `useMemo` on: filtered/sorted lists (PublicPlansClient, EventsPage, ProductsClient, CommunityMembers)
- `useCallback` on: event handlers passed as props to child components
- Virtualization for long lists: members page, feed, product grid, notifications
- Dynamic imports for heavy deps: Leaflet map, RichEditor, emoji-picker-react, QRCode, video chat
- Lazy load images below the fold

### 11.3 Accessibility
- Keyboard navigation: all interactive elements focusable and activatable with Enter/Space
- `aria-*` attributes: labels on icon buttons, roles on nav/menu/dialog, live regions for dynamic content
- Focus management: trap focus in modals/drawers, return focus on close
- Screen reader testing: forms announce errors, dynamic content announces updates
- Color contrast: verify all text meets WCAG AA (4.5:1 normal, 3:1 large)
- Reduce motion: respect `prefers-reduced-motion` (already partially done)

### 11.4 Security Hardening
- File upload: validate MIME type (images: JPEG/PNG/WebP/GIF, documents: PDF), max file size (10MB), scan for malware
- Input sanitization: strip HTML tags from text inputs (XSS prevention via DOMPurify)
- CORS: configure strict `Access-Control-Allow-Origin` in middleware for API routes
- Crypto keys: encrypt stored private keys at rest (PostgreSQL pgcrypto or AES-256-GCM)
- Rate limiting: extend from middleware to sensitive API routes (auth, contact, upload)

### 11.5 Testing Expansion
- Fix existing 6 API test suites (Phase 1)
- Add React Testing Library tests for: Button, Card, Modal, Badge, Avatar, Breadcrumbs, Pagination, EmptyState
- Add hook tests for: `useCart`, `useToast`, `useSiteSettings`, `useEntityActions`
- Add integration tests for: plan CRUD flow, request approve/reject flow, message send/read flow
- Target: 60%+ coverage on critical paths (auth, plans, requests, messages, products)
- Add test DB setup script: `npm run db:test` with in-memory SQLite + seed data

---

## Effort Summary

| Phase | Days | Dependencies | Key Deliverables |
|-------|------|-------------|------------------|
| **P1: Fix Breaks** | 1 | None | ESLint working, tests passing, no auth crashes, no type errors |
| **P2: Foundation** | 2 | P1 | api-helpers, service layer, centralized types, error boundaries |
| **P3: Hashtags** | 2 | P2 | 4 new Prisma models, hashtag service, input component, page expansion |
| **P4: Backlinking** | 2 | P2-P3 | Backlink model, ShareBar component, cross-posting |
| **P5: Federation** | 3 | P2 | ActivityPub endpoints live, follow UI, delivery queue, security |
| **P6: Navigation** | 2 | P1 | ERP sidebar, breadcrumbs, command palette, mobile nav |
| **P7: UI/UX** | 3 | P6 | Component library consistency, skeletons, empty states, toasts, polish |
| **P8: School** | 3 | P2-P3 | Curriculum builder, progress tracking, student management |
| **P9: Dashboard** | 3 | P2-P4 | Unified inbox, widgets, directory, smart linking |
| **P10: Onboarding** | 2 | P3 | Enhanced flow, contextual help, first-use triggers |
| **P11: Polish** | 2 | All above | CSS audit, performance, a11y, security, tests |

**Total: ~25 days**

---

## Quick Wins (Parallelizable, < 1 day each)

1. Fix ESLint config → proper flat config with presets
2. Add `if (!user.password) return null` in auth.ts
3. Replace `Loading...` text with `<Skeleton />` across all pages
4. Add `<ErrorBoundary>` to dashboard/layout.tsx
5. Replace all empty state `<div>No results</div>` with `<EmptyState>`
6. Add `extractHashtags` to school content + plans + requests API routes (backend only)
7. Standardize breadcrumbs on pages that are missing them
8. "Share to Feed" button on every entity detail page (already have modal patterns)
9. Fix MobileNav `session: any` type
10. Fix Header `CustomEvent` generic type

