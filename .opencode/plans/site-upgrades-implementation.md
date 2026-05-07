# Site Upgrades — Implementation Plan

## Step 1: Fix Products API

**File**: `src/app/api/products/route.ts`

### 1a. Add `pinned` query param
After line 19 (`const radius = ...`), add:
```
const pinned = searchParams.get('pinned')
```

### 1b. Add to where type + condition
Line 37: Change where type to include `pinned?: boolean`
```typescript
const where: { published: boolean; pinned?: boolean; category?: string; type?: string; location?: string; user?: { shopSlug: string }; userId?: string; OR?: Record<string, unknown>[] } = { published: true }
```

After line 38 (`if (pinned === 'true')`), add:
```typescript
if (pinned === 'true') {
  where.pinned = true
}
```

### 1c. Add shopSlug to user include
Line 58: Change `user: { select: { name: true, location: true, neighborhood: true } }`
To: `user: { select: { name: true, location: true, neighborhood: true, shopSlug: true } }`

### 1d. Change response to envelope
Line 81: Change `return NextResponse.json(filteredProducts)`
To: `return NextResponse.json({ products: filteredProducts })`

---

## Step 2: Fix Products Page for Envelope Format

**File**: `src/app/products/page.tsx`

### 2a. Add shopSlug to Product interface
Line 48: Change `user: { name: string | null }`
To: `user: { name: string | null; shopSlug?: string | null }`

### 2b. Handle envelope in fetchProducts
Lines 153-155: Change:
```typescript
.then(data => {
  setProducts(data)
  setFilteredProducts(data)
```
To:
```typescript
.then(data => {
  const items = Array.isArray(data) ? data : data?.products || []
  setProducts(items)
  setFilteredProducts(items)
```

---

## Step 3: Remove Auth Gates

**File**: `src/app/shops/layout.tsx`

Replace entire file with:
```typescript
import Link from 'next/link'

export default function ShopsLayout({
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

**File**: `src/app/schools/layout.tsx`

Replace entire file with:
```typescript
import Link from 'next/link'

export default function SchoolsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <nav className="breadcrumbs" style={{ marginBottom: '1rem', padding: '1rem 2rem', background: 'var(--bg-secondary)' }}>
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-sep">/</span>
        <span>Learning</span>
      </nav>
      {children}
    </>
  )
}
```

---

## Step 4: Add Missing Schools CSS

**File**: `src/app/schools/page.module.css`

Replace entire file with the complete CSS (current 129 lines → ~220 lines). Add these missing classes:

```css
/* Tabs */
.tabs { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
.tab { padding: 10px 20px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: transparent; cursor: pointer; color: var(--text-secondary); font-size: 0.9rem; font-weight: 500; transition: var(--transition); }
.tab:hover { border-color: var(--accent-primary); color: var(--accent-primary); }
.tab.active { background: var(--accent-primary); color: var(--bg-primary); border-color: var(--accent-primary); }

/* Filters */
.filters { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; align-items: center; }
.searchBox { flex: 1; min-width: 200px; }
.searchInput { width: 100%; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.9rem; }
.searchInput:focus { outline: none; border-color: var(--accent-primary); }
.filterSelect { padding: 10px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.9rem; cursor: pointer; }

/* Content Grid */
.contentGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
.contentCard { display: block; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow: hidden; text-decoration: none; color: inherit; transition: var(--transition); }
.contentCard:hover { border-color: var(--accent-primary); transform: translateY(-2px); }
.contentHeader { display: flex; gap: 8px; padding: 16px 16px 0; align-items: center; flex-wrap: wrap; }
.contentType { font-size: 0.7rem; padding: 3px 10px; border-radius: 12px; font-weight: 600; text-transform: uppercase; }
.contentCategory { font-size: 0.75rem; color: var(--text-muted); }
.contentCard h3 { padding: 12px 16px 8px; font-size: 1.05rem; margin: 0; }
.contentMeta { padding: 0 16px; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 12px; }
.contentFooter { padding: 12px 16px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
.date { font-size: 0.8rem; color: var(--text-muted); }
.priceTag { font-size: 0.85rem; font-weight: 700; color: var(--accent-primary); }
.subTag { font-size: 0.8rem; color: var(--accent-secondary); font-weight: 600; }
.freeTag { font-size: 0.8rem; color: #22c55e; font-weight: 600; }
.createBtn { display: inline-block; margin-top: 1rem; background: var(--accent-primary); color: white; padding: 10px 24px; border-radius: var(--radius-md); text-decoration: none; font-weight: 600; }

/* Content type colors */
.article { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.video { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.course { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
.tutorial { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.guide { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
```

Also update the `.empty` class to match the new createBtn:
```css
.empty { text-align: center; padding: 64px; color: var(--text-secondary); }
.empty a { display: inline-block; margin-top: 16px; }
```

---

## Step 5: Enhance Shops Page

**File**: `src/app/shops/page.tsx`

Add search input, category filter, and sort to the page:
- Add `search`, `categoryFilter`, and `sortBy` state variables
- Derive categories from shops' `shopAbout` text (using first word as category heuristic)
- Implement client-side filtering
- Pass filter props to `ShopsClient`

**File**: `src/app/shops/ShopsClient.tsx`

Accept search/filter props and add:
- Category badges on card display
- Animated entrance on cards
- Hover enhancements

---

## Step 6: Refresh Home Page

**File**: `src/app/page.tsx`

Add these sections after the featured products section:
1. **Recent Community Requests** — fetch from `/api/requests?isPublic=true&limit=4`
2. **Active Plans** — fetch from `/api/plans?status=ACTIVE&limit=4` (if endpoint exists)
3. **Call to action refinements** — already in place, minor polish
4. **Live stats counter animation** — animate from 0 to actual value

Add these interfaces:
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

And state:
```typescript
const [recentRequests, setRecentRequests] = useState<PublicRequest[]>([])
```

Add to useEffect:
```typescript
fetch('/api/requests?isPublic=true&take=4')
  .then(res => res.ok ? res.json() : null)
  .then(data => {
    const list = data?.requests || (Array.isArray(data) ? data : [])
    if (Array.isArray(list)) setRecentRequests(list.slice(0, 4))
  })
  .catch(() => {})
```

---

## Implementation Order (Dependency-Aware)

```
Step 1 (API) → Step 2 (Products Page) — API change breaks products page
Step 3 (Auth Gates) — independent, can
Step 4 (Schools CSS) — independent, can 
Step 5 (Shops Enhancement) — depends on Step 3
Step 6 (Home Refresh) — depends on Step 1 (featured products fix)
```
