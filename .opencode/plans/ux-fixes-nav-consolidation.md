# XistrYmemZ — UX Bug Fixes + Nav Consolidation (v2)

> Crypto removal deferred. Focus: highest-impact bugs + nav cleanup.
> Supersedes `ux-fixes-nav-consolidation.md` v1.

---

## Revised Understanding

### Z-Index Reality (not what the audit claimed)

The audit said "toasts render behind modals." The actual runtime z-index stack:

| Layer | Source | Value |
|-------|--------|-------|
| `--z-modal` | globals.css (overrides design-system.css) | **1100** |
| `--z-toast` | globals.css (overrides design-system.css) | **1200** |
| Most hardcoded modals | 19 component CSS files | **1000** |
| ConfirmDialog | hardcoded | **1100** |
| QRCodeModal | hardcoded | **1200** ← same as toast |

**The real conflict**: `QRCodeModal` (z-index:1200) equals `Toast` (var(--z-toast)=1200). Since modals render later in DOM, they stack on top. Also, `design-system.css` defines `--z-modal: 400` and `--z-toast: 500` — these are DEAD values that nothing uses because globals.css overrides them. The design-system tokens are misleading.

**Fix strategy**: Set `--z-toast: 1500` in globals.css (above all hardcoded modals). Clean up design-system.css to match. Migrate the 25 hardcoded modal z-index values to `var(--z-modal)` in a follow-up (too many files for this session).

### Navigation Reality

| File | Imports from navigation.ts |
|------|---------------------------|
| `NavSidebar.tsx` | `NAV`, `DASHBOARD_SIDEBAR_PRIMARY`, `DASHBOARD_SIDEBAR_SECONDARY` |
| `MobileNav.tsx` | `NAV` |
| `UserDropdown.tsx` | `NAV` |
| `dashboard/layout.tsx` | `BREADCRUMB_LABELS` |
| `shortcuts.ts` | `DASHBOARD_SIDEBAR_PRIMARY` |
| `BottomNav.tsx` | **Nothing** — defines its own inline array |

BottomNav has a unique shape (FAB button, dynamic profile URL, `isFab` flag) that doesn't fit the `NavItem` interface. Consolidation is only valuable for NavSidebar's two arrays.

---

## Phase 1: Foundation Fixes (5 files, ordered by dependency)

These must be done first because later phases depend on correct z-index and CSS tokens.

### 1A. `src/app/globals.css`
- **Remove duplicate z-index vars** (lines 83-88): `--z-modal: 1100`, `--z-toast: 1200` conflict with design-system.css. Instead, update design-system.css to these values (see 1B) and remove the globals.css duplicates.
- **Remove duplicate `.sr-only:focus`** (lines 460-476): design-system.css (lines 144-160) has the correct token-based version.
- **Fix mobile padding** (line 527): `padding-bottom: 80px` → `padding-bottom: calc(var(--bottom-nav-height, 64px) + 16px)`.
- **Add reduced-motion scroll reset** (after line 432): `scroll-behavior: auto` inside `@media (prefers-reduced-motion: reduce)`.

### 1B. `src/app/design-system.css`
- **Update z-index tokens** (lines 85-86): `--z-modal: 400` → `--z-modal: 1100`, `--z-toast: 500` → `--z-toast: 1500`. Toast must be above the highest hardcoded modal (QRCodeModal at 1200).
- This is the single source of truth. After this, `var(--z-toast)` resolves to 1500 everywhere.

### 1C. `src/components/BackToTop.module.css`
- **Fix bottom**: `24px` → `calc(var(--bottom-nav-height, 64px) + 16px)` (sits above BottomNav).
- **Fix z-index**: `40` → `var(--z-sticky, 200)` (above BottomNav's z-index:100).

### 1D. `src/components/Toast.module.css`
- **Fix mobile bottom** (inside `@media (max-width: 480px)`): `bottom: 16px` → `bottom: calc(var(--bottom-nav-height, 64px) + 16px)`.
- Z-index already uses `var(--z-toast, 500)` — after 1B, resolves to 1500.

### 1E. `src/components/ErrorBoundary.tsx`
- **Add `type="button"`** to try-again button (line 50).
- **Add `role="alert"`** to error container div (line 38).

---

## Phase 2: Toast System Fixes (2 files)

### 2A. `src/components/Toast.tsx`
- **Line 37**: Fix dismiss button — `\u2715` as JSX text renders literal backslash-u. Change to `×` character directly, or wrap as `{'\u2715'}`.
- **Line 29**: Conditional role — `role={toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'status'}`.
- **Line 32**: Add `type="button"`.

### 2B. `src/context/ToastContext.tsx`
- **Timeout tracking**: Store timeout IDs in a `useRef<ReturnType<typeof setTimeout>[]>`. Clear on manual dismiss (`removeToast`) and on unmount (return cleanup from a `useEffect`).
- **Duration by type**: Default durations — `error: 6000`, `warning: 5000`, `info: 4000`, `success: 3000`. Keep the `duration` param override for callers that need custom timing.
- **Max toasts**: When adding a toast, if `toasts.length >= 5`, remove the oldest. This prevents UI from being pushed around by rapid operations.

---

## Phase 3: Button Type Safety (2 files)

The remaining buttons missing `type="button"` (Toast and ErrorBoundary already covered in Phase 1-2):

### 3A. `src/components/BackToTop.tsx`
- Line 22: Add `type="button"`.

### 3B. `src/components/EmptyState.tsx`
- Line 32: Add `type="button"` to the onClick action button.

---

## Phase 4: Navigation Cleanup (2 files)

Conservative scope — fix what's broken, don't restructure what works.

### 4A. `src/lib/navigation.ts`
- **Merge sidebar arrays**: Replace `DASHBOARD_SIDEBAR_PRIMARY` and `DASHBOARD_SIDEBAR_SECONDARY` with a single `DASHBOARD_SIDEBAR` array. Add a `section: 'primary' | 'secondary'` field to each item.
- **Keep `NAV` object unchanged** — it's consumed by NavSidebar (browse mode), MobileNav, and UserDropdown with different shapes. No benefit to restructuring it.
- **Fix icon mismatches**:
  - Community item in SECONDARY: `🌐` → `👥`
  - Teaching item in SECONDARY: `📚` (keep as-is, it's more descriptive than `🏫`)

### 4B. `src/components/NavSidebar.tsx`
- Import `DASHBOARD_SIDEBAR` instead of `DASHBOARD_SIDEBAR_PRIMARY` + `DASHBOARD_SIDEBAR_SECONDARY`.
- Filter by `section` field: `primaryItems = DASHBOARD_SIDEBAR.filter(i => i.section === 'primary')`, same for secondary.
- **Fix hydration mismatch** (lines 16-21): Move `localStorage.getItem('navSidebarCollapsed')` from `useState` initializer to a `useEffect` that sets state on mount. Default to `false` on server.

### 4C. `src/lib/shortcuts.ts`
- Update import from `DASHBOARD_SIDEBAR_PRIMARY` to use `DASHBOARD_SIDEBAR.filter(i => i.section === 'primary')`.

---

## Deferred (not in this session)

| Item | Reason |
|------|--------|
| ConfirmDialog wiring (30 pages) | Mechanical but large scope — each page needs individual attention. Separate session. |
| Breadcrumbs (35 pages) | Lower impact, large scope. Separate session. |
| Migrate 25 hardcoded modal z-index to `var(--z-modal)` | 19 CSS files, each needs individual audit. Follow-up. |
| DERO/ARRR/FIRO removal | User deferred. |
| NavSidebar localStorage cleanup | Low priority, already partially addressed. |
| ErrorBoundary inline styles → CSS module | Low priority polish. |

---

## Execution Order

```
Phase 1 (Foundation) → Phase 2 (Toast) → Phase 3 (Button types) → Phase 4 (Nav)
```

Phase 1 must be first because Phase 2's toast z-index fix depends on the design-system.css token update. Phase 3 is tiny (2 lines across 2 files). Phase 4 is self-contained.

## Files Modified

| Phase | Files | Changes |
|-------|-------|---------|
| 1: Foundation | 5 (globals.css, design-system.css, BackToTop.module.css, Toast.module.css, ErrorBoundary.tsx) | CSS fixes, z-index tokens, button type |
| 2: Toast | 2 (Toast.tsx, ToastContext.tsx) | Bug fixes, timeout tracking, duration variance |
| 3: Button types | 2 (BackToTop.tsx, EmptyState.tsx) | type="button" |
| 4: Nav | 3 (navigation.ts, NavSidebar.tsx, shortcuts.ts) | Consolidate sidebar arrays, fix hydration |
| **Total** | **12 unique files** | **0 new files** |

## Verification

1. `npx tsc --noEmit` — check for type errors in all 12 files
2. `npx eslint` — check all 12 files
3. Manual: Toast should appear above QRCodeModal (z-index 1500 > 1200)
4. Manual: BackToTop and toasts should not overlap BottomNav on mobile
5. Manual: NavSidebar should not flash collapsed state on page load (hydration fix)
6. Manual: ConfirmDialog try-again button should not submit forms
