# Sprint 1 — Critical Fixes + Board Enhancements (~40 min)

## C1: Fix discover getEntityIcon/getEntityColor bracket→function calls
File: src/app/discover/page.tsx
6 instances of `getEntityIcon[r.type]` should be `getEntityIcon(r.type)`

## C2: Discover API — add Board query block
File: src/lib/discover.ts
Add `if (types.includes('BOARD'))` → query bulletinBoard (public, has coords)
Map to DiscoverResult with url: /boards/{slug}, meta: pinCount

## C3: Discover — add Board href/url case
File: src/app/discover/page.tsx
Add BOARD case to card href, calendar href, map popup href

## C4: Fix BottomNav dead FAB
File: src/components/BottomNav.tsx
Replace dead spacer with actual QuickCreateModal trigger button

## C5: Fix 42 plan→project references in ProjectsClient
File: src/app/projects/ProjectsClient.tsx
Lines 224-227 (6), 274-275 (5), 529-657 (31)

## M1: Board listing map popup — richer info
File: src/app/boards/page.tsx:518-527
Add description snippet, created date

## M2: Board detail pin popup — entity thumbnail + type icon + title
File: src/app/boards/[slug]/page.tsx:447-449
Always show entity info when entityType && entityId exists
Show pin.entityImage as thumbnail, entity type icon, title

## M3: BoardPinCard — linked entity placeholder before API load
File: src/components/BoardPinCard.tsx:299-301
Show entity type icon + pin.entityTitle immediately
Show pin.entityImage as initial thumbnail

# Sprint 2 — Navigation + Map Enhancements (~90 min)

## H1: Discover API — add Rental, Request, Shop queries
## H2: HeroSection — add Discover CTA
## H3: BottomNav — add Discover + Boards + fix Create
## H4: MobileNav — collapse into accordions
## H5: Discover — add missing filter pills
## H6: HomeMap + PulseSection — add Discover links

# Sprint 3 — Home Page + Cross-Linking (~60 min)

## M4: Home page — add ticketing/donations/tips mentions
## M5: FeaturesSection — collapse into expandable groups
## M6: Add BOARD to cross-linking system
## M7: Fix resolveEntityUrl for SHOP/SCHOOL/SCHOOLCONTENT
## M8: Fix resolveEntityTitle for SHOP/SCHOOL

# Sprint 4 — UX Polish (~80 min)

## L1: Extract MeetingLinkPicker shared component
## L2: Extract shared PIN_CATEGORIES constant
## L3: Unify request categories in QuickCreateModal
## L4: Unify project status values
## L5: Add ZIP proximity to Services page
## L6: Add deadline filter to Requests page
## L7: Add category sidebar to Boards page
## L8: Create ViewModeToggle shared component
## L9-L15: Icon fixes, shortcuts, CTA polish
