# XistrYmemZ — Comprehensive Improvement Plan (Updated)

> **v2.1 — Refreshed from Pass 4 (Site Structure + UX/UI Polish).** Reflects actual completion state after Dragon+Loading animation, EmptyState unification, inline style migration batch 1, hashtag pills, micro-interactions, and type cleanup.
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
| School Content | `SchoolContentHashtag` | ✅ | 🔄 Display pending | 🔄 Filter pending |
| Plans | `PlanHashtag` | ✅ | ✅ Display pills done | 🔄 Filter pending |
| Requests | `RequestHashtag` | ✅ | ✅ Display pills done | 🔄 Filter pending |
| Groups (entity) | `GroupHashtag` | ✅ | ✅ Display pills done | 🔄 Filter pending |
| Trips | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing |

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

### Phase F: Pass 4 — Site Structure + UX/UI Polish
| Item | Status |
|------|--------|
| Dragon + Logo Loading Animation (`Loading.tsx` + CSS module) | ✅ |
| Empty State Unification (~30 replacements) | ✅ |
| Inline Style Migration Batch 1 (TipModal, ReplySection, ServiceCard) | ✅ |
| Hashtag Pills Display (Plans, Requests, Groups) | ✅ |
| Micro-interactions (keyframes, page-enter, card-hover, btn-press) | ✅ |
| Type Cleanup (9 TS errors, 4 interfaces extended) | ✅ |

---

## ⏳ Remaining Phases

## Phase 1: Fix Remaining Breaks (~3 hrs)

- **1.1 Middleware deprecation**: ❌ Cancelled — not needed in Next.js 16
- **1.2 Test environment**: Switch jest `jsdom` → `jest-environment-node`, add polyfills
- **1.3 Fire-and-forget Prisma writes**: ✅ Done
- **1.4 Deduplicate notification button**: ✅ Done
- **1.5 `any` type audit**: 7 API route files flagged with `Record<string, unknown>` patterns

## Phase 2: Complete Service Layer + API Standardization (2-3 days)

- **2.1 Unified API envelope**: Create `src/lib/api-helpers.ts` with helpers; refactor ~60 routes
- **2.2 Frontend fetch helpers**: `apiGet<T>()`, `apiPost<T>()`, `apiPut<T>()`, `apiDelete<T>()`
- **2.3 Missing services** (6 new files): `productService.ts`, `requestService.ts`, `eventService.ts`, `userService.ts`, `notificationService.ts`, `walletService.ts`
- **2.4 Database transactions**: Wrap multi-step ops in `$transaction()`

## Phase 3: Complete Social Sharing & Backlinking (1.5-2 days)

- **3.1 Universal ShareBar**: Replace 4 separate share modals
- **3.2 Auto-generated Related Items**: "Related Items" section on every detail page
- **3.3 Manual linking UI**: "Link to..." button in editors
- **3.4 Cross-posting engine**: Cross-post to Wall + Shop + School + Group + Forum

## Phase 4: Complete Federation (2-3 days)

- **4.1-4.6**: Key gen, Follow model, inbox/outbox wiring, outbound cron, federation UI, security

## Phase 5: Navigation Overhaul (2 days)

- **5.1 Command palette**: Cmd+K modal
- **5.2 ERP-style sidebar**: Collapsible, role-gated
- **5.3 Mobile bottom nav**: 5 icons, ≥44px
- **⏳ 5.4 Unified breadcrumbs**: Add `<Breadcrumbs>` to ~35 pages missing them:
  - Dashboard: 14 pages
  - Admin (partial): 8 pages
  - Auth: 5 pages
  - Other: connections, offers/[id], posts/[id], projects, rentals (2), settings (3), shops, trips/[id]
- **5.5 Navigation cleanup**: Remove duplicates, hide admin, progressive loading

## Phase 6: UI/UX Consistency (2 days — 5-8h remaining)

### ✅ 6.1 Component Library Standardization — Partial
- **Done**: `ui/Button` has `btn-press` class, `EmptyState` adopted (~30 instances)
- **⏳ Inline styles → CSS modules**: 3/20 files done. Remaining top 8:

| File | Count | CSS Module |
|------|:-----:|:---------:|
| `plans/[id]/PlanDetailClient.tsx` | 37 | ❌ Need new |
| `admin/settings/page.tsx` | 35 | Has `page.module.css` |
| `connections/page.tsx` | 31 | ❌ Need new |
| `dashboard/appointments/page.tsx` | 29 | ❌ Need new |
| `plans/[id]/PlanUpdates.tsx` | 26 | ❌ Need new |
| `posts/[id]/page.tsx` | 23 | ❌ Need new |
| `trips/[id]/TripView.tsx` | 23 | ❌ Need new |
| `dashboard/overview/page.tsx` | 20 | Has `OverviewCards.module.css` |

### ✅ 6.2 Loading States
- **Status**: ✅ 32 of ~38 instances (6 low-impact Suspense fallbacks remain)

### ✅ 6.3 Empty States
- **Status**: ✅ ~30 replacements done in Pass 4. Custom-styled pages (dashboard/studio, dashboard/saved, dashboard/appointments, ProjectsClient, hashtag pages) kept as-is.

### ⏳ 6.4 Toast Coverage
- **Status**: 🟡 ~48 files use toasts (~350+ calls). Gaps in dashboard settings, admin analytics/backups, offers, trips, rentals, connections.

### ⏳ 6.5 ConfirmDialog
- **Status**: 🟡 Only 5/35 pages with DELETE operations wired. Priority: groups/[id] (6 ops), dashboard/ (~20 ops), community/forum/[postId] (2 ops), connections, Plans.

### ✅ 6.6 Micro-interactions
- **Status**: ✅ Done

## Phase 7: School Content Enhancement (2-3 days)
- **7.1-7.5**: Curriculum builder, content types, progress, hashtags, student management

## Phase 8: Dashboard Enhancement (2 days)
- **8.1-8.5**: Unified inbox, quick actions, widgets, directory expansion, cross-linking

## Phase 9: Help System & First-Use Triggers (1-1.5 days)
- **9.1-9.2**: Contextual help, guided tours, first-use triggers

## Phase 10: Polish & Performance (2 days)
- **10.1**: React.memo — 🟡 4/6 cards done
- **10.2-10.7**: Virtualization, dynamic imports, lazy images, a11y, security, testing

---

## Effort Summary

| Phase | Effort | Deps | Status |
|-------|--------|------|--------|
| **P1: Fix Breaks** | 3 hrs | None | 🔄 1 item pending |
| **P2: API Standardization** | 2-3 days | P1 | ⏳ |
| **P3: Social Sharing** | 1.5-2 days | P2 | ⏳ |
| **P4: Federation** | 2-3 days | P2 | 🔄 Routes done |
| **P5: Navigation** | 2 days | None | ⏳ Breadcrumbs 35pp pending |
| **P6: UI/UX** | 2 days (5-8h remain) | P5 | 🔄 Inline ~17 files, ConfirmDialog ~30 pp |
| **P7: School Content** | 2-3 days | P2 | ⏳ |
| **P8: Dashboard** | 2 days | P2, P6 | ⏳ |
| **P9: Help System** | 1-1.5 days | None | ⏳ |
| **P10: Polish** | 2 days | P6 | 🔄 Partial |

**Total remaining: ~15-20 days**

---

## Quick Wins (Parallelizable, < 1 day each)

1. ✅ ESLint config fixed
2. ✅ Auth bcrypt guard added
3. ✅ MobileNav session typed
4. ✅ Header CustomEvent typed
5. ❌ Middleware rename cancelled
6. ✅ Fire-and-forget fixed
7. ✅ Notification button deduplicated
8. 🟡 React.memo on 4/6 cards
9. ✅ Skeleton sweep (32/38)
10. ✅ EmptyState unification (30+)
11. ✅ Micro-interactions done
12. ✅ Inline styles batch 1 (3 files)
13. ✅ Hashtag pills (Plans, Requests, Groups)
14. ⏳ Add Breadcrumbs to 35 pages
15. ⏳ Wire ConfirmDialog to 35 DELETE ops
