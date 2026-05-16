# Session Goal: Product & Shop UI Improvements

## Tasks Completed (build mode needed to finalize)

### Product Improvements (Phase 4)
- **C. Homepage featured products fix** — Changed `fetchProducts` from `pinned=true` to `limit=6`, added `take` param support to GET `/api/products`
- **A. Payment/payout hiding** — ProductDetailPage, ProductQuickViewModal, ProductCard now hide cart/escrow buttons entirely when `!enableCheckout` (instead of just disabling)
- **B. Hashtag editing in all product forms** — Added hashtag input to dashboard marketplace, my-listings, and shop setup forms. Added hashtag upsert logic to PUT `/api/products/[id]`

### QR Button in Support This Shop
- Added `qrDonation` state, `onQrClick` prop on `DonationActions`, and `QRCodeModal` render in `src/app/shop/[slug]/page.tsx`

### FIRO Logo
- User has icon-only symbol files at `/home/xb4zy/Downloads/firo-logo-files/Symbol/Firo symbol.svg` (color version with white circle + red mark)
- Need to convert SVG to PNG and replace `public/crypto-logos/firo.png`

## Tasks Remaining (awaiting build mode)

### DnD Reordering for Donation Addresses
**File:** `src/app/profile/edit/page.tsx` — 3 edits detailed in `donation-dnd-reorder.md`

### FIRO Logo Swap
**File:** Replace `public/crypto-logos/firo.png` with the color symbol from the user's files
- Source: `/home/xb4zy/Downloads/firo-logo-files/Symbol/Firo symbol.svg`
- Convert to reasonable PNG size (256x256 or similar)
