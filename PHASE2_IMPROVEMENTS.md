# XistrYmemZ — Phase 2 Improvements

> **v2.0 — Local Business Listings, Onboarding, Badges, Reviews, Requests, Projects, Events, Cross-Feature Integration & Mass Adoption UX.**
> **Excludes**: DERO delisting and ootle L2 integration (deferred).
> **Estimated effort**: 25-32 days across 8 streams.

---

## Stream A: Local Business Listing Adoption & UX (3-4 days)

### A1. Directory Page Enhancement
| Item | File | Change |
|------|------|--------|
| Featured carousel | `src/app/directory/page.tsx` | Add "Featured & Approved" row at top (requires `isApproved` from Stream C) |
| CTA for non-auth | `src/app/directory/page.tsx` | "Add Your Business" banner for unauthenticated visitors |
| Sort options | `src/app/directory/page.tsx` | Add "Most Reviewed" and "Nearest" sorts |
| Richer cards | `src/app/directory/page.tsx` | Show rating stars, verification badge, product count on each card |
| Geo-auto-filter | `src/app/directory/page.tsx` | Use `usePassportLocation` for proximity-based filtering |
| API extension | `src/app/api/directory/route.ts` | Return `avgRating`, `ratingCount`, `verificationLevel`, `isApproved` per entity |

### A2. Shop Listing Improvements
| Item | File | Change |
|------|------|--------|
| Rating on cards | `src/app/shops/ShopsClient.tsx:87-120` | Show rating stars + review count on shop cards |
| Verification badge | `src/app/shops/ShopsClient.tsx` | Show badge component inline on card |
| Claim business | `src/app/shops/ShopsClient.tsx` | "Claim This Business" CTA for unclaimed profiles |
| Map popups | `src/app/shops/ShopsClient.tsx:138-144` | Show thumbnail, rating, "Visit Shop" button in popup |

### A3. Product Listing Adoption
| Item | File | Change |
|------|------|--------|
| Quick List wizard | `src/app/products/page.tsx` | 3-step modal: photo → title+price → done (from "List Item" CTA at line 441) |
| Listing templates | `src/app/products/page.tsx` | Category-based presets (Furniture pre-fills condition, Digital pre-fills remote) |
| Seller badge | `src/app/products/page.tsx` | Show verification badge on product cards |
| Listing management | `src/app/products/page.tsx:590-773` | Bulk publish/hide toggle, view count stats per listing |

### A4. Service Listing Adoption
| Item | File | Change |
|------|------|--------|
| Provider badge | `src/app/services/page.tsx` | Show verification + rating on service cards |
| "Offer This" CTA | `src/app/services/page.tsx` | For users without services: link to creation flow |
| Booking CTA | `src/app/services/page.tsx:330-413` | Prominent "Book Now" in detail modal, availability preview |

### A5. Business Profile Completeness Widget
| Item | File | Change |
|------|------|--------|
| New component | `src/components/BusinessProfileChecklist.tsx` | Checklist: name, description, cover image, products, location, payout address. Progress bar. Links to Stream C badge. |
| New CSS | `src/components/BusinessProfileChecklist.module.css` | Styles for checklist |

---

## Stream B: Onboarding Tidy-Up (1-1.5 days)

### B1. Step Consolidation
| Item | File | Change |
|------|------|--------|
| Merge steps | `src/app/onboarding/page.tsx` | Combine "class-setup" + "tour" into one step (side-by-side layout). Reduce 6 steps → 5. |
| Featured outlets | `src/app/onboarding/page.tsx` | Reduce tour from 13 outlets to 6: Marketplace, Community, Projects, Events, Services, Discover |
| Skip buttons | `src/app/onboarding/page.tsx` | Add "Skip for now" on every step (currently inconsistent) |
| OAuth pre-fill | `src/app/onboarding/page.tsx` | Pre-fill name/email from OAuth session in profile step |

### B2. Post-Onboarding Actions
| Item | File | Change |
|------|------|--------|
| Updated tour | `src/data/onboarding-tour.tsx` | 5 guided steps: Create listing → Set up shop → Connect member → Join group → Explore map |

### B3. Dashboard Setup Banner
| Item | File | Change |
|------|------|--------|
| Persistent banner | `src/app/dashboard/layout.tsx:22-57` | "Complete Your Setup" banner when `onboardingCompleted = false`. Checklist of missing steps, "Resume" button. |

### B4. Welcome Modal
| Item | File | Change |
|------|------|--------|
| New component | `src/components/WelcomeModal.tsx` | First-login modal with 3 quick actions. Stored in localStorage. |
| New CSS | `src/components/WelcomeModal.module.css` | Modal styles |

---

## Stream C: Approval Badge / Quality Recognition System (3-4 days)

Admin-only badge awarding. Badge model (8 types, 5 tiers) exists in schema but has zero implementation.

### C1. Schema Extension
| Item | File | Change |
|------|------|--------|
| Approval fields | `prisma/schema.prisma` | Add `isApproved Boolean @default(false)`, `approvedAt DateTime?`, `approvedBy String?` to Product model. Add `isShopApproved Boolean @default(false)`, `shopApprovedAt DateTime?` to User model. |

### C2. Badge API
| Item | File | Change |
|------|------|--------|
| Admin badge CRUD | `src/app/api/admin/badges/route.ts` | `GET` list badges (filter by user/type/tier), `POST` award badge |
| Badge detail | `src/app/api/admin/badges/[id]/route.ts` | `PUT` update, `DELETE` revoke |
| Public badges | `src/app/api/users/[id]/badges/route.ts` | `GET` all badges for a user |

### C3. Quality Scoring Service
| Item | File | Change |
|------|------|--------|
| New service | `src/services/qualityService.ts` | `computeProfileQuality(userId)` → 0-100 (name/bio/avatar/location/verification/ratings). `computeListingQuality(productId)` → 0-100 (description/images/price/views/ratings). `computeShopQuality(userId)` → 0-100 (profile+products+ratings+cover). |

### C4. Badge UI Components
| Item | File | Change |
|------|------|--------|
| Badge display | `src/components/QualityBadge.tsx` | Tier-colored badge (BRONZE=#CD7F32, SILVER=#C0C0C0, GOLD=#FFD700, PLATINUM=#E5E4E2, DIAMOND=#B9F2FF). Tooltip with name/description/date. |
| Approval badge | `src/components/ApprovalBadge.tsx` | Green checkmark "Approved" for quality threshold >= 80. Clickable → quality breakdown. |

### C5. Badge Display Integration
| Item | File | Change |
|------|------|--------|
| Profile badges | `src/app/profile/[username]/ProfileDetailClient.tsx:880` | Horizontal scrollable badge row between verification badges and reputation score |
| Shop header | `src/app/shop/[slug]/ShopDetailClient.tsx:344` | Approval badge in shop header (near RoleBadge) |
| Product cards | `src/components/ProductCard.tsx` | "Approved" badge overlay on product cards |

### C6. Admin Badge Management
| Item | File | Change |
|------|------|--------|
| Admin page | `src/app/admin/badges/page.tsx` | Badge table, award form, revoke with confirmation, quality score overview |
| Admin CSS | `src/app/admin/badges/page.module.css` | Page styles |
| Navigation | `src/lib/navigation.ts` | Add "Badges" to admin nav |

---

## Stream D: Feedback & Reviews Improvements (2-3 days)

### D1. Rating Model Expansion
| Item | File | Change |
|------|------|--------|
| Schema change | `prisma/schema.prisma:1450-1466` | Change `@@unique([raterId, userId])` → `@@unique([raterId, userId, productId])`. Add `ratingImages String?` field. |
| New model | `prisma/schema.prisma` | `ReviewVote { id, ratingId, userId, helpful Boolean, createdAt, @@unique([ratingId, userId]) }` |
| New model | `prisma/schema.prisma` | `ReviewResponse { id, ratingId, userId, content String, createdAt, @@unique([ratingId, userId]) }` |

### D2. Rating Component Enhancement
| Item | File | Change |
|------|------|--------|
| Photo upload | `src/components/Rating.tsx` | Add `ImageUploader` in review form, store URLs in `ratingImages` JSON |
| Image display | `src/components/Rating.tsx:191-212` | Show uploaded image thumbnails below review comment |
| Helpful voting | `src/components/Rating.tsx` | "X people found this helpful" button below each review |

### D3. Review Response API
| Item | File | Change |
|------|------|--------|
| Response API | `src/app/api/ratings/[id]/respond/route.ts` | `POST` create response (owner only), `DELETE` remove |
| Vote API | `src/app/api/ratings/[id]/vote/route.ts` | `POST` toggle helpful vote |
| Response UI | `src/components/Rating.tsx` | "Respond" button for rated user, response display below review |

### D4. Site-Wide Feedback System
| Item | File | Change |
|------|------|--------|
| Enhanced section | `src/components/home/FeedbackSection.tsx` | Replace static cards with mini-form (category + message + submit) + "Recent Community Feedback" row. Keep Open Source and Vision cards. |
| Feedback page | `src/app/feedback/page.tsx` | Full form: category, message, email, screenshot. "My Submissions" with status. |
| Feedback CSS | `src/app/feedback/page.module.css` | Page styles |
| Feedback API | `src/app/api/feedback/route.ts` | `POST` create, `GET` list own (authenticated) |
| Admin feedback | `src/app/admin/feedback/page.tsx` | Table with status filter, mark reviewed, respond |
| Admin CSS | `src/app/admin/feedback/page.module.css` | Page styles |
| Navigation | `src/lib/navigation.ts` | Add "Feedback" to admin nav |

### D5. Review Prompt Component
| Item | File | Change |
|------|------|--------|
| New component | `src/components/ReviewPrompt.tsx` | Post-transaction review modal: after escrow released, event attendance, service completion |
| New CSS | `src/components/ReviewPrompt.module.css` | Modal styles |

---

## Stream E: Community Requests & Projects Flow (3-4 days)

### E1. Request Templates
| Item | File | Change |
|------|------|--------|
| Templates | `src/components/RequestForm.tsx` | Pill-button template selector: "Looking for Service" (SERVICE/MEDIUM), "Funding Needed" (FUNDING+budget), "Collaboration" (COLLABORATION), "Lost & Found" (GENERAL/HIGH), Custom (blank) |

### E2. Request Matching
| Item | File | Change |
|------|------|--------|
| Match API | `src/app/api/requests/matches/route.ts` | GET: match request category + location → top 5 services/products with distance |
| Match UI | `src/app/requests/[id]/RequestDetailClient.tsx` | "Matching Services" section: up to 3 matches with distance, rating, price. Only when PENDING + `allowFulfillments`. |

### E3. Request Progress Tracking
| Item | File | Change |
|------|------|--------|
| Schema | `prisma/schema.prisma` | Add `assigneeId String?` + relation to Request model |
| Progress bar | `src/app/requests/[id]/RequestDetailClient.tsx` | 3-segment visual bar: PENDING → IN_PROGRESS → COMPLETED |
| "In Progress" button | `src/app/requests/[id]/RequestDetailClient.tsx` | "Mark In Progress" when APPROVED (owner/assignee/admin) |
| Deadline countdown | `src/app/requests/[id]/RequestDetailClient.tsx` | Days/hours remaining, red if overdue |
| Assign API | `src/app/api/requests/[id]/assign/route.ts` | POST: assign request to user (owner/admin only) |
| In-progress API | `src/app/api/requests/[id]/in-progress/route.ts` | POST: transition APPROVED → IN_PROGRESS |

### E4. Request Notifications
| Item | File | Change |
|------|------|--------|
| Fulfillment notify | `src/app/api/requests/[id]/fulfillments/route.ts` | Create notification on new fulfillment offer |
| Support notify | `src/app/api/requests/[id]/support/route.ts` | Create notification on new support |
| Assign notify | `src/app/api/requests/[id]/in-progress/route.ts` | Notify owner on status change |

### E5. Project Owner Dashboard
| Item | File | Change |
|------|------|--------|
| New component | `src/components/ProjectDashboard.tsx` | Stats row, activity feed, quick actions, milestone progress, linked requests summary |
| New CSS | `src/components/ProjectDashboard.module.css` | Dashboard styles |
| Tab integration | `src/app/projects/[id]/ProjectDetailClient.tsx:93-100` | Add "Dashboard" tab for owners, render `ProjectDashboard` |

### E6. Project Join Enhancement
| Item | File | Change |
|------|------|--------|
| Schema | `prisma/schema.prisma` | Add `message String?` to ProjectJoiner model |
| Join message | `src/app/api/projects/[id]/join/route.ts` | Accept optional `message` in POST body, store on joiner |
| Joiner display | `src/app/projects/[id]/ProjectDetailClient.tsx` | Show joiner messages + user skills/interests tags |

### E7. Project Milestone Visualization
| Item | File | Change |
|------|------|--------|
| Timeline | `src/app/projects/[id]/ProjectMilestones.tsx` | Horizontal bar chart: milestones on x-axis, color by priority (critical=red, high=orange, medium=yellow, low=blue). Completed=checkmark, overdue=red highlight. CSS/SVG only. |

### E8. Request ↔ Project Linking
| Item | File | Change |
|------|------|--------|
| Link button | `src/app/requests/[id]/RequestDetailClient.tsx` | "Link to Project" button (owner only), modal to select project |
| Project context | `src/app/projects/[id]/ProjectDetailClient.tsx` | Improved linked requests: status badges, funding progress bars, "Create Request" shortcut |

---

## Execution Order

| Week | Streams | Notes |
|------|---------|-------|
| 1 | C (schema + scoring + badge API) → A (directory/shops/products/services) | C schema must come first — A components use badges |
| 2 | D (reviews + feedback) → B (onboarding) | D and B are independent, can parallelize |
| 3 | E (requests & projects) | E is independent of A-D |

## Dependencies

- **C1 (schema)** → A1-A5, C4-C5 (listing UX uses approval badges)
- **C4-C5 (badge components)** → A2, A3, A4 (cards show badges)
- **D1 (Rating schema)** → D2-D3 (component/API work)
- **E1-E8** are mostly independent

## Prisma Migration

Single migration after all schema changes (C1 + D1 + D3 + E3):

```bash
npx prisma migrate dev --name add-badges-reviews-request-improvements
```

**Risk**: Changing `@@unique([raterId, userId])` to `@@unique([raterId, userId, productId])` — check `dev.db` for existing ratings with `productId = null` before migrating.

## New Files (19)

| File | Stream |
|------|--------|
| `src/components/QualityBadge.tsx` | C |
| `src/components/ApprovalBadge.tsx` | C |
| `src/components/BusinessProfileChecklist.tsx` | A |
| `src/components/ReviewPrompt.tsx` | D |
| `src/components/ProjectDashboard.tsx` | E |
| `src/components/WelcomeModal.tsx` | B |
| `src/services/qualityService.ts` | C |
| `src/app/api/admin/badges/route.ts` | C |
| `src/app/api/admin/badges/[id]/route.ts` | C |
| `src/app/api/users/[id]/badges/route.ts` | C |
| `src/app/api/feedback/route.ts` | D |
| `src/app/api/ratings/[id]/respond/route.ts` | D |
| `src/app/api/ratings/[id]/vote/route.ts` | D |
| `src/app/api/requests/matches/route.ts` | E |
| `src/app/api/requests/[id]/assign/route.ts` | E |
| `src/app/api/requests/[id]/in-progress/route.ts` | E |
| `src/app/admin/badges/page.tsx` | C |
| `src/app/admin/feedback/page.tsx` | D |
| `src/app/feedback/page.tsx` | D |

## Modified Files (~18)

| File | Streams |
|------|---------|
| `prisma/schema.prisma` | C, D, E |
| `src/app/directory/page.tsx` | A |
| `src/app/shops/ShopsClient.tsx` | A |
| `src/app/products/page.tsx` | A |
| `src/app/services/page.tsx` | A |
| `src/app/onboarding/page.tsx` | B |
| `src/app/dashboard/layout.tsx` | B |
| `src/data/onboarding-tour.tsx` | B |
| `src/app/profile/[username]/ProfileDetailClient.tsx` | C |
| `src/app/shop/[slug]/ShopDetailClient.tsx` | C |
| `src/components/ProductCard.tsx` | C |
| `src/components/Rating.tsx` | D |
| `src/components/home/FeedbackSection.tsx` | D |
| `src/app/requests/[id]/RequestDetailClient.tsx` | E |
| `src/app/projects/[id]/ProjectDetailClient.tsx` | E |
| `src/app/projects/[id]/ProjectMilestones.tsx` | E |
| `src/components/RequestForm.tsx` | E |
| `src/lib/navigation.ts` | C, D |

---
---

## Stream F: Recurring Events & Event Enhancements (3-4 days)

The current Event model is one-off only. No `recurrenceRule`, `recurringEventId`, or `rrule` field exists. Every event is a standalone instance.

### F1. Recurring Event Schema
**File: `prisma/schema.prisma`**

Add to Event model (after line ~449):
```prisma
// Recurrence
recurrenceRule   String?   // iCalendar RRULE string (e.g., "FREQ=WEEKLY;BYDAY=MO,WE,FR")
recurrenceEnd    DateTime? // When recurrence stops (null = indefinite)
parentEventId    String?   // Links child instances to the series parent
parentEvent      Event?    @relation("RecurringParent", fields: [parentEventId], references: [id], onDelete: SetNull)
childEvents      Event[]   @relation("RecurringParent")
recurrenceMeta   String?   // JSON: { seriesId, originalDate, instanceIndex }

// Event modifiers (optional detail overlays per instance)
isCancelled      Boolean   @default(false)
cancelReason     String?
isRescheduled    Boolean   @default(false)
rescheduledTo    DateTime?
overrideTitle    String?   // Per-instance title override (e.g., "Special Guest: ...")
overrideDescription String? // Per-instance description override
```

Add to Event model's unique constraints:
```prisma
@@index([parentEventId])
```

Add a new model for recurrence exceptions:
```prisma
model RecurrenceException {
  id              String   @id @default(cuid())
  parentEventId   String
  parentEvent     Event    @relation("RecurringParent", fields: [parentEventId], references: [id], onDelete: Cascade)
  originalDate    DateTime
  action          String   @default("SKIP") // SKIP, MODIFY, CANCEL
  modifiedEventId String?  // If MODIFY, links to the modified instance
  overrideData    String?  // JSON: field overrides for this exception
  createdAt       DateTime @default(now())
  @@unique([parentEventId, originalDate])
  @@index([parentEventId])
}
```

### F2. Recurrence Rule Parser
**New file: `src/lib/recurrence.ts`**

Parse iCalendar RRULE strings and generate event instances:
- `parseRRule(rule: string, startDate: Date, endDate?: Date): Date[]` — generate occurrence dates
- `formatRRule(rule: RRuleOptions): string` — serialize to RRULE string
- `getRecurrenceLabel(rule: string): string` — human-readable label ("Every Monday", "1st & 3rd Friday of each month", etc.)
- Supported frequencies: DAILY, WEEKLY, MONTHLY, YEARLY
- Supported modifiers: `COUNT` (total occurrences), `UNTIL` (end date), `INTERVAL` (every N periods), `BYDAY`, `BYMONTHDAY`, `BYMONTH`

### F3. Recurring Event Creation
**File: `src/components/EventFormFields.tsx`** (422 lines)

Add recurrence section to the form (after the date/time fields, ~line 250):
- **"Repeat" toggle**: Off (default) / On
- When on, show frequency selector: Daily, Weekly, Monthly, Yearly
- **Weekly**: Day-of-week checkboxes (Mo Tu We Th Fr Sa Su)
- **Monthly**: "Day of month" number input OR "Nth weekday" selector (1st/2nd/3rd/4th/last + weekday)
- **Interval**: "Every [N] days/weeks/months/years"
- **End**: "Never" / "After [N] occurrences" / "On date [date picker]"
- **Preview**: Show next 5 occurrence dates as a list ("Mar 15, Mar 22, Mar 29, Apr 5, Apr 12...")
- Store as RRULE string in `recurrenceRule` field

### F4. Recurring Event Instance Management
**New API: `src/app/api/events/[id]/instances/route.ts`**
- GET: List all instances of a recurring series (child events)
- POST: Create a modified instance (override fields for a specific date)
- DELETE: Cancel a specific instance (creates `RecurrenceException` with action=SKIP)

**New API: `src/app/api/events/[id]/exceptions/route.ts`**
- GET: List all exceptions for a recurring event
- POST: Add exception (skip, modify, or cancel a specific occurrence)
- DELETE: Remove an exception (restore original recurrence)

### F5. Event Detail Enhancements
**File: `src/app/events/[id]/EventDetailClient.tsx`** (~1155 lines)

- Show **"Recurring Event"** badge with recurrence label (e.g., "Repeats every Monday")
- Show **"Next [N] dates"** expandable list for recurring events
- **Instance navigation**: "← Previous | Next →" buttons for recurring series
- **Series management** (organizer only): "Edit Series" (all instances) vs "Edit This Instance" (single instance)
- **Cancel/Reschedule instance**: Inline action that creates an exception and shows "This event has been cancelled/rescheduled" banner
- **"Add to Calendar"** enhanced: for recurring events, generate `.ics` with RRULE included so calendar apps handle recurrence natively

### F6. Calendar View for Recurring Events
**File: `src/app/events/page.tsx`** (~650 lines)

- Calendar view (lines 461-474) currently only shows events matching by date string
- Enhance to expand recurring events: for each month view, compute which recurrence instances fall in that month
- Show recurring events with a repeat icon indicator
- Clicking a recurring instance opens the specific instance (or parent if no exception)

### F7. Event ↔ Request Auto-Linking
**New API: `src/app/api/events/[id]/suggest-requests/route.ts`**

When viewing an event, suggest related requests:
- Match by category (e.g., WORKSHOP event → "Looking for Workshop" requests)
- Match by location proximity
- Match by hashtag overlap
- Show up to 3 suggestions in the event detail sidebar

**File: `src/app/events/[id]/EventDetailClient.tsx`** — Add "Related Requests" section in sidebar

### F8. Event ↔ Product Integration
**File: `src/app/events/[id]/EventDetailClient.tsx`**

- "What to bring" section: link products relevant to the event (e.g., "Camping Trip" links to tent, sleeping bag products)
- Auto-suggest products from the same category/location
- Organizer can manually link products via the existing `LinkedItemsSection` + `LinkItemModal`

---

## Stream G: Cross-Feature Integration & Social Graph (2-3 days)

The platform has 5 cross-linking layers (Post References, Backlinks, Collab Requests, Barter Offers, Connections) but they are underutilized and discovery doesn't loop back into creation.

### G1. Discovery → Creation Loop
**File: `src/app/discover/page.tsx`** (449 lines)

Currently: Discover header (lines 287-290) has no create button. Empty state (line 438) has no action.

- Add **"+ Create"** button in discover header (next to search/filters) that opens QuickCreate modal
- Enhance empty state: show "Be the first to add a [type] in this area" with creation CTA
- Add "Similar requests nearby" section when browsing products/services

**File: `src/app/directory/page.tsx`** (182 lines)

Currently: Read-only list with no creation affordance.

- Add **"+ Add Listing"** CTA button in header
- Show "Be the first" prompts on empty type tabs

**File: `src/app/services/page.tsx`** (431 lines)

- Empty state (line 306): Add "Offer a Service" CTA alongside "Clear Filters"
- Add "People are looking for" section showing matching requests

### G2. Request ↔ Event Auto-Suggestion
**New API: `src/app/api/requests/[id]/suggest-events/route.ts`**

When viewing a request, suggest related events:
- Match by category and location proximity
- Show "Upcoming events near you that match this request"
- Link: "Attend an event to connect with people who can help"

**File: `src/app/requests/[id]/RequestDetailClient.tsx`** — Add "Related Events" section

### G3. Product ↔ Event Linking
**File: `src/app/products/[id]/ProductDetailClient.tsx`**

- "Available at events" section: show events where this product is featured/linked
- "Related events" based on category/location

**File: `src/app/events/[id]/EventDetailClient.tsx`**

- "Featured products" section: products linked to this event
- "Marketplace near this event": products within event's location radius

### G4. Shop ↔ Event Integration
**File: `src/app/shop/[slug]/ShopDetailClient.tsx`** (~741 lines)

- Add **"Events"** tab to shop profile (currently: products, services, rentals, posts, reviews, about)
- Show events organized by the shop owner
- "Host an Event" CTA button for shop owners

**File: `src/app/api/shop/public/[slug]/route.ts`** (~109 lines)

- Include events in shop data fetch (currently fetches products, services, rentals, posts, ratings)

### G5. Group ↔ Event增强
**File: `src/app/groups/[id]/GroupDetailClient.tsx`**

- Add **"Events"** tab to group detail (if not already present)
- "Create Group Event" button that pre-links the event to the group
- Show upcoming group events in the group sidebar

### G6. Feed Enhancement — Entity Embeds
**File: `src/components/FeedItem.tsx`** (218 lines)

Currently: `SharedItemCard` renders a compact card for referenced entities.

- Enhance embed rendering for events: show date, location, attendee count inline in feed
- Enhance for products: show price, condition, image inline
- Enhance for requests: show status badge, funding progress inline
- Make embeds clickable to full detail page

### G7. Dashboard Cross-Feature Widgets
**File: `src/app/dashboard/overview/page.tsx`** (588 lines)

- Add **"Events Near You"** widget showing 3 upcoming events within search radius
- Add **"Requests You Can Help"** widget matching user's products/services to open requests
- Add **"Trending in Your Groups"** widget showing popular posts from user's groups
- Add **"People You May Know"** widget based on shared groups/locations/interests

---

## Stream H: Mass Adoption UX Refinements (4-5 days)

Targeting broad populace adoption: mobile-first, low-bandwidth, accessibility, reduced friction, trust signals.

### H1. Mobile & Performance (PWA)
| Item | File | Change |
|------|------|--------|
| Service worker | `public/sw.js` (new) | Cache-first for static assets, network-first for API. Enable offline browsing of cached listings. |
| PWA manifest | `public/manifest.json` | Already exists (24 lines). Add `description`, `screenshots`, `categories` fields. |
| SW registration | `src/app/layout.tsx` | Register service worker on mount. Add `beforeinstallprompt` handling. |
| Install prompt | `src/components/InstallPrompt.tsx` (new) | "Add to Home Screen" banner on mobile, dismissable, stored in localStorage. |
| Viewport fix | `src/app/layout.tsx:88` | Add `viewport-fit=cover` for notch/iPhone safe areas. |
| 100vh fix | `globals.css` | Replace `100vh` with `100dvh` (dynamic viewport height) across ~39 occurrences. Fallback to `100vh` for older browsers. |
| Lazy images | All `<img>` tags | Add `loading="lazy"` and `decoding="async"` to all non-first-paint images (currently only 4 explicit). |
| Image sizes | `next.config.js` | Add `sizes` prop to all `<Image>` components for proper responsive sizing. |

### H2. Registration & Onboarding Friction
| Item | File | Change |
|------|------|--------|
| Fix invite pre-fill | `src/app/auth/register/page.tsx` | Read `?ref=CODE` from URL via `useSearchParams`, auto-populate invite code field. |
| Username feedback | `src/app/auth/register/page.tsx:187` | Add debounced username availability check as user types (call `/api/auth/check-username`). |
| Newsletter default | `src/app/auth/register/page.tsx:30` | Change `useState(true)` → `useState(false)` — opt-in, not opt-out. |
| Username hint | `src/app/auth/register/page.tsx:187-193` | Show character-stripping feedback: "Only letters and numbers allowed" when invalid chars typed. |
| Post-login redirect | `src/app/auth/login/page.tsx:82` | Check `onboardingCompleted` — if false, redirect to `/onboarding` instead of `/dashboard`. |
| OAuth redirect | `src/lib/auth.ts` | Same check: after OAuth callback, if `!onboardingCompleted`, redirect to `/onboarding`. |
| Generic error | `src/app/auth/login/page.tsx:79` | Distinguish "unverified email" from "invalid credentials" in error messages. |
| Onboarding autosave | `src/app/onboarding/page.tsx` | Persist profile fields to localStorage on every change, restore on page load. |
| Onboarding timeout | `src/app/onboarding/page.tsx:292` | Increase abort timeout from 15s to 30s for slow connections/photo uploads. |

### H3. Listing Creation Simplification
| Item | File | Change |
|------|------|--------|
| Unify product forms | `src/components/QuickCreateModal.tsx` + `src/app/products/new/page.tsx` | Extract shared `ProductForm` component. Both surfaces use the same form with `compact` vs `full` mode. |
| Quick-create publish | `src/components/QuickCreateModal.tsx:345` | Change `published: false` → `published: true` (match full wizard behavior). |
| Quick-create geo | `src/components/QuickCreateModal.tsx:336-351` | Include `latitude`/`longitude` from user's passport location in quick-create payload. |
| Quick-create hashtags | `src/components/QuickCreateModal.tsx` | Add `HashtagInput` to quick product form. |
| Category consistency | `src/app/products/new/page.tsx:307` | Change free-text category input → `select` dropdown (match QuickCreate). |
| Price consistency | `src/components/QuickCreateModal.tsx:339` | Change price default from `0` → `null` (match full wizard "Free" behavior). |
| Remove mode chooser | `src/app/products/new/page.tsx:192-246` | Remove shop/standalone chooser. Auto-detect: if user has shop → list in shop; else → standalone. |
| Post-listing redirect | `src/app/products/new/page.tsx:171` | Redirect to `/products/${product.id}` (the new listing) instead of `/products` (marketplace). |
| Listing quality gate | `src/components/QuickCreateModal.tsx` + `src/app/products/new/page.tsx` | Require: title + at least one of (price, description, image). Show quality hints: "Add a photo for 3x more views". |
| ImageUploader alerts | `src/components/ImageUploader.tsx:22,31,43` | Replace `alert()` with toast notifications. Add upload progress bar. |
| Empty state CTAs | `src/components/EmptyState.tsx` | Support `secondaryAction` prop for two-CTA empty states. |

### H4. Search & Discovery Parity
| Item | File | Change |
|------|------|--------|
| Header search for anon | `src/components/Header.tsx:179` | Show search button for logged-out users, link to `/search?q=` page. |
| Search radius consistency | `src/lib/discover.ts:64` + `src/app/services/page.tsx` | Unify default radius: 50mi for all surfaces (discover currently uses 250). |
| Service filter server-side | `src/app/services/page.tsx:66` | Send filter/sort/query params to API instead of client-side filtering over first 20 records. |
| Discover filters in URL | `src/app/discover/page.tsx` | Sync all filters (type, intent, hashtag, sort) to URL params for shareable/bookmarkable searches. |

### H5. Trust & Safety Signals
| Item | File | Change |
|------|------|--------|
| Verification badges | Profile/shop/product cards | Show existing verification level badges (email/phone/ID) prominently. |
| Member since date | `src/app/profile/[username]/ProfileDetailClient.tsx` | Show "Member since [date]" on profiles. |
| Response rate | `src/app/shop/[slug]/ShopDetailClient.tsx` | Show "Avg response time: [X hours]" calculated from message/reply timestamps. |
| Transaction count | `src/app/profile/[username]/ProfileDetailClient.tsx` | Show "[N] successful transactions" from completed escrows. |
| Report button | All detail pages | Add "Report" option in EntityActions "more" menu. New API: `POST /api/reports` with entity type/id + reason. |
| Content warnings | `src/components/FeedItem.tsx` | Auto-flag posts with external links → show "External link" warning badge. |

### H6. Low-Bandwidth & Offline
| Item | File | Change |
|------|------|--------|
| Skeleton-first | All listing pages | Ensure skeleton screens render before data fetch (already ~90% done, fill remaining gaps). |
| Progressive images | `src/components/ProductCard.tsx` etc. | Show blurred low-res placeholder while high-res loads (next/image `placeholder="blur"` with BlurDataURL). |
| Reduce bundle | `next.config.js` | Add `@next/bundle-analyzer` for audit. Dynamic-import heavy components (Leaflet, emoji-picker-react, QRCodeModal). |
| API caching | `src/app/api/directory/route.ts` etc. | Add `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` headers to read-heavy APIs. |
| Prefetch on hover | Listing pages | Add `next/link` prefetch for cards that are likely click targets (detail pages). |

### H7. Accessibility Improvements
| Item | File | Change |
|------|------|--------|
| Focus management | Modal/drawer components | Auto-focus first interactive element on open, trap tab, return focus on close. |
| Keyboard nav | `src/app/onboarding/page.tsx` | Allow Enter/Arrow keys to navigate steps. |
| Color contrast | `globals.css` + theme files | Audit all text/bg combinations against WCAG AA (4.5:1 ratio). |
| Reduced motion | `globals.css:425` | Already has `prefers-reduced-motion` — verify all animations are covered. |
| Screen reader | Listing cards | Add `aria-label` with full context: "Product: [title], $[price], [category], [condition]". |
| Skip links | Detail pages | Add skip links on long detail pages (events, projects, profiles) to jump to main content. |

### H8. Internationalization Expansion
| Item | File | Change |
|------|------|--------|
| Missing translations | `messages/*.json` | Audit all 16 locales for missing keys. Priority: ar, hi, zh (most users in target demographics). |
| RTL layout | `globals.css` | Add `[dir="rtl"]` overrides for layout mirroring (already has `dir` attribute support via next-intl). |
| Date localization | All pages using `new Date().toLocaleDateString()` | Use `next-intl` `useFormatter().dateTime()` for locale-aware dates. |
| Currency display | Product/service prices | Use `Intl.NumberFormat` with locale for proper currency formatting. |
| Phone/address formats | Profile, checkout | Use locale-aware input masks for phone numbers and addresses. |

---

## Updated Execution Order

| Week | Streams | Notes |
|------|---------|-------|
| 1 | C (badge schema + scoring + API) → A (directory/shops/products/services) | C schema must come first |
| 2 | D (reviews + feedback) → B (onboarding tidy-up) | D and B parallel |
| 3 | H1-H3 (mobile, registration, listing simplification) | High-impact UX fixes |
| 4 | F (recurring events + event enhancements) → G (cross-feature integration) | F schema first, then G links |
| 5 | H4-H8 (search parity, trust, offline, a11y, i18n) | Polish & breadth |

## Updated Dependencies

- **C1 (schema)** → A1-A5, C4-C5 (listing UX uses approval badges)
- **C4-C5 (badge components)** → A2, A3, A4 (cards show badges)
- **D1 (Rating schema)** → D2-D3 (component/API work)
- **H2 (registration fixes)** → H3 (listing simplification depends on clean auth flow)
- **F1 (recurrence schema)** → F2-F8 (all event recurrence features)
- **G1-G3 (discovery ↔ creation loop)** → depends on H3 (unified product form)
- **E1-E8** are mostly independent of other streams

## Updated Prisma Migration

Single migration after all schema changes (C1 + D1 + D3 + E3 + F1):

```bash
npx prisma migrate dev --name add-badges-reviews-recurrence-crosslink
```

**New models added**: `ReviewVote`, `ReviewResponse`, `RecurrenceException`
**New fields**: Product `isApproved/approvedAt/approvedBy`, User `isShopApproved/shopApprovedAt`, Request `assigneeId`, Event `recurrenceRule/recurrenceEnd/parentEventId/recurrenceMeta/isCancelled/cancelReason/isRescheduled/rescheduledTo/overrideTitle/overrideDescription`, ProjectJoiner `message`

**Risks:**
- Changing `@@unique([raterId, userId])` to `@@unique([raterId, userId, productId])` — check dev.db for existing data
- Recurring event instances: large series could generate many Event rows — implement lazy generation (generate on calendar view, not on creation)
- Service worker caching: must not cache auth tokens or sensitive API responses

## Updated New Files (27)

| File | Stream |
|------|--------|
| `src/components/QualityBadge.tsx` | C |
| `src/components/ApprovalBadge.tsx` | C |
| `src/components/BusinessProfileChecklist.tsx` | A |
| `src/components/ReviewPrompt.tsx` | D |
| `src/components/ProjectDashboard.tsx` | E |
| `src/components/WelcomeModal.tsx` | B |
| `src/components/InstallPrompt.tsx` | H |
| `src/components/ProductForm.tsx` | H |
| `src/services/qualityService.ts` | C |
| `src/lib/recurrence.ts` | F |
| `src/app/api/admin/badges/route.ts` | C |
| `src/app/api/admin/badges/[id]/route.ts` | C |
| `src/app/api/users/[id]/badges/route.ts` | C |
| `src/app/api/feedback/route.ts` | D |
| `src/app/api/ratings/[id]/respond/route.ts` | D |
| `src/app/api/ratings/[id]/vote/route.ts` | D |
| `src/app/api/requests/matches/route.ts` | E |
| `src/app/api/requests/[id]/assign/route.ts` | E |
| `src/app/api/requests/[id]/in-progress/route.ts` | E |
| `src/app/api/events/[id]/instances/route.ts` | F |
| `src/app/api/events/[id]/exceptions/route.ts` | F |
| `src/app/api/events/[id]/suggest-requests/route.ts` | F |
| `src/app/api/requests/[id]/suggest-events/route.ts` | G |
| `src/app/api/reports/route.ts` | H |
| `src/app/api/auth/check-username/route.ts` | H |
| `src/app/admin/badges/page.tsx` | C |
| `src/app/admin/feedback/page.tsx` | D |
| `src/app/feedback/page.tsx` | D |
| `public/sw.js` | H |

## Updated Modified Files (~25)

| File | Streams |
|------|---------|
| `prisma/schema.prisma` | C, D, E, F |
| `src/app/directory/page.tsx` | A, G |
| `src/app/shops/ShopsClient.tsx` | A |
| `src/app/products/page.tsx` | A |
| `src/app/products/new/page.tsx` | H |
| `src/app/services/page.tsx` | A, G, H |
| `src/app/onboarding/page.tsx` | B, H |
| `src/app/dashboard/layout.tsx` | B |
| `src/app/dashboard/overview/page.tsx` | G |
| `src/data/onboarding-tour.tsx` | B |
| `src/app/profile/[username]/ProfileDetailClient.tsx` | C, H |
| `src/app/shop/[slug]/ShopDetailClient.tsx` | C, G, H |
| `src/components/ProductCard.tsx` | C, H |
| `src/components/Rating.tsx` | D |
| `src/components/home/FeedbackSection.tsx` | D |
| `src/components/EmptyState.tsx` | H |
| `src/components/ImageUploader.tsx` | H |
| `src/components/Header.tsx` | H |
| `src/components/EventFormFields.tsx` | F |
| `src/app/events/page.tsx` | F |
| `src/app/events/[id]/EventDetailClient.tsx` | F, G |
| `src/app/requests/[id]/RequestDetailClient.tsx` | E, G |
| `src/app/projects/[id]/ProjectDetailClient.tsx` | E |
| `src/app/projects/[id]/ProjectMilestones.tsx` | E |
| `src/app/discover/page.tsx` | G, H |
| `src/components/RequestForm.tsx` | E |
| `src/components/FeedItem.tsx` | G, H |
| `src/components/EntityActions.tsx` | H |
| `src/lib/navigation.ts` | C, D |
| `src/app/auth/register/page.tsx` | H |
| `src/app/auth/login/page.tsx` | H |
| `src/lib/auth.ts` | H |
| `src/app/layout.tsx` | H |
| `src/middleware.ts` | H |
| `globals.css` | H |
| `next.config.js` | H |
| `public/manifest.json` | H |
