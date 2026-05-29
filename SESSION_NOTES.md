# Session Working Notes

## Current State (d5fc86e — committed and pushed)

### ✅ Complete

**Universal Hashtag System:**
- Prisma: `SchoolContentHashtag`, `PlanHashtag`, `RequestHashtag`, `GroupHashtag`
- `src/services/hashtagService.ts` — centralized extract/link/trending across 10 entity types
- `src/components/HashtagInput.tsx` — autocomplete, keyboard nav, removable pills
- API: all create/update routes for school, plans, requests, groups extract+link hashtags
- `/api/hashtags` and `/api/hashtags/[tag]` return counts/items for all entity types
- `/hashtag/[tag]` shows 9 entity tabs with cards
- `/hashtags` browse page with entity filter buttons

**School Content Enhancement:**
- HashtagInput embedded in school content creation form
- Hashtag pills displayed on school content cards
- School API returns hashtag data with content

**Universal Entity Actions:**
- Prisma: `EntityLike`, `EntityTip`, `EntityReply` (polymorphic, covers all entity types)
- 6 toggle fields on User: `showShop`, `showSchool`, `enableTips`, `enableReplies`, `enableLikes`, `showViewCount`
- `entityType`/`entityId` added to `ContentView` for universal view tracking
- API routes: `/api/actions/{like,view,tip,reply,replies,counts}`
- `/api/users/me` extended with all toggle fields
- `src/hooks/useEntityActions.ts` — optimistic like/save, auto view recording, reply management, author settings
- `src/components/EntityActions.tsx` — unified action bar replacing every old share/action component:
  - Like ❤️ (heart+count, respects `enableLikes`)
  - Bookmark 🔖 (save/unsave via `/api/saved`, always on)
  - Reply 💬 (inline reply section, respects `enableReplies`)
  - Tip 💎 (crypto tipping, respects `enableTips`)
  - ViewCount 👁️ (respects `showViewCount`)
  - Copy Link 🔗
  - Share modal (8 social platforms + native share + share to feed)
  - More menu (Edit, Copy Link, Share to..., Share to Feed)
  - `bar` / `compact` / `full` / `modal-trigger` variants
- EntityActions injected into: `FeedItem`, `profile/[username]`, `posts/[id]`, `PlanDetailClient`, `events/[id]`, `services/[id]`, `products/[id]`, `RequestDetailClient`, `school/[slug]`, `shop/[slug]`
- Old components deleted: PostActions, ShareBar, ShareSection, ShareProfileModal, SharePostModal, ShareToPostModal, SaveButton + 6 CSS modules

**UI/UX:**
- Skeleton + EmptyState adopted across 18+ pages
- ErrorBoundary standardized (removed duplicates from dashboard + community)
- Inline styles eliminated from ShareToPostModal, error/global-error, Skeleton
- UI primitives adopted in key locations
- Separate CSS modules for error component compositions

---

### ⏳ Where to Begin Next

**1. Feature visibility toggles UI** (`src/app/profile/edit/page.tsx`)
State variables exist (`showShop`, `showSchool`, `enableTips`, `enableReplies`, `enableLikes`, `showViewCount`), save wired. Need to add the visual toggle section between the Donation section and Social Links section. Pattern to follow: the existing `acceptsDonations` checkbox toggle (lines 524-534).

**2. HashtagInput embedding** — still not embedded in forms for:
- Events: `events/new/EventForm.tsx`
- Plans: `PlanDetailClient.tsx`
- Requests: `RequestsClient.tsx`
- Groups: `groups/page.tsx` and `groups/[id]/page.tsx`

Backend API routes already handle hashtags. The `HashtagInput` component already exists. Need to import + add state + pass in POST/PUT body.

**3. Hashtag tab icons** (`/hashtag/[tag]/page.tsx`)
`TABS` array has `{ key, label }` but no icons. Copy the `ENTITY_FILTERS` icon pattern from `/hashtags/page.tsx` to add emoji icons to the tab bar.

**4. Hero section CTA icons** (`HeroSection.tsx`)
Add emoji icons to all CTA buttons + add 🏷️ Hashtags link.

---

### Git Log (relevant commits)
```
d5fc86e feat: inject EntityActions into all entity pages, remove old action components
ed4f5f6 feat: universal entity actions + per-user feature toggles
b5c84da feat: share bar, backlink system, and related items
c9b626c feat: universal hashtag system + school content hashtag integration + UI/UX passes 1-4
```
