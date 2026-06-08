# XistrYmemZ — Comprehensive Improvement Plan (Updated)

> **v2.0 — Refreshed from full codebase audit (June 2026).** Reflects actual completion state. Items marked ✅ are done; remaining work is phased below.
> **Execution strategy**: All passes follow the 7-step cycle in `.opencode/plans/pass-playbook.md`.

---

## Current State Assessment

### Hashtag Coverage

| Entity | Hashtag Model | API Extraction | Display | Searchable |
|--------|:---:|:---:|:---:|:---:|
| Posts | `PostHashtag` | ✅ | ✅ | ✅ |
| Forum Posts | `PostHashtag` (sourceType) | ✅ | ✅ | ✅ |
| Group Posts | `PostHashtag` (sourceType) | ✅ | ✅ | ✅ |
| Products | `ProductHashtag` | ✅ | ✅ | ✅ |
| Events | `EventHashtag` | ✅ | ✅ | ✅ |
| Services | `ServiceOfferingHashtag` | ✅ | ✅ | ✅ |
| **School Content** | ✅ `SchoolContentHashtag` | ✅ (via hashtagService) | 🔄 Display pills pending | 🔄 Filter pending |
| **Plans** | ✅ `PlanHashtag` | ✅ (via hashtagService) | 🔄 Display pills pending | 🔄 Filter pending |
| **Requests** | ✅ `RequestHashtag` | ✅ (via hashtagService) | 🔄 Display pills pending | 🔄 Filter pending |
| **Groups** (entity) | ✅ `GroupHashtag` | ✅ (via hashtagService) | 🔄 Display pills pending | 🔄 Filter pending |
| **Trips** | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing |

### Backlink Coverage

| Entity Pair | Bidirectional Link |
|-------------|:---:|
| Plan ↔ Product | Partial (requests link to products) |
| Request ↔ Plan | ✅ |
| Request ↔ Group | ✅ (in schema) |
| Request ↔ Product | ✅ |
| Event ↔ Plan | ✅ |
| Post ↔ referenced entity | ✅ (through ShareToPostModal) |
| All ↔ All (universal) | ✅ Backlink model exists, API pending |
| School ↔ related Plans | ❌ |
| Service ↔ related Requests | ❌ |
| Group ↔ related Events | ❌ |

---

## ✅ Phases Already Complete

### Phase A: Foundation Components
| Item | Status |
|------|--------|
| `design-system.css` (160+ tokens: spacing, radius, shadow, typography) | ✅ |
| `src/types/` directory with 11 domain type files | ✅ |
| `ErrorBoundary` component | ✅ |
| `Skeleton` component + `SkeletonCard` | ✅ |
| `EmptyState` component | ✅ |
| `ConfirmDialog` component | ✅ |
| `ToastContext` (provider, stacking, auto-dismiss) | ✅ |
| ESLint flat config (eslint-config-next, @typescript-eslint, strict rules) | ✅ |

### Phase B: Universal Hashtags
| Item | Status |
|------|--------|
| `SchoolContentHashtag` Prisma model | ✅ |
| `PlanHashtag` Prisma model | ✅ |
| `RequestHashtag` Prisma model | ✅ |
| `GroupHashtag` Prisma model | ✅ |
| `Backlink` Prisma model | ✅ |
| `hashtagService.ts` centralized service | ✅ |
| `backlinkService.ts` | ✅ |
| `HashtagInput` component (autocomplete, pills, trending) | ✅ |

### Phase C: Federation Endpoints
| Item | Status |
|------|--------|
| `/.well-known/webfinger` | ✅ |
| `/.well-known/nodeinfo` | ✅ |
| `/api/fediverse/actor/[username]` | ✅ |
| `/api/fediverse/inbox` | ✅ |
| `/api/fediverse/outbox/[userId]` | ✅ |
| `/api/fediverse/nodeinfo/2.1` | ✅ |

### Phase D: Onboarding Flow
| Item | Status |
|------|--------|
| 6-step onboarding (Welcome → Profile → Class Setup → Tour → Community → Complete) | ✅ |

### Phase E: Session Plan Items
| Item | Status |
|------|--------|
| Footer restructured (`.bottomBuiltWith`, version badge) | ✅ |
| CRYPTO_LOGOS → `src/lib/constants.ts` | ✅ |
| Shops/schools auth gates removed | ✅ |
| Products API envelope + pinned filter | ✅ |
| Home page modular refresh | ✅ |
| Donation DnD reorder | ✅ |
| FIRO logo PNG | ✅ |
| Shops search + category filter + map | ✅ |
| Schools CSS (tabs, filters, content grid, type colors) | ✅ |

---

## ⏳ Remaining Phases

## Phase 1: Fix Remaining Breaks (~3 hrs)

- **1.1 Middleware deprecation**: ~~Rename `src/middleware.ts` → `proxy.ts`~~ ❌ Cancelled — not needed in Next.js 16
- **1.2 Test environment**: Switch jest `jsdom` → `jest-environment-node`, add polyfills (`fetch`, `Request`, `setImmediate`), create test DB setup
- **1.3 Fire-and-forget Prisma writes**: `src/lib/auth.ts:192,210` — convert `.catch(() => {})` to awaited
- **1.4 Deduplicate notification button**: `src/components/Header.tsx:534-545` — refactor to single conditional
- **1.5 `any` type audit**: 7 API route files flagged with `Record<string, unknown>` patterns

## Phase 2: Complete Service Layer + API Standardization (2-3 days)

- **2.1 Unified API envelope**: Create `src/lib/api-helpers.ts` with `apiResponse<T>()`, `apiError()`, `withAuth()`, `requireAdmin()`, `withValidation()`; refactor ~60 routes
- **2.2 Frontend fetch helpers**: `apiGet<T>()`, `apiPost<T>()`, `apiPut<T>()`, `apiDelete<T>()`
- **2.3 Missing services** (6 new files): `productService.ts`, `requestService.ts`, `eventService.ts`, `userService.ts`, `notificationService.ts`, `walletService.ts`
- **2.4 Database transactions**: Wrap multi-step ops in `$transaction()`

## Phase 3: Complete Social Sharing & Backlinking (1.5-2 days)

- **3.1 Universal ShareBar**: `src/components/ShareBar.tsx` — replace 4 separate share modals; features: Copy Link, Share to Feed, QR Code, X, Facebook, LinkedIn, Telegram, WhatsApp, Email, Fediverse
- **3.2 Auto-generated Related Items**: Query backlinks → "Related Items" section on every entity detail page
- **3.3 Manual linking UI**: "Link to..." button in editors with entity search
- **3.4 Cross-posting engine**: Create post → offer cross-post to Wall + Shop + School + Group + Forum

## Phase 4: Complete Federation (2-3 days)

- **4.1 User key generation on registration**: Wire `federation.ts` key gen; store `federatedUrl`, `privateKey`, `publicKey`
- **4.2 Follow model + route handlers**: Manage local + remote follows; Follow/Unfollow UI on profiles
- **4.3 Wire inbox processing**: Incoming Follow→notify, Accept→update, Like→increment, Announce→boost
- **4.4 Wire outbound delivery cron**: `/api/cron/deliver-fediverse` with retry + cleanup
- **4.5 Federation UI**: Federated handle, follower/following counts, remote user display, admin settings
- **4.6 Security**: HTTP Signature verification, dedup, rate limiting, HTML sanitization

## Phase 5: Navigation Overhaul (2 days)

- **5.1 Command palette**: `src/components/CommandPalette.tsx` — Cmd+K modal, unified search across all entities + hashtags + pages, keyboard nav, context actions
- **5.2 ERP-style sidebar**: Collapsible icon-only mode, sections: Workspace, Commerce, Social, Learn, Finance, Admin
- **5.3 Mobile bottom nav**: Home, Feed, Create (FAB), Messages, Profile; ≥44px; hide on keyboard open
- **5.4 Unified breadcrumbs**: Auto-generate from route segments; ensure ALL pages have them
- **5.5 Navigation cleanup**: Remove `/plans/public` redirect; hide admin from non-admins

## Phase 6: UI/UX Consistency (2 days)

- **6.1 Component library standardization**: Use `ui/Button`, `ui/Card`, `ui/Modal`, `ui/Badge`, `ui/Avatar` everywhere; remove all inline `style={{}}`
- **6.2 Loading states**: Replace all `Loading...` with `<Skeleton>` across every page — ✅ 32 of ~38 instances fixed (6 remain: Suspense fallbacks in auth/events-new/groups-new + Loading component default)
- **6.3 Empty states**: Replace all `No results` / `No items found` with `<EmptyState>` — 🟡 Partial: shop detail page (3 sections) + services page converted; ~25 bare instances remain in admin/dashboard
- **6.4 Toast coverage**: Consistent toasts for ALL CRUD operations
- **6.5 ConfirmDialog**: For all destructive actions (delete, unpublish, remove)
- **6.6 Micro-interactions**: Card hover scale+glow, button active scale, page fade-in

## Phase 7: School Content Enhancement (2-3 days)

- **7.1 Curriculum builder**: Module → Lesson → Topic hierarchy with drag-and-drop
- **7.2 Expanded content types**: article, video, course, quiz, worksheet, resource, assignment
- **7.3 Progress tracking**: Lesson completion, student progress, prerequisites, drip-feed
- **7.4 Hashtag display**: Pills on school content cards + detail view, filter by hashtag
- **7.5 Student management**: Enrolled list, progress detail, certificates, bulk messaging

## Phase 8: Dashboard Enhancement (2 days)

- **8.1 Unified inbox**: Notifications + Messages + Pending Requests + Connection Requests
- **8.2 Cross-module quick actions**: "Create Plan with Product", "Add Event to Group", etc.
- **8.3 Dashboard widgets**: Hashtag widget, recent activity, progress widgets, analytics
- **8.4 Expand directory**: Add Members, Schools, Groups, School Content tabs; map view; hashtag+location filter
- **8.5 Smart cross-linking**: Suggest related entities; "Quick Link" in editors

## Phase 9: Help System & First-Use Triggers (1-1.5 days)

- **9.1 Contextual help**: Inline tooltips, guided tours per module, help drawer
- **9.2 First-use triggers**: First plan → sharing dialog; first product → hashtags prompt; first content → school tips

## Phase 10: Polish & Performance (2 days)

- **10.1 `React.memo()`**: ProductCard, MemberCard, MessageBubble, PostCard, EventCard, SharedItemCard — 🟡 Done: ProductCard, SharedItemCard, ServiceCard, BoardPinCard (MemberCard/EventCard/PostCard are inline)
- **10.2 Virtualization**: Long lists (members, feed, products, notifications)
- **10.3 Dynamic imports**: Leaflet, RichEditor, emoji-picker, QRCode, video chat
- **10.4 Lazy images**: `loading="lazy"` below the fold
- **10.5 Accessibility**: Keyboard nav, aria attributes, focus management, WCAG AA contrast
- **10.6 Security**: File upload validation, DOMPurify, CORS, key encryption, rate limiting
- **10.7 Testing expansion**: RTL for components, hook tests, integration tests, `npm run db:test`

---

## Effort Summary

| Phase | Effort | Deps | Status |
|-------|--------|------|--------|
| **P1: Fix Breaks** | 3 hrs | None | ⏳ 3 items (2 done, 1 cancelled) |
| **P2: API Standardization** | 2-3 days | P1 | ⏳ |
| **P3: Social Sharing** | 1.5-2 days | P2 | ⏳ |
| **P4: Federation** | 2-3 days | P2 | 🔄 Routes exist, logic pending |
| **P5: Navigation** | 2 days | None | ⏳ |
| **P6: UI/UX** | 2 days | P5 | 🔄 Components exist, adoption pending (Loading→Skeleton mostly done, EmptyState partial) |
| **P7: School Content** | 2-3 days | P2 | ⏳ |
| **P8: Dashboard** | 2 days | P2, P6 | 🔄 Directory partial |
| **P9: Help System** | 1-1.5 days | None | ⏳ |
| **P10: Polish** | 2 days | P6 | 🔄 design-system done, memo on 4/6 cards done, rest pending |

**Total remaining: ~17-22 days**

---

## Quick Wins (Parallelizable, < 1 day each)

1. ✅ ESLint config fixed
2. ✅ Auth bcrypt guard added
3. ✅ MobileNav session typed
4. ✅ Header CustomEvent typed
5. ❌ Cancelled — middleware rename (`middleware.ts` → `proxy.ts`), not needed in Next.js 16
6. ✅ Fixed 2 fire-and-forget `.catch()` in auth.ts (now log errors)
7. ✅ Deduplicated notification button in Header.tsx (merged conditionals)
8. 🟡 Partial — `React.memo()` added to ProductCard, SharedItemCard, ServiceCard, BoardPinCard (4 of 6; EventCard/PostCard are inline)
9. ✅ `<Skeleton>` added to all dashboard (8), admin (5), and user-facing pages (14+) — 6 Suspense fallback instances remain (low impact)
10. 🟡 Partial — `<EmptyState>` added to shop detail (3 sections) + services page; ~25 bare instances remain in admin/dashboard
