# Fresh Pass: Site Feature Consistency at Scale

> **Execution**: Scale-ready pass (~22-28h) following 7-step cycle in `pass-playbook.md`
> **Trigger**: "plan a fresh pass to improve all site features, enhance ones without many options, for basic viewing/filtering as well as posting/linking/nav — site may need to scale large quick, optimum configs"
> **Key principle**: Every pattern must work at 10k+ records. No client-side .slice() — API-level pagination. No unbounded queries. No full table scans.

---

## Current State — Scale Readiness

| Aspect | Current State | Risk at Scale |
|--------|--------------|---------------|
| **API Pagination** | 14/18 list endpoints have NO pagination | Returns ALL records — OOM at 100k+ |
| **DB Indexes** | SchoolContent has 0 indexes; Group has 1; many miss `createdAt`/`price`/`category` | Full table scans on every list query |
| **Frontend Filtering** | Products/Requests filter hashtags + distance in-memory (post-query) | Loads ALL records then discards most |
| **Eager Loading** | Several endpoints use full `include` + `_count` subqueries per row | N+1 at scale |
| **Maps** | Existing patterns use Leaflet without clustering | 10k markers crashes browser |
| **Loading** | Loading.tsx exists but only used on 2 pages | Fine — no scaling issue |

---

## Execution Phases (Scale-First Order)

### Phase 0: Database Indexes (~2h, prerequisite for everything)

Add missing indexes on commonly filtered/sorted fields. Each index is a single `@@index([field])` line in `schema.prisma`, then `npx prisma generate` + migration.

**Critical (full table scan without these):**
| Model | Add Index On | Why |
|-------|-------------|-----|
| `SchoolContent` | `userId`, `authorId`, `contentType`, `isPaid`, `isSubscription`, `pinned`, `createdAt` | **Zero indexes currently** — every query is sequential scan |
| `Group` | `userId`, `name`, `category`, `isPrivate`, `createdAt` | Only 1 index exists (`location`) — all group listings scan |
| `Event` | `eventCategory`, `location`, `createdAt`, `schoolId`, `shopId` | Category browsing + school/shop scoped queries |

**High impact (sort/filter queries):**
| Model | Add Index On | Why |
|-------|-------------|-----|
| `Product` | `price`, `createdAt`, `condition`, `latitude`, `longitude` | Price range filter + geo queries |
| `Request` | `createdAt`, `priority`, `deadline`, `location`, `budget` | Sort by newest, filter by priority/date |
| `ServiceOffering` | `createdAt`, `price`, `location`, `duration` | Sort by newest/price, location filter |
| `Plan` | `createdAt`, `pinned` | Timeline queries |
| `Post` | `createdAt`, `referenceType`, `referenceId` | Feed queries, backlink lookups |
| `BulletinBoard` | `ownerId`, `isPublic`, `createdAt` | User's boards, public listing |

**Effort**: ~2h (schema edits + migration)

---

### Phase 1: API Pagination — Critical Path (~6h, 14 endpoints)

Add `skip`/`take` (or `page`/`pageSize`) query params to every list endpoint. Return `total` count for pages that need it.

**Pattern to apply to each endpoint:**
```typescript
const page = Math.max(1, parseInt(query.page as string) || 1)
const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize as string) || 20))
const skip = (page - 1) * pageSize

const [items, total] = await Promise.all([
  prisma.model.findMany({
    where: { /* existing filters */ },
    orderBy: { /* existing sort */ },
    skip,
    take: pageSize,
    // existing includes/selects
  }),
  prisma.model.count({ where: { /* same filters */ } })
])

return Response.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
```

**Batch 1 — No pagination at all (highest risk, 6 endpoints):**
| Endpoint | File | Notes |
|----------|------|-------|
| Requests | `/api/requests/route.ts` | Also: reduce `include: { plan: true }` to selected fields only |
| Events | `/api/events/route.ts` | Also: remove eager `eventJoiners: { take: 20 }` — lazy load if needed |
| Services | `/api/services/route.ts` | Straightforward add skip/take |
| Groups | `/api/groups/route.ts` | Add pagination |
| Community Members | `/api/community/members/route.ts` | **Highest risk** — add pagination to all 3 sub-queries |
| Community Connections | `/api/community/connections/route.ts` | Add skip/take |

**Batch 2 — Partial/hardcoded pagination (6 endpoints):**
| Endpoint | File | Fix |
|----------|------|-----|
| Plans | `/api/plans/route.ts` | Replace hardcoded `take: 4` with proper page/pageSize; add skip for user plans |
| Products | `/api/products/user/route.ts` | Add skip + pageSize to replace bare `take: limit` |
| Products (public) | `/api/products/route.ts` | Replace `?limit=N` with `?page=N&pageSize=N` |
| Schools | `/api/schools/route.ts` | Replace hardcoded `take: 50` with proper pagination; add limit to schools list |
| Forum Posts (main) | `/api/community/forum/route.ts` | Add `skip` param to complement existing `take: 20` |
| Services/User | `/api/services/user/route.ts` | Add skip/take |

**Batch 3 — Admin endpoints (2 endpoints):**
| Endpoint | File | Fix |
|----------|------|-----|
| Admin Subscribers | `/api/admin/subscribers/route.ts` | Add pagination (grows unbounded) |
| Admin Wallets | `/api/admin/wallets/route.ts` | Low priority — typically small, add pagination for safety |

**Batch 4 — Frontend integration (same 10 list pages as original plan):**
Update each list page's data fetching to pass `page`/`pageSize` and use the new response envelope `{ items, total, page, pageSize }`.

| Page | File | What changes |
|------|------|-------------|
| Requests | `RequestsClient.tsx` | Fetch paginated, "Load More" fetches next page |
| Services | `services/page.tsx` | Same |
| Groups | `groups/page.tsx` | Same |
| Events | `events/page.tsx` | Same |
| Community (5 tabs) | `community/page.tsx` | Same |
| Schools | `schools/page.tsx` | Same |
| Rentals | `RentalsBrowseClient.tsx` | Same |
| Projects | `ProjectsClient.tsx` | Same |
| Forum | `community/forum/page.tsx` | Same |
| Discover | `discover/page.tsx` | ✅ Already has pagination |

**Effort**: 6h (4h backend + 2h frontend)

---

### Phase 2: Prisma Query Optimization (~2h)

Optimize eager loading and field selection in the API routes modified in Phase 1.

| Endpoint | Current Issue | Fix |
|----------|--------------|-----|
| `/api/requests/route.ts` | `include: { plan: true }` loads ALL plan fields for every row | Use `select` instead of `include` for plan (id, title, imageUrl only) |
| `/api/events/route.ts` | `include: { eventJoiners: { take: 20 } }` per event | Remove — lazy load joiners on detail page only |
| `/api/products/route.ts` | Hashtag + distance filtered in-memory (post-query) | Move hashtag filter to Prisma `some`; move distance to `HAVING` or keep as-is with pagination (acceptable at 20/page) |
| Multiple `_count` subqueries | Every `_count` adds a subquery per row | Ensure pagination limits to 20/page — acceptable at that scale |

**Effort**: 2h

---

### Phase 3: Breadcrumbs (~3h, 35 pages)

Same as original plan — 35 pages across dashboard (14), admin (8), auth (5), other (8). Mechanically add `<Breadcrumbs>` import + render. No API changes — fully parallel to Phases 0-2.

**Same batches as original plan.**

**Effort**: 3h

---

### Phase 4: Dragon/Loading Animation (~2h, 17 sites)

Replace all plain-text "Loading..." and simple Skeleton Suspense fallbacks with `<Loading>` component.

**Batch 1 — Plain-text (5 sites):**
| File | Current | Replace with |
|------|---------|-------------|
| `profile/[username]/page.tsx:716` | `<div>Loading profile...</div>` | `<Loading size="medium" message="Loading profile..." />` |
| `profile/[username]/page.tsx:1332` | `'Loading posts...'` | `<Loading size="small" />` |
| `community/forum/page.tsx:337` | `<div>Loading posts...</div>` | `<Loading size="medium" message="Loading posts..." />` |
| `search/SearchResultsClient.tsx:175` | `'Searching...'` | `<Loading size="small" message="Searching..." />` |
| `discover/page.tsx:244` | `<div>Searching...</div>` | `<Loading size="medium" message="Searching..." />` |

**Batch 2 — Suspense fallbacks (12 sites):**
Replace `<Skeleton>` / `<SkeletonList>` / `<SkeletonCard>` with `<Loading>`:
| File | Line |
|------|------|
| `auth/verify-email/page.tsx` | 183 |
| `auth/reset-password/page.tsx` | 166 |
| `events/new/page.tsx` | 18 |
| `events/[id]/page.tsx` | 779 |
| `groups/[id]/page.tsx` | 1219 |
| `checkout/page.tsx` | 498 |
| `school/setup/page.tsx` | 303 |
| `requests/page.tsx` | 96 |
| `messages/page.tsx` | 328 |
| `dashboard/messages/DashboardMessagesPage.tsx` | 312 |
| `dashboard/marketplace/page.tsx` | 642 |
| `groups/new/page.tsx` | 58 |

**Effort**: 2h

---

### Phase 5: Missing Filters & Sort (~2h, 5 pages)

| Page | Add | Pattern to reuse |
|------|-----|-----------------|
| **Events** | Text search input (filter `q` param to API) | Same as Products search pattern |
| **Groups** | Category dropdown filter + Sort (Newest, Oldest, Alphabetical) | Same as Products category filter |
| **Boards** | Category filter + Sort (Newest, Nearest) | Reuse existing geo-sort |
| **Community** | Sort dropdown per tab | Same pattern as existing sort dropdowns |
| **Discover** | Sort: Newest, Most Popular, Nearest | Same pattern |

**Effort**: 2h

---

### Phase 6: Creation Entry Points (~1h, 3 pages)

| Page | Add |
|------|-----|
| **Discover** | Verify CreateFAB is shown (floating action button) |
| **Schools** | "+ Create School" button → `/school/setup` |
| **Rentals** | "+ List Rental" button → `/dashboard/rentals` |

**Effort**: 1h

---

### Phase 7: Cross-Linking Coverage (~3h, 5 items)

| Item | What to do |
|------|------------|
| **PinToBoardButton on Posts** | Import & add to `posts/[id]/page.tsx` |
| **Event linking in edit mode** | Remove `mode === 'create'` guard in `EventFormFields` |
| **Share to Feed → Group destination** | Add GROUP to destination options in `EntityActions.tsx` Share to Feed |
| **"Create Plan" from Product/Request detail** | Add "Create Project" button linking to `/dashboard/projects` |
| **Map view leaflet clustering** | Add `react-leaflet-cluster` or `leaflet.markercluster` to existing map components |

**Effort**: 3h

---

### Phase 8: View Toggles + Maps (~5h, 6 pages) — Save for last

Add grid/list toggle and/or map view. Reuse existing patterns but ensure maps use marker clustering for 10k+ scale.

| Page | Add |
|------|-----|
| **Requests** | Grid/List toggle |
| **Services** | Grid/List toggle + Leaflet map with marker clustering |
| **Groups** | Grid/List toggle + Leaflet map with marker clustering |
| **Community** | Grid/List toggle per tab |
| **Schools** | Grid/List toggle |
| **Rentals** | Grid/List toggle + Leaflet map with marker clustering |

**Effort**: 5h

---

## Effort Summary

| Phase | Items | Est. Time | Scale Impact | UX Impact |
|-------|-------|-----------|-------------|-----------|
| **0. DB Indexes** | ~25 indexes across 10 models | 2h | ✅ Critical | None |
| **1. API Pagination** | 14 endpoints + 10 frontend pages | 6h | ✅ Critical | 🟡 (Load More) |
| **2. Query Optimization** | 4 high-cost query patterns | 2h | ✅ High | None |
| **3. Breadcrumbs** | 35 pages | 3h | None | ✅ High |
| **4. Loading Animation** | 17 sites | 2h | None | ✅ Medium |
| **5. Filters & Sort** | 5 pages | 2h | 🟡 (relies on indexes) | ✅ High |
| **6. Creation Buttons** | 3 pages | 1h | None | ✅ Medium |
| **7. Cross-Linking** | 5 items | 3h | 🟡 (map clustering) | ✅ Medium |
| **8. View Toggles + Maps** | 6 pages | 5h | None | ✅ High |
| **Total** | **~105 items** | **~26h** | | |

**Execution order** (scale-critical first): 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

---

## Verification

```bash
npx tsc --noEmit --pretty        # After each batch
npx prisma generate              # After Phase 0 schema changes
npx prisma migrate dev           # After Phase 0
next build 2>&1 | tail -30       # Before declaring pass done
```

## Documentation

After all phases:
- Update SESSION_NOTES.md, PRIORITY_LIST.md, IMPROVEMENT_PLAN.md
