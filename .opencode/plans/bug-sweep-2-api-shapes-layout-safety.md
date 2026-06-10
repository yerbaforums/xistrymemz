# Bug Sweep 2: API Shape Mismatches, Layout, Safety

> **Source**: Full codebase audit scan
> **Scope**: All 19 findings, prioritized by severity

---

## 🔴 Critical — 7 API Shape Mismatches

| # | File | Line | Problem | Fix |
|---|------|------|---------|-----|
| 1 | `src/app/community/groups/page.tsx` | 31 | `setGroups(data)` where API returns `{items: [...]}` | `data.items \|\| []` |
| 2 | `src/app/community/page.tsx` | 130 | `setGroups(groupsData)` gets `{items: [...]}` | `groupsData?.items \|\| []` |
| 3 | `src/app/community/page.tsx` | 135 | `setMarketRequests(requestsData)` gets `{items: [...]}` | `requestsData?.items \|\| []` |
| 4 | `src/app/onboarding/page.tsx` | 163 | `Array.isArray(data)` false, groups silently empty | `data?.items \|\| []` |
| 5 | `src/app/onboarding/page.tsx` | 178 | `Array.isArray(data)` false, hashtag results never show | `data.hashtags` instead of `data` |
| 6 | `src/app/groups/[id]/page.tsx` | 449 | **`data.slice(0, 10)` throws TypeError** | `data?.items?.slice(0, 10) \|\| []` |
| 7 | `src/app/dashboard/marketplace/page.tsx` | 185 | `setProducts(productsData)` gets `{items: [...]}` | `productsData?.items \|\| []` |

## 🟠 High — Functional Logic Bugs

| # | File | Issue | Fix |
|---|------|-------|-----|
| 8 | `src/app/dashboard/feed/page.tsx:109,121` | Stale closure in `setOffset(currentOffset + ...)` | Use `setOffset(prev => prev + data.feed.length)` |
| 9 | `src/app/groups/page.tsx:117` | Stale closure in `setGroups([newGroup, ...groups])` | Use `setGroups(prev => [newGroup, ...prev])` |
| 10 | `src/app/dashboard/overview/page.tsx:480` | Index-as-key in `.map()` | Use stable item ID as key |

## 🟡 Medium — Unsafe Access + CSS

| # | Issue | Scope |
|---|-------|-------|
| 11 | Unsafe `.toFixed()` calls (no null guard) | 33+ instances across codebase |
| 12 | Unsafe `.map()`/`.filter()` on potentially undefined arrays | 10+ instances |
| 13 | Leaflet popups (z-index 700) above modals (z-index 400) | Cross-system z-index conflict |
| 14 | Async `useEffect` fetches without AbortController | 18+ files |
| 15 | Admin subscribers modal at z-index 100 (same as header) | `page.module.css:195` |

## 🔵 Low — Code Quality

| # | Issue |
|---|-------|
| 16 | Duplicate CSS vars in `design-system.css` vs `globals.css` |
| 17 | 20+ unused design tokens |
| 18 | `color-mix()` in 32 places (92% browser support) |
| 19 | Direct DOM queries instead of refs (6 instances) |
