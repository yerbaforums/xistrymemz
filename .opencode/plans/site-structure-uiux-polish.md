# Site Structure Unification + UX/UI Polish Pass

> **Execution**: Full pass (2-3 days) following the 7-step cycle in `pass-playbook.md`
> **Trigger**: "review progress, update plans, proceed with site structure enhancements and unifications, ux/ui smooth and polished, no bugs"
> **Updated**: Pass complete — remaining work tracked in SESSION_NOTES.md, PRIORITY_LIST.md, IMPROVEMENT_PLAN.md

---

## Phase 1: Dragon + Logo Loading Animation ✅

**Files**: `src/components/Loading.tsx`, `src/components/Loading.module.css` (new), `src/app/globals.css` (keyframes)

### Concept
Combine a large emoji dragon emoji with the XistrYmemZ logo mark in a cyber-glow animated container:
- 🐉 Emoji dragon with CSS `@keyframes` float + scale breathing
- Glow ring behind the dragon using `box-shadow` with animated cyan/cyan-blue spread
- Logo text below with the same glow, fading in/out
- Smaller variant for inline loading (just the dragon with mini glow)

### Implementation

**Loading.module.css**:
```css
.container { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-6); padding: var(--space-8); }
.dragonWrapper { position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }
.dragon { font-size: 3rem; line-height: 1; animation: dragonFloat 2s ease-in-out infinite; filter: drop-shadow(0 0 12px var(--accent-primary)); }
.glowRing { position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle, rgba(0, 217, 255, 0.15) 0%, transparent 70%); animation: glowPulse 2s ease-in-out infinite; }
.logo { font-family: var(--font-heading); font-size: 1rem; color: var(--text-secondary); letter-spacing: 2px; text-transform: uppercase; animation: logoFade 2.5s ease-in-out infinite; }
.logoGlow { text-shadow: 0 0 8px rgba(0, 217, 255, 0.3); }
.message { color: var(--text-muted); font-size: 0.8rem; margin: 0; }

/* Sizes */
.small .dragon { font-size: 1.5rem; }
.small .dragonWrapper { width: 40px; height: 40px; }
.small .container { padding: var(--space-4); gap: var(--space-3); }
.small .logo { font-size: 0.75rem; }
.large .dragon { font-size: 4rem; }
.large .dragonWrapper { width: 120px; height: 120px; }

@keyframes dragonFloat {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-8px) scale(1.05); }
}
@keyframes glowPulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
}
@keyframes logoFade {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
```

**Loading.tsx** - Rewrite to use the dragon+logo animation with CSS modules instead of inline styles:
- Remove all inline `style={{}}`, use CSS modules
- Accept `size` and `message` props
- Dragon + glow ring + logo text always shown
- Message shown below when provided

### Where Loading.tsx is used (verify each page uses Skeleton or Loading)
- `src/app/auth/verify-email/page.tsx` (Suspense fallback)
- `src/app/auth/reset-password/page.tsx` (Suspense fallback)
- `src/app/events/new/page.tsx` (Suspense fallback)
- `src/app/groups/new/page.tsx` (Suspense fallback)
- `src/app/profile/[username]/page.tsx:1332` — `loadingMorePosts ? 'Loading...'`

### Profile load-more fix
- Replace `'Loading...'` with `<Loading size="small" message={null} />` or a `<Skeleton />` block

### Status: ✅ COMPLETE

---

## Phase 2: Empty State Unification ✅

**Target pattern**: Replace bare text like `No results found`, `Nothing here yet`, `No items found` with `<EmptyState>` component.

### Batch 1: Components (6 files) — quick wins
| File | Line | Current | Replace with |
|------|------|---------|-------------|
| `src/components/Header.tsx` | 513 | `<div>No results found for ...</div>` | `<EmptyState icon="🔍" title="No results" description="..." />` |
| `src/components/AssetPicker.tsx` | 116 | `No items found. Create items first.` | `<EmptyState icon="📦" title="No items found" ... />` |
| `src/components/InboxView.tsx` | 138 | `No items yet` | `<EmptyState icon="📭" title="No items yet" />` |
| `src/components/LinkItemModal.tsx` | 202 | `<div>No items found</div>` | `<EmptyState icon="🔗" title="No items found" />` |
| `src/components/ProductMapView.tsx` | 77 | `title="No products..."` | Already using EmptyState, check props |
| `src/components/BookAppointmentModal.tsx` | 401 | `No available time slots...` | `<EmptyState icon="⏰" title="No slots available" ... />` |
| `src/components/DashboardTodo.tsx` | 128 | `No tasks yet.` | `<EmptyState icon="✅" title="No tasks yet" ... />` |
| `src/components/EntityActions.tsx` | 248 | `No donation addresses available.` | `<EmptyState icon="💰" title="No donation addresses" ... />` |
| `src/components/InviteWidget.tsx` | 36 | `No invites yet.` | `<EmptyState icon="📨" title="No invites yet" />` |

### Batch 2: App pages — focus on dashboard + admin first
- `src/app/dashboard/saved/page.tsx:80` — `Nothing saved yet` → `<EmptyState>`
- `src/app/dashboard/appointments/page.tsx:280` — `Nothing planned yet` → `<EmptyState>`
- `src/app/dashboard/studio/page.tsx:243` — `Nothing here yet` → `<EmptyState>`
- `src/app/admin/subscribers/page.tsx:218` — `No subscribers found` → `<EmptyState>`
- `src/app/admin/orders/page.tsx:247` — `No orders found` → `<EmptyState>`
- `src/app/admin/users/page.tsx:199` — `No users found` → `<EmptyState>`
- `src/app/discover/page.tsx:284` — `No results found. Try adjusting` → `<EmptyState>`
- `src/app/projects/ProjectsClient.tsx:508` — `<h3>No projects found</h3>` → `<EmptyState>`
- `src/app/hashtags/page.tsx:173` — `No hashtags found` → `<EmptyState>`
- `src/app/hashtag/[tag]/page.tsx:385` — `No results for #{tag}` → `<EmptyState>`

### Batch 3: Profile page `src/app/profile/[username]/page.tsx` (7 instances)
- Lines 1338, 1374, 1402, 1463, 1485, 1507, 1670 — `No posts yet`, `No plans yet`, etc.

### Batch 4: Community/Groups/Shops/School/Requests pages (~20 instances)
- `src/app/community/page.tsx` — 5 instances (already use EmptyState on some)
- `src/app/groups/[id]/page.tsx` — 5 instances
- `src/app/shop/[slug]/page.tsx` — 4 instances
- `src/app/plans/[id]/PlanDetailClient.tsx` — 2 instances
- `src/app/school/[slug]/page.tsx` — 2 instances
- `src/app/requests/[id]/RequestDetailClient.tsx` — 3 instances
- `src/app/events/[id]/page.tsx` — check for bare empty text
- `src/app/offers/[id]/page.tsx` — check for bare empty text

### Status: ✅ COMPLETE — ~30 replacements. Custom-styled states (dashboard/studio, dashboard/saved, dashboard/appointments, ProjectsClient, hashtag pages) kept as-is intentionally.

---

## Phase 3: Inline Style → CSS Module Migration (🔄 In Progress — 3/20 files, ~220 styles remain)

**Strategy**: Migrate the highest-count files first. Target ~20 files with the most inline styles.

### Tier 1 (15+ inline styles each — do first):
| File | Count | Approach |
|------|-------|----------|
| ✅ `src/components/TipModal.tsx` | 21 | Done — created `TipModal.module.css` |
| ✅ `src/components/ReplySection.tsx` | 16 | Done — created `ReplySection.module.css` |
| ✅ `src/components/ServiceCard.tsx` | 15 | Done — created `ServiceCard.module.css` |
| 🔲 `src/app/plans/[id]/PlanDetailClient.tsx` | 37 | Needs `PlanDetailClient.module.css` |
| 🔲 `src/app/admin/settings/page.tsx` | 35 | Has `page.module.css` — migrate inline styles into it |
| 🔲 `src/app/connections/page.tsx` | 31 | Needs `connections.module.css` |
| 🔲 `src/app/dashboard/appointments/page.tsx` | 29 | Needs `appointments.module.css` |
| 🔲 `src/app/plans/[id]/PlanUpdates.tsx` | 26 | Needs `PlanUpdates.module.css` |
| 🔲 `src/app/posts/[id]/page.tsx` | 23 | Needs `post.module.css` |
| 🔲 `src/app/trips/[id]/TripView.tsx` | 23 | Needs `TripView.module.css` |
| 🔲 `src/app/dashboard/overview/page.tsx` | 20 | Has `OverviewCards.module.css` — migrate inline styles into it |

### Tier 2 (10-14 inline styles each):
| File | Count |
|------|-------|
| `src/app/admin/analytics/page.tsx` | 19 (has `page.module.css`) |
| `src/app/services/page.tsx` | 16 (has `page.module.css`) |
| `src/app/profile/[username]/page.tsx` | 15 (has `profile.module.css`) |
| `src/app/requests/RequestsClient.tsx` | 15 |
| `src/app/dashboard/passport/page.tsx` | 14 (has `passport.module.css`) |
| `src/components/AvailabilityEditor.tsx` | 14 |
| `src/components/Header.tsx` | 13 (has `Header.module.css`) |
| `src/app/events/[id]/page.tsx` | 13 (has `page.module.css`) |
| `src/app/school/[slug]/page.tsx` | 13 (has `page.module.css`) |
| `src/components/DashboardTodo.tsx` | 12 |
| `src/components/ServiceFilters.tsx` | 12 |

**Naming convention**: CSS module file named after component or `page.module.css` for page files.
**Pattern**: Move each `style={{...}}` to a named class in the CSS module. Use design tokens (`var(--space-*)`, `var(--text-*)`, `var(--accent-*)`) instead of hardcoded values.

---

## Phase 4: Site Structure & Navigation (🔄 In Progress)

### 4a. Unified Breadcrumbs (🔲 Pending — ~35 pages)
- Audit pages that lack breadcrumbs
- Pages missing: dashboard (14), admin (8), auth (5), connections, offers/[id], posts/[id], projects, rentals (2), settings (3), shops, trips/[id]

### 4b. Boards Feature Completion (🔲 Pending)
| Item | Details |
|------|---------|
| **Edit Board Modal** | Create/edit board modal from existing `CreateBoardModal.tsx` add edit mode |
| **Delete Board** | Add delete with ConfirmDialog |
| **PinToBoardButton on remaining types** | Add to Services, Shops, School, Requests entity pages |
| **ViewCount on boards + pins** | Wire `useRecordView` hook |
| **Hashtags on boards/pins** | Display hashtag pills on board cards + pin detail |
| **Dashboard widget** | Show user's boards on dashboard |
| **Search integration** | Index boards in search |

### 4c. Hashtag Pills Display ✅
**Files to update** (add hashtag pills to entity detail pages):
| Entity | Page File | Pills Location |
|--------|-----------|---------------|
| Plans | `src/app/plans/[id]/PlanDetailClient.tsx` | Below title |
| Requests | `src/app/requests/[id]/RequestDetailClient.tsx` | Below title |
| Groups | `src/app/groups/[id]/page.tsx` | Below group name |
| School Content | `src/app/school/[slug]/page.tsx` | Content card header |

### Status: ✅ Hashtag Pills done; ⏳ Breadcrumbs + Boards pending

---

## Phase 5: UI Polish (🔄 Partially Complete)

### 5a. Micro-interactions ✅
Add to `globals.css`:
```css
/* Card hover */
.card-interactive { transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease; }
.card-interactive:hover { transform: translateY(-2px); border-color: var(--accent-primary); box-shadow: 0 4px 20px rgba(0, 217, 255, 0.1); }

/* Button active */
.btn-press:active { transform: scale(0.97); }

/* Page fade-in */
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.page-fade-in { animation: fadeIn 0.3s ease-out; }
```

Apply these to existing card/button patterns in the most-visited pages:
- Home page cards (PulseSection)
- Product/Service/Plan cards in grids
- Dashboard cards
- Navigation buttons

### Status: ✅ COMPLETE — Added `page-enter`, `card-hover`, `grid-card`, `btn-press`, `stagger-enter` classes; applied to 7 key pages + Button component.

### 5b. Toast Coverage (🔄 Partial)
Add toast notifications for CRUD operations where missing:
- **Create**: toast success (green) — most pages already have this
- **Update**: toast info (blue) — check dashboard settings, profile edit
- **Delete**: toast error (red) — many missing, esp. in dashboard
- **Error**: toast error (red) — ensure all API calls have `.catch` with toast

### 5c. ConfirmDialog for Destructive Actions (🔲 Pending — 5/35 pages wired)
Hook up ConfirmDialog to:
- Delete plan (`/dashboard/planning` or plan detail)
- Delete product (`/dashboard/marketplace`)
- Delete post (`/posts/[id]`)
- Unpublish content (`/dashboard/studio`)
- Remove connection (`/connections`)
- Leave group (`/groups/[id]`)
- Cancel order (`/orders/[id]`)
- Delete event (`/events/[id]` or `/dashboard/events`)

---

## Phase 6: Verification & Documentation (🔄 Partial)

### Build verification
```bash
npx tsc --noEmit --pretty   # ✅ PASSES (0 errors)
next build 2>&1 | tail -30  # TBD
```

### Documentation updates
- ✅ Update `SESSION_NOTES.md` with completed items
- ✅ Update `PRIORITY_LIST.md` checkboxes
- ✅ Update `IMPROVEMENT_PLAN.md` phase statuses
- ✅ Mark completed todos in `.opencode/plans/site-structure-uiux-polish.md`

---

## Effort Estimate

| Phase | Items | Est. Time | Progress |
|-------|-------|-----------|----------|
| 1. Dragon Loading Animation | 1 component + 1 CSS module + 1 fix | 1 hr | ✅ Done |
| 2. Empty State Unification | ~85 replacements across ~40 files | 3 hrs | ✅ Done (~30) |
| 3. Inline Styles → CSS Modules | ~20 files, ~400 inline styles | 6-8 hrs | 🔄 3/20 files |
| 4. Site Structure | Breadcrumbs, boards, hashtag pills | 4 hrs | 🔄 Hashtag done, breadcrumbs+boards pending |
| 5. UI Polish | Micro-interactions, toasts, ConfirmDialog | 3 hrs | 🔄 Micro-interactions done, toasts partial, ConfirmDialog pending |
| 6. Verification | tsc, build check, docs update | 1 hr | 🔄 tsc passes, docs updated |
| **Total** | | **~18-20 hrs (2-3 days)** | **🔄 ~8-10 hrs remaining** |

**Execution order**: Phase 1 (fun, visible) → Phase 2 (quick wins) → Phase 5a (micro-interactions, visible) → Phase 3 (large but mechanical) → Phase 4 (feature work) → Phase 5b/5c (fixes) → Phase 6 (verify)
