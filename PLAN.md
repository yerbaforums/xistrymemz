# XistryMemz — UX Completion & Flow Enhancement Plan

## Status: In Progress
**Last Updated:** June 12, 2026

---

## Phase 1: Inline Styles → CSS Modules (6 files, ~120 styles)

### 1.1 PlanUpdates.tsx (24 inline styles)
- **File:** `src/app/plans/[id]/PlanUpdates.tsx`
- **Problem:** Imports `./sortable.module.css` but uses `.header`/`.flexRow` which don't exist there
- **Solution:** Create `./plan-updates.module.css`, move all 24 styles
- **Status:** PENDING

### 1.2 admin/settings/page.tsx (29 inline styles)
- **File:** `src/app/admin/settings/page.tsx`
- **Context:** Donation addresses section (lines 346–481), CSS module has `.flexRow`, `.flex1`, `.gap8`, `.mb12`
- **Solution:** Use existing CSS module utility classes
- **Status:** PENDING

### 1.3 TripView.tsx (21 inline styles)
- **File:** `src/app/trips/[id]/TripView.tsx`
- **Context:** Barely uses `planning.module.css` — inconsistent
- **Solution:** Create `trip-view.module.css` or consolidate into existing modules
- **Status:** PENDING

### 1.4 dashboard/appointments/page.tsx (28 inline styles)
- **File:** `src/app/dashboard/appointments/page.tsx`
- **Context:** `events.module.css` has status color classes — partial coverage
- **Solution:** Extend `events.module.css` with missing styles
- **Status:** PENDING

### 1.5 dashboard/overview/page.tsx (17 inline styles)
- **File:** `src/app/dashboard/overview/page.tsx`
- **Context:** `OverviewCards.module.css` has tipCard, checklistCard, progressBar
- **Solution:** Extend `OverviewCards.module.css` or reuse component-level CSS
- **Status:** PENDING

### 1.6 posts/[id]/page.tsx (1 inline style)
- **File:** `src/app/posts/[id]/page.tsx`
- **Context:** Single inline style — trivial
- **Solution:** Add to existing CSS module
- **Status:** PENDING

---

## Phase 2: Requests Flow Enhancement

### 2.1 Shared type definitions
- **File:** `src/types/request.ts` (NEW)
- **Content:** `RequestBase`, `RequestFormData`, `RequestWithRelations` interfaces
- **Purpose:** Eliminate interface duplication across 3+ client components
- **Status:** PENDING

### 2.2 Shared RequestForm component
- **File:** `src/components/RequestForm.tsx` (NEW)
- **Features:**
  - Reusable form for creating/editing requests
  - Uses shared types from `src/types/request.ts`
  - Handles file uploads (images)
  - Category picker using `REQUEST_CATEGORIES` from lib
- **Purpose:** Single source of truth for request creation
- **Status:** PENDING

### 2.3 /requests/new page
- **File:** `src/app/requests/new/page.tsx` (NEW)
- **Purpose:** Dedicated page for creating new requests
- **Status:** PENDING

### 2.4 Fix map view toggle
- **File:** `src/app/requests/RequestsClient.tsx`
- **Problem:** Map view button exists in JSX but is commented/hidden
- **Solution:** Unhide map toggle, ensure it works
- **Status:** PENDING

### 2.5 Fix category list inconsistency
- **File:** `src/app/requests/[id]/RequestDetailClient.tsx`
- **Problem:** Local array of 8 categories (missing PRODUCT, SERVICE from `lib/request-categories.ts`)
- **Solution:** Use `REQUEST_CATEGORIES` from lib
- **Status:** PENDING

### 2.6 Add loading/error states
- **Files:** `src/app/requests/[id]/loading.tsx`, `error.tsx` (NEW)
- **Purpose:** Proper UX during load and error states
- **Status:** PENDING

---

## Phase 3: Plans/Projects Flow Enhancement

### 3.1 Add loading/error states for plan detail
- **Files:** `src/app/plans/[id]/loading.tsx`, `error.tsx` (NEW)
- **Purpose:** Proper UX during load and error states
- **Status:** PENDING

### 3.2 Add Delete Plan button
- **File:** `src/app/plans/[id]/PlanDetailClient.tsx`
- **Context:** API supports `DELETE /api/plans/[id]` but no UI button
- **Solution:** Add delete button with confirmation dialog
- **Status:** PENDING

### 3.3 Fix PlanUpdates
- **File:** `src/app/plans/[id]/PlanUpdates.tsx`
- **Problems:**
  1. 24 inline styles (covered in 1.1)
  2. Only plan owner can post updates — should allow editors too
  3. No image upload capability
- **Solution:** Add editor permission check + image upload + CSS module styles
- **Status:** PENDING

### 3.4 Plans↔Requests Integration
- **Key goal:** Allow linking requests to plans for progress tracking
- **Ideas:**
  - In PlanDetailClient, show linked requests in a tab
  - In RequestDetailClient, show linked plan
  - Link UI in both directions
- **Status:** PENDING

### 3.5 Clean up /plans route
- **File:** `src/app/plans/page.module.css` (1634 lines orphaned CSS)
- **Problem:** CSS exists but no `page.tsx` — route returns 404
- **Option A:** Create proper `/plans` listing page
- **Option B:** Remove orphaned CSS
- **Status:** PENDING

---

## Implementation Order

```
Phase 1.1 (PlanUpdates.tsx — broken import)  ───────┐
Phase 1.2 (admin/settings — easy win)               │
Phase 1.3–1.6 (remaining inline styles)              │
Phase 2.1 (shared types)                             ├── Parallel batches
Phase 2.2 (RequestForm component)                    │
Phase 2.3 (/requests/new page)                       │
Phase 2.4–2.6 (map, categories, loading)             │
Phase 3.1 (plan loading/error states)               │
Phase 3.2 (delete button)                           │
Phase 3.3 (PlanUpdates fixes)                       │
Phase 3.4 (Plans↔Requests integration)              │
Phase 3.5 (orphaned CSS cleanup)                    │
```

Each batch is verified with `npm run build` before proceeding.
