# ✅ COMPLETED — Products, Shops, Schools & Home Page Enhancements

## 1. Fix /api/products GET Route

**File: `src/app/api/products/route.ts`**

### Changes:
1. Add `pinned` query param support:
   - Add `const pinned = searchParams.get('pinned')` to param destructuring
   - Add `pinned?: boolean` to the `where` type
   - Add: `if (pinned === 'true') { where.pinned = true }`
2. Change response envelope from flat array to `{ products: [...] }`:
   - Change `return NextResponse.json(filteredProducts)` → `return NextResponse.json({ products: filteredProducts })`
3. Add `shopSlug: true` to user include select for home page compatibility

### Why:
- Home page fetches `/api/products?pinned=true` but API ignored the param
- Home page expects `data.products` but API returned a flat array
- Products page (`/products`) already handles the flat array, so need to update it too

---

## 2. Fix Products Page for New API Format

**File: `src/app/products/page.tsx`**

### Changes:
- Fix `fetchProducts` at line 143-158: change `setProducts(data)` → `setProducts(data.products || data)`
- Fix Product interface: add `shopSlug?: string | null` to user object

### Why:
- API now returns `{ products: [...] }` envelope
- Need backward compatibility for both formats

---

## 3. Fix Home Page Featured Products

**File: `src/app/page.tsx`**

### Changes:
- Fix the featured products fetch at line 87-90:
  ```tsx
  fetch('/api/products?pinned=true')
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      const products = data?.products || data || []
      if (Array.isArray(products)) setFeaturedProducts(products.slice(0, 6))
    })
  ```
- Home page already references `product.user.shopSlug` — ensure API returns it (fixed in step 1)

---

## 4. Remove Auth Gate from Shops & Schools Layouts

**File: `src/app/shops/layout.tsx`**

### Changes:
Replace the current auth-guarded layout with a public layout that shows breadcrumbs only:
```tsx
import Link from 'next/link'

export default async function ShopsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <nav className="breadcrumbs" style={{ marginBottom: '1rem', padding: '1rem 2rem', background: 'var(--bg-secondary)' }}>
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-sep">/</span>
        <span>Shops</span>
      </nav>
      {children}
    </>
  )
}
```

**File: `src/app/schools/layout.tsx`**

### Changes:
Same pattern — remove auth redirect, use public breadcrumbs.

---

## 5. Enhance Shops Page

**File: `src/app/shops/page.tsx`**

### Changes:
Add search, category filter (derived from shopAbout text), sort options, and pagination:

1. Add new state variables: `search`, `category`, `sort`
2. Derive categories from shops' shopAbout text for filter options
3. Implement client-side search filtering
4. Add sort by name, newest, product count
5. Add create shop button + "Open a Shop" CTA

**File: `src/app/shops/page.module.css`**

### Add styles for:
- `.searchBar`, `.searchInput` — search box styling
- `.filters` — filter row layout
- `.filterSelect` — dropdown styling  
- `.filterRow` — horizontal filter layout
- `.categoryBadge` — category pill badges
- `.sortSelect` — sort dropdown
- `.resultsHeader` — result count + sort bar
- `.actions` — action buttons row
- `.createBtn` — create shop button (already exists at line 27 but improve)
- `.noResults` — empty search state
- `.list` view styles (enhance existing)
- Responsive breakpoints

**File: `src/app/shops/ShopsClient.tsx`**

### Changes:
- Pass search/filter/sort props from parent
- Add category badges to shop cards
- Add price range or indicator for shops

---

## 6. Enhance Schools Page

**File: `src/app/schools/page.module.css`**

### NEW styles needed (about 25 classes are missing):
```css
/* Tabs */
.tabs { display: flex; gap: 8px; margin-bottom: 24px; }
.tab { padding: 10px 20px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: transparent; cursor: pointer; color: var(--text-secondary); font-size: 0.9rem; font-weight: 500; transition: var(--transition); }
.tab:hover { border-color: var(--accent-primary); color: var(--accent-primary); }
.tab.active { background: var(--accent-primary); color: var(--bg-primary); border-color: var(--accent-primary); }

/* Filters Bar */
.filters { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; align-items: center; }
.searchBox { flex: 1; min-width: 200px; }
.searchInput { width: 100%; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.9rem; }
.searchInput:focus { outline: none; border-color: var(--accent-primary); }
.filterSelect { padding: 10px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.9rem; cursor: pointer; }

/* Content Grid */
.contentGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
.contentCard { display: block; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow: hidden; text-decoration: none; color: inherit; transition: var(--transition); }
.contentCard:hover { border-color: var(--accent-primary); transform: translateY(-2px); }
.contentHeader { display: flex; gap: 8px; padding: 16px 16px 0; align-items: center; }
.contentType { font-size: 0.7rem; padding: 3px 10px; border-radius: 12px; font-weight: 600; text-transform: uppercase; }
.contentCard h3 { padding: 12px 16px 8px; font-size: 1.05rem; margin: 0; }
.contentMeta { padding: 0 16px; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 12px; }
.contentFooter { padding: 12px 16px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
.date { font-size: 0.8rem; color: var(--text-muted); }
.priceTag { font-size: 0.85rem; font-weight: 700; color: var(--accent-primary); }
.subTag { font-size: 0.8rem; color: var(--accent-secondary); font-weight: 600; }
.freeTag { font-size: 0.8rem; color: #22c55e; font-weight: 600; }
.createBtn { display: inline-block; background: var(--accent-primary); color: white; padding: 10px 24px; border-radius: var(--radius-md); text-decoration: none; font-weight: 600; }
.article { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.video { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.course { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
.tutorial { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.guide { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.contentCategory { font-size: 0.75rem; color: var(--text-muted); }

/* Empty State */
.empty { text-align: center; padding: 64px; color: var(--text-secondary); }
.empty a { display: inline-block; margin-top: 16px; }
```

**File: `src/app/schools/page.tsx`**

### Changes:
- Add category badges CSS class mapping for content types
- Add school card enhancements (show recent content preview, content count)
- Fix `createBtn` to use Link component with proper styling
- Add `formatContentType` function to show human-readable type

---

## 7. Refresh Home Page

**File: `src/app/page.tsx`**

### Changes:
1. **Featured Products**: Fix fetch as described in step 3
2. **Recent Requests section**: Add fetch to `/api/requests?public=true&limit=4` for a "Community Requests" horizontal scroll section
3. **Popular Plans section**: Add fetch to `/api/plans?sort=popular&limit=4`
4. **Testimonials/Mission section**: Add a dynamic rotating quote or mission statement section
5. **Activity highlights**: Show "X members • Y shops • Z products" with live counters

### New interface additions:
```typescript
interface PublicRequest {
  id: string
  title: string
  status: string
  currentFunding: number | null
  goalAmount: number | null
  user: { name: string | null }
}
```

### Data fetching additions:
```tsx
// Recent requests
fetch('/api/requests?isPublic=true&limit=4')
  .then(res => res.ok ? res.json() : null)
  .then(data => {
    if (data?.requests) setRecentRequests(data.requests.slice(0, 4))
  })
```

**File: `src/app/page.module.css`**

### New styles:
- `.requestCard` — compact request card in horizontal scroll
- `.fundingBar` — mini progress bar for funded requests
- `.testimonialSection` — quote/testimonial area
- `.activitySection` — live activity feed area
- `.activityItem` — individual activity entry

---

## Implementation Order

1. Fix `/api/products` GET route (pinned filter + envelope format)
2. Fix `/products` page to handle new API envelope
3. Fix home page featured products fetch
4. Remove auth gates from shops/schools layouts
5. Enhance shops page (search, filter, sort, CSS)
6. Enhance schools page (add all missing CSS, polish)
7. Refresh home page with dynamic sections

---

## Files to Modify (Complete List)

| # | File | Change |
|---|------|--------|
| 1 | `src/app/api/products/route.ts` | Add pinned filter, envelope format, shopSlug include |
| 2 | `src/app/products/page.tsx` | Handle `data.products` envelope |
| 3 | `src/app/page.tsx` | Fix featuredProducts, add dynamic sections |
| 4 | `src/app/shops/layout.tsx` | Remove auth redirect |
| 5 | `src/app/schools/layout.tsx` | Remove auth redirect |
| 6 | `src/app/shops/page.tsx` | Add search, filter, sort |
| 7 | `src/app/shops/page.module.css` | Add new styles |
| 8 | `src/app/shops/ShopsClient.tsx` | Enhance card display |
| 9 | `src/app/schools/page.tsx` | Polish, add category styles |
| 10 | `src/app/schools/page.module.css` | Add ~25 missing CSS classes |
| 11 | `src/app/page.module.css` | Add new section styles |
