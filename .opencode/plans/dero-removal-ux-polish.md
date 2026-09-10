# DERO/ARRR/FIRO Removal + UX Bug Fixes + Nav Consolidation

> **SUPERSEDED** — crypto slim-down is done (now broader: XMR/XTM/ZANO/FUSD, see `session-notes.md` Session 2) and the wallet/escrow gut is complete. This file is historical reference/checklist; items still relevant have been folded into `session-notes.md` Session 2. Left intact for audit trail.

## Phase 1: Crypto Removal (DERO + ARRR + FIRO)

### 1A. Core Libraries (4 files)

**`src/lib/crypto-icons.ts`**
- Remove DERO entry from LOGO_URLS (line 17) and CRYPTO_ICONS (lines 72-78)
- Remove ARRR entry from LOGO_URLS (line 16) and CRYPTO_ICONS (lines 65-71)
- Remove FIRO entry from LOGO_URLS and CRYPTO_ICONS (lines ~18, 79-84)

**`src/lib/prices.ts`**
- Remove DERO from COINGECKO_IDS (line 15) and FALLBACK_PRICES (line 28)
- Remove ARRR from COINGECKO_IDS (line 14) and FALLBACK_PRICES (line 27)
- Remove FIRO from COINGECKO_IDS (line 18) and FALLBACK_PRICES (line 30)

**`src/lib/constants.ts`**
- Remove DERO (line 9), ARRR (line 8), FIRO (line 10) from CRYPTO_LOGOS

**`src/lib/wallet.ts`**
- Remove DERO case from address prefix switch (line 140)
- Remove ARRR case from address prefix switch (line 139)
- Remove ARRR + DERO from wallet generation switch (lines 168-169)
- Remove ARRR + DERO from validation switch (lines 189-190)
- FIRO is already missing from all switches (no change needed)

### 1B. API Routes (6 files)

**`src/app/api/admin/wallets/route.ts`**
- Remove ARRR and DERO from CRYPTO_TYPES array (line 7)
- Remove ARRR and DERO from CRYPTO_NAMES (lines 16-17)
- Also remove FIRO if present (check current state)

**`src/app/api/crypto/sync/route.ts`**
- Remove `adminArrrWallet`, `adminDeroWallet` from walletFields (lines 113-114)
- Remove ARRR and DERO from comment (line 13)
- Keep adminZanoWallet (ZANO stays)

**`src/app/api/forum/tip-options/route.ts`**
- Remove ARRR entry (line 36) and DERO entry (line 37)

**`src/app/api/posts/tip-options/route.ts`**
- Remove ARRR entry (line 30) and DERO entry (line 31)

**`src/app/api/forum/tip-post/route.ts`**
- Remove ARRR: 200 and DERO: 50 from CRYPTO_RATES (lines 9-10)

**`src/app/api/posts/tip/route.ts`**
- Remove ARRR: 200 and DERO: 50 from CRYPTO_RATES (line 7)

### 1C. UI Pages & Components (8 files)

**`src/app/wallet/page.tsx`**
- Remove ARRR (line 36) and DERO (line 37) from cryptoOptions array
- FIRO is already absent

**`src/app/checkout/page.tsx`**
- Remove getCryptoInfo('ARRR') (line 37) and getCryptoInfo('DERO') (line 38)

**`src/app/onboarding/page.tsx`**
- Remove `<option value="ARRR">ARRR</option>` (line 590)
- Remove `<option value="DERO">DERO</option>` (line 591)

**`src/app/products/[id]/ProductDetailClient.tsx`**
- Remove ARRR (line 109), DERO (line 110), FIRO (line 112) from CRYPTO_DISPLAY

**`src/app/projects/[id]/ProjectSupport.tsx`**
- Remove ARRR (line 241), DERO (line 242), FIRO (line 244) from currency select

**`src/components/DonationAddressPicker.tsx`**
- Remove ARRR (line 15), DERO (line 16), FIRO (line 18) from CURRENCIES

### 1D. Schema (1 file, comments only — no migration needed)

**`prisma/schema.prisma`**
- Update sellerCryptoCurrency comment (line 829): remove ARRR, DERO
- Update cryptoCurrency comment (line 1561): remove ARRR, DERO, FIRO

### 1E. Cleanup (2 files)

**`public/crypto-logos/dero.png`** — delete
**`public/crypto-logos/pirate-chain.png`** — delete
**`public/crypto-logos/firo.png`** — delete (if exists)

**`PHASE2_IMPROVEMENTS.md`** — update line 4: remove "DERO delisting" deferred note

---

## Phase 2: High-Priority UX Bug Fixes

### 2A. Toast.tsx Fixes (1 file)

**`src/components/Toast.tsx`**
- **Line 37**: Fix `\u2715` — change to `{String.fromCharCode(0x2715)}` or just `×` character directly
- **Line 29**: Change `role="alert"` to be conditional — `role="alert"` for errors/warnings, `role="status"` for success/info
- **Line 32-38**: Add `type="button"` to dismiss button

### 2B. Z-Index Conflict (2 files)

**`src/app/globals.css`**
- Remove duplicate `.sr-only:focus` (lines 460-476) — the design-system.css version (lines 144-160) already has the correct token-based version
- Remove duplicate z-index variable definitions (lines 83-88) — design-system.css is the source of truth

**`src/app/design-system.css`**
- Update `--z-modal: 400` → `--z-modal: 1100` and `--z-toast: 500` → `--z-toast: 1200` to match actual usage (modals use 1000+, toasts use 1200)
- This ensures `var(--z-toast)` renders ABOVE modals

### 2C. Mobile BottomNav Overlap (2 files)

**`src/components/BackToTop.module.css`**
- Change `bottom: 24px` to `bottom: calc(var(--bottom-nav-height, 64px) + 16px)` so it sits above the BottomNav

**`src/components/Toast.module.css`**
- Change `bottom: 16px` (mobile) to `bottom: calc(var(--bottom-nav-height, 64px) + 16px)` so toasts sit above the BottomNav

### 2D. Mobile Padding Fix (1 file)

**`src/app/globals.css`**
- Line 527: Change `padding-bottom: 80px` to `padding-bottom: calc(var(--bottom-nav-height, 64px) + 16px)` to use the design token

### 2E. Reduced Motion Fix (1 file)

**`src/app/globals.css`**
- Add `scroll-behavior: auto` inside the `@media (prefers-reduced-motion: reduce)` block (after line 432)

### 2F. Button Type Safety (4 files)

Add `type="button"` to all buttons missing it:
- `src/components/Toast.tsx` line 32 (dismiss button)
- `src/components/BackToTop.tsx` line 22
- `src/components/ErrorBoundary.tsx` line 50 (try again button)
- `src/components/EmptyState.tsx` line 32

### 2G. ToastContext Improvements (1 file)

**`src/context/ToastContext.tsx`**
- Vary duration by type: error=6000ms, warning=5000ms, info=4000ms, success=3000ms
- Track timeouts in an array; clear all on unmount and on manual dismiss
- Add max toast limit (5 visible at a time)

---

## Phase 3: Navigation Consolidation

### 3A. Create shared nav config (1 new file)

**`src/lib/navigation.ts`** — already exists, refactor it

Current state: 4 overlapping arrays:
- `NAV.dashboard` (19 items)
- `NAV.more` (8 items)
- `DASHBOARD_SIDEBAR_PRIMARY` (11 items)
- `DASHBOARD_SIDEBAR_SECONDARY` (11 items)

Fix: Consolidate into a single `DASHBOARD_NAV` array with a `section: 'primary' | 'secondary'` field. Remove duplicate icon definitions. One icon per route.

Icon mismatches to fix:
- `/community`: sidebar uses `🌐`, NAV uses `👤` → standardize to `👥`
- `/teaching`: sidebar uses `📚`, NAV uses `🏫` → standardize to `📚`

### 3B. Refactor NavSidebar (1 file)

**`src/components/NavSidebar.tsx`**
- Import from consolidated `DASHBOARD_NAV`
- Derive primary/secondary arrays via filter
- Fix hydration mismatch (lines 16-21): move localStorage read into useEffect

### 3C. Refactor BottomNav (1 file)

**`src/components/BottomNav.tsx`**
- Import nav items from shared config
- Remove duplicate Create FAB definition
- Combine the duplicate `next/navigation` imports (lines 4-5)

---

## Phase 4: Verification

1. `npx tsc --noEmit` — grep for DERO/ARRR/FIRO to confirm no stragglers
2. `npx eslint` on all modified files
3. Verify checkout, wallet, onboarding pages render without DERO/ARRR/FIRO options
4. Verify toast z-index: toast should appear above modals
5. Verify BackToTop and toasts don't overlap BottomNav on mobile
