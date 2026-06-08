# Development Priority List

> **v2.0 — Updated from full codebase audit (June 2026).** Reflects actual completion state after initial implementation pass.
> **Execution strategy**: All passes follow the 7-step cycle in `.opencode/plans/pass-playbook.md`.

---

## ✅ Completed Items

### From Session Plans (`.opencode/plans/`)
| Item | Status |
|------|--------|
| Footer UI restructured (`.bottomBuiltWith`, version badge) | ✅ |
| CRYPTO_LOGOS → `src/lib/constants.ts` (used in 12 files) | ✅ |
| Shops layout auth gate removed (public layout w/ breadcrumbs) | ✅ |
| Schools layout auth gate removed (public layout w/ breadcrumbs) | ✅ |
| Products API: `{ products: [...] }` envelope + `pinned` filter + `shopSlug` include | ✅ |
| Products page: handles `data.products` envelope gracefully | ✅ |
| Home page modular refresh (PulseSection, animated stats, requests, plans, events, boards, trending hashtags) | ✅ |
| Donation DnD reorder (`handleReorderDonations`, drag handles, index params) | ✅ |
| FIRO logo PNG at `public/crypto-logos/firo.png` | ✅ |

### From Priority Plan — Phase 1 (Fix Breaks)
| Item | Status |
|------|--------|
| ESLint flat config: `eslint-config-next`, `@typescript-eslint`, proper `ignores`, strict rules | ✅ |
| Auth bcrypt guard: `if (!user.password) return null` at line 59 | ✅ |
| MobileNav `session` typed as `Session \| null` | ✅ |
| Header `CustomEvent<{ traveling: boolean }>` generic param | ✅ |

### From Priority Plan — Phase 2 (Foundation)
| Item | Status |
|------|--------|
| `<ErrorBoundary>` component (class-based, with fallback + onError props) | ✅ |
| Centralized types: `src/types/` with 11 files (Api, Plan, Product, Event, Request, User, Group, Hashtag, Notification, Service, next-auth) | ✅ |
| Service layer: `src/services/` with 5 services (plan, message, backlink, hashtag, backup) | ✅ |

### From Priority Plan — Phase 3 (Universal Hashtags)
| Item | Status |
|------|--------|
| 4 Prisma junction models: `SchoolContentHashtag`, `PlanHashtag`, `RequestHashtag`, `GroupHashtag` | ✅ |
| `HashtagInput` component + `.module.css` (autocomplete, trending suggestions, removable pills) | ✅ |
| `hashtagService.ts` with centralized extraction/linking methods | ✅ |

### From Priority Plan — Phase 4 (Backlinking)
| Item | Status |
|------|--------|
| Backlink Prisma model (with indexes + unique constraint) | ✅ |
| `backlinkService.ts` | ✅ |

### From Priority Plan — Phase 5 (Federation)
| Item | Status |
|------|--------|
| Fediverse API endpoints: `actor/[username]`, `inbox`, `outbox/[userId]`, `nodeinfo/2.1` | ✅ |

### From Priority Plan — Phase 7 (UI/UX)
| Item | Status |
|------|--------|
| `<Skeleton>` component + `SkeletonCard` export | ✅ |
| `<EmptyState>` component (icon, title, description, action) | ✅ |
| `<ConfirmDialog>` component (danger/warning/default variants, keyboard support) | ✅ |
| `ToastContext` (success/error/warning/info, auto-dismiss, stacking) | ✅ |

### From Priority Plan — Phase 10 (Onboarding)
| Item | Status |
|------|--------|
| 6-step onboarding flow: Welcome → Profile → Class Setup → Tour → Community → Complete | ✅ |

### From Priority Plan — Phase 11 (Polish)
| Item | Status |
|------|--------|
| `design-system.css` (160+ lines, comprehensive tokens) | ✅ |
| `useMemo` used 43 times across 17+ files (PublicPlansClient, EventsPage, ProductsClient, DirectoryPage, etc.) | ✅ |

---

## ⏳ Remaining Work

---

## Phase 1: Fix Remaining Breaks (~3 hrs)

### 1.1 Middleware Deprecation
- **Status**: ❌ Cancelled — not needed in Next.js 16 (build confirms `ƒ Proxy (Middleware)` works correctly)

### 1.2 Fix Test Environment
- **Location**: `jest.config.js`, `__tests__/setup.ts`
- **Issue**: `testEnvironment: 'jsdom'` — API tests need node environment; missing `fetch`/`Request`/`setImmediate` polyfills
- **Fix**: Switch to `jest-environment-node`, add `node-fetch`/`undici`, add `setImmediate` polyfill for Prisma, create test DB setup

### 1.3 Fix Fire-and-Forget Prisma Writes
- **Location**: `src/lib/auth.ts:192,210`
- **Issue**: Two `.catch(() => {})` — `connection.create` on OAuth signup, `emailSubscriber.upsert` on registration — silently swallow errors
- **Fix**: ✅ Done — converted to `.catch((err) => console.error(...))` with proper logging, kept non-blocking

### 1.4 Deduplicate Notification Button
- **Location**: `src/components/Header.tsx:534-545`
- **Issue**: Bell icon rendered twice (with/without badge) in mutually exclusive conditionals
- **Fix**: ✅ Done — refactored into single `isAuthenticated` guard with conditional badge

### 1.5 Audit `any` Types (Ongoing)
- **Location**: `src/app/api/` (7 files flagged)
- **Issue**: Typed `where` clauses still use `Record<string, unknown>`
- **Fix**: Add proper typed interfaces per route

### 1.6 React.memo() — Card Components
- **Location**: `ProductCard.tsx`, `SharedItemCard.tsx`, `ServiceCard.tsx`, `BoardPinCard.tsx`
- **Status**: ✅ Done (EventCard/PostCard/MemberCard/MessageBubble are inline markup, not dedicated components)

### 1.7 Loading... → Skeleton (Full Pass)
- **Phase 1 batch**: 9 user-facing pages (events/[id], products/[id], profile/[username], groups/[id], shops, offers/[id], services/[id], checkout, school/[slug]/content/[id]) — ✅ Done
- **Phase 2 batch**: 8 dashboard pages (marketplace, passport, rentals, services, teaching, video, shop, saved) — ✅ Done
- **Phase 3 batch**: 5 admin pages (orders, wallets, subscribers, invite-codes, messages) — ✅ Done
- **Phase 4 batch**: School/shop/courier setup, wallet, schools list, onboarding, forum, community layout, AvailabilityEditor — ✅ Done
- **Total**: ~32 of ~38 instances replaced. 6 remain (3 Suspense fallbacks in auth + events-new + groups-new, loading component default, profile load-more button)

---

## Phase 2: Complete Foundation & Infrastructure (2-3 days)

### 2.1 Unified API Response Envelope
- **New file**: `src/lib/api-helpers.ts`
- **Helpers**: `apiResponse<T>()`, `apiError()`, `withAuth()`, `requireAdmin()`, `withValidation()`
- **Frontend**: `apiGet<T>()`, `apiPost<T>()`, `apiPut<T>()`, `apiDelete<T>()` — parse `{success, data, error}` and throw on failure
- **Scale**: Refactor ~60 API routes to use standard envelope

### 2.2 Missing Services (6 files)
- **Create**: `productService.ts`, `requestService.ts`, `eventService.ts`, `userService.ts`, `notificationService.ts`, `walletService.ts`
- **Goal**: Extract business logic from API routes; routes become thin HTTP handlers

### 2.3 Database Transactions
- **Affected**: Order creation, wallet transfers, event join/leave, escrow release
- **Fix**: Wrap multi-step ops in `prisma.$transaction()` with rollback

---

## Phase 3: Universal Hashtags — ✅ Complete
> All 4 junction models, HashtagInput component, hashtagService, API expansion. No work remaining.

---

## Phase 4: Complete Backlinking + Social Sharing (1.5-2 days)

### 4.1 Universal ShareBar Component
- **New file**: `src/components/ShareBar.tsx`
- **Replace**: 4 separate share modals (currently in `EntityActions.tsx`, `shop/[slug]/page.tsx`, etc.)
- **Features**: Copy Link, Share to Feed (creates backlinked post), QR Code, social share (X, Facebook, LinkedIn, Telegram, WhatsApp, Email, Fediverse)
- **Embed**: All entity detail pages, profile, post, product, event, plan, request, school content

### 4.2 Auto-Generated Related Items
- Backend: Query backlinks for entity → frontend section on every detail page
- Display: Incoming + outgoing links with entity cards

### 4.3 Manual Linking UI
- "Link to..." button in content editors with entity search + keyboard nav

### 4.4 Cross-Posting Engine
- Create post → offer cross-post to Wall + Shop + School + Group + Forum
- Repost/Share entity creates backlinked post automatically

---

## Phase 5: Complete Federation / ActivityPub (2-3 days)

### 5.1 User Key Generation on Registration
- Wire `src/lib/federation.ts` key gen into signup flow
- Store `federatedUrl`, `privateKey`, `publicKey` on User model

### 5.2 Follow Model + Route Handlers
- Create `Follow` Prisma model or confirm existing schema
- Implement local + remote follow management
- Add Follow/Unfollow UI on profile pages

### 5.3 Wire Inbox Processing
- Incoming Follow → create notification
- Incoming Accept → update follow status
- Incoming Like → increment local counter
- Incoming Announce → create boost post

### 5.4 Wire Outbound Delivery Cron
- `/api/cron/deliver-fediverse` — actually deliver queued activities
- Retry with exponential backoff (max 3)
- Stale activity cleanup (> 7 days old)

### 5.5 Federation UI
- Profile: federated handle (`@user@domain`), follower/following counts
- Admin: fediverse settings page (relay URL, blocklist, instance description)
- Remote user profile display (from ActivityPub Person object)

### 5.6 Security
- HTTP Signature verification
- Activity dedup via `activityId` unique constraint
- Reject activities older than 24h
- Rate-limit follows (10/min per remote actor)
- Sanitize HTML in incoming content

---

## Phase 6: Navigation & Layout Overhaul (2 days)

### 6.1 Global Command Palette
- **New file**: `src/components/CommandPalette.tsx`
- `Cmd+K` / `Ctrl+K` opens modal
- Unified search across ALL entities + hashtags + pages
- Context actions per result: View, Edit, Share, Delete
- Keyboard navigation with arrow keys
- Recent searches (localStorage)

### 6.2 ERP-Style Sidebar
- Collapsible icon-only mode
- Section grouping: Workspace, Commerce, Social, Learn, Finance, Admin (role-gated)
- Hashtag nav item, unread badges

### 6.3 Mobile Bottom Navigation
- Icons: Home, Feed, Create (FAB), Messages, Profile
- ≥44px touch targets, hides on keyboard open

### 6.4 Unified Breadcrumbs
- Auto-generate from route segments
- Ensure ALL pages have breadcrumbs
- Responsive: collapse to last 2 levels on mobile

### 6.5 Navigation Cleanup
- Remove duplicate entry points (`/plans/public` → redirect to `/projects`)
- Hide admin UI from non-admin users
- Progressive nav loading (lazy-load heavy sections)

---

## Phase 7: UI/UX Consistency (2 days)

### 7.1 Component Library Standardization
- Refactor ALL components to use `ui/Button`, `ui/Card`, `ui/Modal`, `ui/Badge`, `ui/Avatar`
- Remove ALL inline `style={{}}` → CSS modules or design tokens
- Consistent padding `--space-6`, card grid `auto-fill minmax`

### 7.2 Loading States
- Replace all remaining `<div>Loading...</div>` with `<Skeleton />`
- Skeleton variants for: product grids, member lists, content lists, messages, hashtag clouds, dashboards

### 7.3 Empty States
- Replace all remaining `<div>No results</div>` / `<div>No items found</div>` with `<EmptyState>`
- Contextual icon + action button

### 7.4 Toast Coverage
- Consistent toasts for ALL CRUD operations across every page
- Green (create), blue (update), red (delete/error), yellow (warning)

### 7.5 ConfirmDialog for Destructive Actions
- Hook up to: delete plan, delete product, delete post, unpublish, remove connection, leave group

### 7.6 Micro-interactions
- Card hover: scale(1.02) + border glow
- Button active: scale(0.97)
- Page transitions: CSS `@keyframes fadeIn`
- Success checkmark animation

---

## Phase 8: School Content Customization (2-3 days)

### 8.1 Rich Content Engine
- **Curriculum builder**: Module → Lesson → Topic hierarchy with drag-and-drop
- **Expanded types**: article, video, course, quiz, worksheet, resource, assignment
- **Progress tracking**: Lesson completion checkbox, overall % per student
- **Prerequisites**: Dependency chain between content items
- **Drip-feed**: Scheduled content release dates

### 8.2 Hashtags on School Content
- (Backend extraction is done via `hashtagService.ts`)
- Display hashtag pills on content cards + detail view
- Filter school content by hashtag on `/schools`
- Include in trending hashtags API

### 8.3 Student Management
- Enrolled students list per school (with progress %)
- Progress detail per student (lessons completed, quiz scores)
- Completion certificates (PDF or shareable badge)
- Bulk message all enrolled students

---

## Phase 9: Dashboard as ERP Hub (2 days)

### 9.1 Unified Inbox
- Single section: Notifications + Unread Messages + Pending Requests + Connection Requests
- Grouped by type, expand/collapse, "Mark all read"

### 9.2 Cross-Module Quick Actions
- "Create Plan with Product", "Add Event to Group", "Create Request for Plan", "Create Post about entity"

### 9.3 Dashboard Widgets
- Hashtag widget (trending tags relevant to user's content)
- Recent activity across ALL modules
- Progress widgets (plan %, content queue, shop orders, appointments)
- Analytics (total views, likes, tips this week/month)

### 9.4 Expand Unified Directory
- **Missing tabs**: Members, Schools, Groups, School Content
- **Unified filter**: category + location + hashtag + sort
- **Map view**: all geotagged entities
- **Alphabetical index**: per entity type

### 9.5 Smart Cross-Linking
- Suggest related entities when creating Requests/content
- "Quick Link" button in every editor with entity search + hashtag suggestions

---

## Phase 10: Onboarding & Help (1-1.5 days)

### 10.1 Contextual Help System
- Inline `(?)` tooltips on complex form fields (hashtag input, donation addresses, escrow)
- Guided tours per module: "Tour Dashboard", "Tour Marketplace", "Tour Schools", "Tour Hashtags"
- Help drawer: slide-out panel with relevant articles based on current page

### 10.2 First-Use Triggers
- First plan created → sharing dialog with hashtag suggestions + backlink options
- First product listed → "Add hashtags to get discovered!" prompt
- First content published → school customization tips
- First connection → messaging feature highlight
- First hashtag used → related content discovery

---

## Phase 11: Polish & Performance (2 days)

### 11.1 CSS Audit & Cleanup
- Remove duplicate declarations between `globals.css`, `design-system.css`, and component modules
- Merge color/spacing/typography vars into single source (`design-system.css`)
- Standardize naming conventions

### 11.2 Performance Optimization
- **`React.memo()`**: ProductCard, MemberCard, MessageBubble, PostCard, EventCard, SharedItemCard (0 instances currently)
- Virtualization for long lists: members page, feed, product grid, notifications
- Dynamic imports for heavy deps: Leaflet map, RichEditor, emoji-picker-react, QRCode, video chat
- Lazy load images below the fold (`loading="lazy"`)

### 11.3 Accessibility
- Keyboard navigation: all interactive elements focusable, activatable with Enter/Space
- `aria-*` attributes: labels on icon buttons, roles on nav/menu/dialog, live regions
- Focus management: trap in modals, return on close
- Color contrast: WCAG AA (4.5:1 normal, 3:1 large)
- `prefers-reduced-motion`

### 11.4 Security Hardening
- File upload: validate MIME type, max size (10MB)
- Input sanitization: DOMPurify for all text inputs
- CORS: strict `Access-Control-Allow-Origin` for API routes
- Crypto keys: encrypt stored private keys (AES-256-GCM)
- Rate limiting: extend to auth, contact, upload routes

### 11.5 Testing Expansion
- Fix existing 6 API test suites (Phase 1.2)
- RTL tests: Button, Card, Modal, Badge, Avatar, Breadcrumbs, Pagination, EmptyState
- Hook tests: `useCart`, `useToast`, `useSiteSettings`, `useEntityActions`
- Integration tests: plan CRUD, request approve/reject, message send/read
- Test DB setup: `npm run db:test` with in-memory SQLite + seed data

---

## Effort Summary

| Phase | Effort | Dependencies | Key Deliverables | Status |
|-------|--------|-------------|------------------|--------|
| **P1: Fix Breaks** | 3 hrs | None | middleware rename, tests fixed, fire-and-forget fixed, btn dedup | ⏳ 2 items pending (test env, any types) + 3 extra items done |
| **P2: Foundation** | 2-3 days | P1 | api-helpers, 6 missing services, $transaction | 🔄 Partial (5 of 11 services done) |
| **P3: Hashtags** | 0 | None | Already complete | ✅ Done |
| **P4: Sharing** | 1.5-2 days | P2 | ShareBar, Related Items, cross-posting | ⏳ |
| **P5: Federation** | 2-3 days | P2 | Key gen, follow UI, inbox/outbox wiring, security | 🔄 Routes done, logic pending |
| **P6: Navigation** | 2 days | None | Command palette, sidebar, mobile nav, breadcrumbs | ⏳ |
| **P7: UI/UX** | 2 days | P6 | Component standardization, loading/empty states, toasts | 🔄 Components exist, adoption pending |
| **P8: School** | 2-3 days | P2 | Curriculum builder, student management | ⏳ |
| **P9: Dashboard** | 2 days | P2, P7 | Unified inbox, widgets, directory expansion | 🔄 Directory partial, rest pending |
| **P10: Onboarding** | 1-1.5 days | None | Contextual help, first-use triggers | 🔄 Flow done, help system pending |
| **P11: Polish** | 2 days | P7 | React.memo, virtualization, a11y, security, tests | 🔄 design-system done, rest pending |

**Total remaining: ~17-22 days**

---

## Quick Wins (Parallelizable, < 1 day each)

1. ✅ Fix ESLint config → proper flat config with presets
2. ✅ Add `if (!user.password) return null` in auth.ts
3. ⏳ Rename `middleware.ts` → `proxy.ts`
4. ⏳ Convert 2 `.catch(() => {})` fire-and-forgets in auth.ts to awaited
5. ⏳ Deduplicate notification button in Header.tsx
6. ⏳ `React.memo()` on ProductCard + EventCard + PostCard (3 component files)
7. ⏳ Add `extractHashtags` extraction calls to plan/request/school content API routes (if not wired yet)
8. ⏳ "Share to Feed" button on every entity detail page
9. ✅ Fix MobileNav `session: any` type
10. ✅ Fix Header `CustomEvent` generic type
