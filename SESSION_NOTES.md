# Session Working Notes — Next Pass

> Generated after completing P3 (Universal Hashtags) + P2 (School Content) first pass.
> Next: tackle remaining phases from IMPROVEMENT_PLAN.md.

---

## What Was Just Done

### ✅ Hashtag System (P3)
- **Prisma models**: `SchoolContentHashtag`, `PlanHashtag`, `RequestHashtag`, `GroupHashtag`
- **Service**: `src/services/hashtagService.ts` — centralized `extractHashtags`, `linkHashtags`, `extractAndLinkHashtags`, `getTrendingHashtags`, `getHashtagTotals`
- **Component**: `src/components/HashtagInput.tsx` + CSS — autocomplete suggestions, keyboard nav, removable pills
- **API expansion**: `/api/school/[slug]/content`, `/api/plans`, `/api/requests`, `/api/groups` all handle hashtags on create/update
- **Hashtag API**: `/api/hashtags` and `/api/hashtags/[tag]` now return counts/items for all 10 entity types
- **Hashtag page**: `/hashtag/[tag]` shows 9 entity tabs with cards
- **Hashtag browse**: `/hashtags` updated with entity filter buttons and expanded pill counts

### ✅ School Content Enhancement (P2)
- HashtagInput embedded in school content creation form
- Hashtag pills displayed on school content cards
- School API returns hashtag data with content
- Schema validation for all hashtag fields

---

## Current State — What's Done vs. What's Left

| Phase | Key Deliverable | Status |
|-------|----------------|--------|
| **P1** | Design system file (`design-system.css`) | ❌ |
| **P1** | Shell/nav rework (sidebar, breadcrumbs) | ❌ |
| **P1** | `api-helpers.ts` unified response format | ❌ |
| **P1** | Service layer (`src/services/`) | ⚠️ hashtagService exists only |
| **P1** | Centralized types | ❌ |
| **P2** | School content customization | ✅ Hashtags + basic form |
| **P2** | Rich editor, curriculum builder | ❌ Still plain textarea |
| **P3** | Universal hashtags | ✅ All entity types covered |
| **P4** | Unified `ShareBar` | ❌ |
| **P4** | Backlink model + system | ❌ |
| **P4** | Cross-posting engine | ❌ |
| **P4** | Fediverse sharing | ❌ |
| **P5** | Component consistency (ui/* adoption) | ❌ Still heavy inline styles |
| **P5** | `<Skeleton />` adoption | ❌ Zero usage |
| **P5** | `<EmptyState />` adoption | ❌ Zero usage |
| **P5** | `<ErrorBoundary />` adoption | ❌ dashboard has its own copy |
| **P5** | Responsive & mobile audit | ❌ |
| **P5** | Micro-interactions | ❌ |
| **P6** | Dashboard ERP hub | ❌ |
| **P6** | Global search enhancement | ❌ |
| **P6** | Unified directory (add Schools/Groups/Content) | ❌ |
| **P6** | Smart cross-linking in forms | ❌ |
| **P7** | Onboarding enhancement | ❌ |
| **P7** | Contextual help system | ❌ |
| **P7** | First-use triggers | ❌ |
| **P8** | CSS audit (inline style removal) | ❌ |
| **P8** | Nav cleanup | ❌ |
| **P8** | Typography & spacing audit | ❌ |

---

## Next Pass Priority Order

### Pass 2: Quick Wins & Foundation (P5 + P1 partially)

These are the highest-impact, lowest-effort items that build momentum:

#### 1. Adopt `<Skeleton />` everywhere 🔥
- Replace every `"Loading..."` / `<div>Loading...</div>` with `<Skeleton />`, `<SkeletonCard />`, `<SkeletonList />`
- Files to touch (~30 locations):
  - `dashboard/overview/page.tsx`
  - `dashboard/layout.tsx` (sidebar loading)
  - `search/SearchResultsClient.tsx`
  - `directory/page.tsx`
  - `profile/[username]/page.tsx`
  - `hashtag/[tag]/page.tsx`
  - `hashtags/page.tsx`
  - `events/page.tsx`
  - `products/page.tsx`
  - `schools/page.tsx`
  - `school/[slug]/page.tsx`
  - `shop/[slug]/page.tsx`
  - `community/page.tsx`
  - `messages/page.tsx`
  - `groups/page.tsx`
  - `plans/[id]/PlanDetailClient.tsx`
  - `requests/RequestsClient.tsx`
  - `notifications/page.tsx`
  - `connections/page.tsx`
  - `onboarding/page.tsx`

#### 2. Adopt `<EmptyState />` everywhere 🔥
- Replace every `"No results found"` / `<div>No X yet</div>` with `<EmptyState>`
- Files (~20 locations): same list as above minus the loading-only pages

#### 3. Adopt `<ErrorBoundary />` everywhere
- Wrap each page section with ErrorBoundary
- Remove the duplicated ErrorBoundary in `dashboard/layout.tsx`
- Files: all major page layouts

#### 4. Eliminate inline `style={{}}` (Phase 8.1)
- Priority targets:
  - `Header.tsx` — 15+ inline styles in nav items, search dropdown, mobile menu
  - `profile/[username]/page.tsx` — 15+ inline styles
  - `dashboard/overview/page.tsx` — 10+ inline styles in stat gauges, grid layout
  - `ShareToPostModal.tsx` — 100% inline styles (no CSS module)
  - `error.tsx`, `global-error.tsx` — inline styled layouts
  - `hashtag/[tag]/page.tsx` — a few inline styles in post section heading
- Move to CSS module classes or design tokens

#### 5. Use `ui/Button`, `ui/Card`, `ui/Modal`, `ui/Badge` everywhere
- Replace all `.btn-primary`, `.btn-secondary`, `.btn-ghost` with `<Button variant="primary">`
- Replace all `.card` with `<Card>`
- Replace all modal patterns with `<Modal>`
- Replace all `.badge-*` with `<Badge>`
- Files: every page that uses global CSS button/card/badge classes

### Pass 3: Sharing & Backlinking (P4)

#### 6. Unified `ShareBar` component
- Replace `ShareSection`, `ShareProfileModal`, `SharePostModal`, `ShareToPostModal`
- Single component with entity type detection
- Social grid, copy link, native share, share-to-feed

#### 7. Backlink model + system
- Add `model Backlink` to Prisma
- `src/services/backlinkService.ts` (create, query, remove)
- "Related Items" section on every entity detail page
- "Link to..." button on content creation forms

### Pass 4: Connectedness (P6)

#### 8. Dashboard ERP hub
- Unified inbox (notifications + messages + requests)
- Cross-module quick actions
- Hashtag widget
- Drag-and-drop widgets

#### 9. Global search enhancement
- Hashtag-first search
- Keyboard navigation
- Quick actions per result
- Search history

#### 10. Unified directory — add Schools, Groups, Content

### Pass 5: Shell & Nav (P1)

#### 11. Sidebar redesign
- ERP-style collapsible icon mode
- Section grouping by domain

#### 12. Unified breadcrumb system

#### 13. Global command palette (Cmd+K)

### Pass 6: Onboarding & Help (P7)

#### 14. Hashtag discovery in onboarding
#### 15. Contextual help tooltips
#### 16. First-use triggers

### Pass 7: API Polish (P1)

#### 17. `api-helpers.ts` — unified response envelope
#### 18. Service layer expansion (beyond hashtagService)

---

## Current File Inventory (Post-This-Session)

### New files created:
```
src/services/hashtagService.ts
src/components/HashtagInput.tsx
src/components/HashtagInput.module.css
IMPROVEMENT_PLAN.md
```

### Files modified:
```
prisma/schema.prisma                    — 4 new models + relations
src/lib/schemas.ts                      — hashtags in plan/request/group schemas
src/app/api/school/[slug]/route.ts      — hashtags in school content response
src/app/api/school/[slug]/content/route.ts       — hashtag extraction on create
src/app/api/school/[slug]/content/[id]/route.ts  — hashtag extraction on update
src/app/api/plans/route.ts             — hashtags on plan create
src/app/api/plans/[id]/route.ts        — hashtags on plan update
src/app/api/requests/route.ts          — hashtags on request create
src/app/api/requests/[id]/route.ts     — hashtags on request update
src/app/api/groups/route.ts            — hashtags on group create
src/app/api/groups/[id]/route.ts       — hashtags on group update
src/app/api/hashtags/route.ts          — expanded entity counts
src/app/api/hashtags/[tag]/route.ts    — expanded entity data
src/app/hashtag/[tag]/page.tsx         — 9 entity tabs
src/app/hashtags/page.tsx              — entity filter + expanded counts
src/app/school/[slug]/page.tsx         — HashtagInput + pills
src/app/school/[slug]/page.module.css  — hashtag pill styles
src/components/ServiceCard.tsx         — onClick made optional
```
