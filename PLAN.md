# UI/UX Improvement Plan

## Completed Fixes (Session Jun 12)

### Plan→Project Rename
- Full stack rename: Prisma schema, API routes, services, frontend components
- Database tables renamed via `prisma db push`
- Fixed runtime crashes: `fetchNotificationCount`, Prisma query mismatches, API variable bugs
- CSS/variable renames across 70+ files

### Event/Fix Linking
- Zod schemas: `planId` → `projectId` in `requestSchema` and `eventSchema`
- Event POST handler: added `schoolId`/`shopId` destructuring
- Event PUT handler: already handled `schoolId`/`shopId`
- Event detail API response: added `schoolId`, `shopId`, `school`, `shop` fields
- Frontend event detail page: mapped `schoolId`/`shopId` from API, added multi-type linked entity display
- Dashboard events list: added multi-type linked entity display
- Event edit form: added `schoolId`/`shopId` to PUT request body
- New event form: added `schoolId`/`shopId` to POST request body

### Stats Fix
- Stats API response key: `plans` → `projects`
- `PlatformStats` type: `plans: number` → `projects: number`
- `StatsSection.tsx`: stat card key `'plans'` → `'projects'`

### API Envelope Unwraps
- Dashboard events page: unwrap `apiSuccess` envelope
- Dashboard community page: unwrap forum, groups, and connections API responses

### Users Route Fix
- `users/[id]/route.ts`: Prisma `_count.select.plans` → `projects`
- Response key: `plans` → `projects`
- Variable names: `plans` → `projects`, `planVolunteerCount` → `projectVolunteerCount`

---

## Pending Work

### 1. Fix Map Overlapping Header (z-index issues)

**Discover page** (`src/app/discover/page.module.css`):
- Add `z-index: 1` to `.mapContainer` to ensure proper stacking
- Add "← Dashboard" link to breadcrumbs or as a floating back button

**Boards page** (`src/app/boards/page.module.css`):
- Reduce `.mapOverlay` from `z-index: 1000` to `z-index: 10`
- Add dashboard link to breadcrumbs

**Shops page** (`src/app/shops/page.module.css`, `ShopsClient.tsx`):
- Reduce `.mapToggle` from `z-index: 1000` to `z-index: 10`
- Add dashboard link

**Connections page** (`src/app/connections/page.tsx`):
- Change "← Back to Profile" to "← Back to Dashboard" (href: `/dashboard`)
- Add dashboard breadcrumb

### 2. Add Map/Grid Selector to Shops Page

**Files:** `src/app/shops/ShopsClient.tsx`, `src/app/shops/page.module.css`

Add a view mode toggle similar to ProductsClient:
```tsx
const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')
```
- Grid view: current layout with AlphabeticalIndex
- Map view: show full MapContainer, hide grid
- Toggle buttons with icons (grid icon, map icon)

### 3. Header UI Improvement

**Files:** `src/app/globals.css`, `src/app/design-system.css`, `src/components/Header.tsx`, `src/components/Header.module.css`

- Reduce `--header-height` from `64px` to `56px` (or `48px` on mobile)
- Audit all pages using `padding-top: var(--header-height)` to verify layout
- Simplify nav items — collapse secondary links under "More" dropdown
- Reduce padding/margins on header elements
- Considerations:
  - AppShell at `src/components/AppShell.tsx` applies padding-top
  - All dashboard pages use this pattern
  - Need to test on mobile where BottomNav is also shown

### 4. Upgrade Projects Creation Process

**Current state:** Wizard with 3 steps (Basics, Goals, Review) at `src/app/projects/new/page.tsx`

**Missing fields to add:**
- Image upload (use existing `ImageUploader` component)
- Location with map picker
- Collaborator settings (looking for collaborators toggle)
- Hashtags (use existing `HashtagInput` component)
- Budget/goal amount
- Category selector with icons

**Approach options:**
- **A:** Expand wizard to 4-5 steps (adds fields gradually)
- **B:** Replace wizard with single comprehensive form with sections
- **C:** Keep wizard + add "quick template" and "full form" paths

**Files to modify:**
- `src/app/projects/new/page.tsx` — main wizard/form
- `src/app/projects/new/page.module.css` — additional styles
- `src/app/api/projects/route.ts` — POST handler may need additional fields
- Consider reusing `ProjectDetailClient.tsx` edit form patterns
