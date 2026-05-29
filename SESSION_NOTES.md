# Session Working Notes

## Current State (39f7eb2 — committed and pushed)

### ✅ Complete — Infrastructure & Foundation

**Analytics & Navigation:**
- Geo-analytics: city/region/coordinates via geoip-lite, admin visits API with pagination/filters, Recent Visits UI
- Nav config centralized in `src/lib/navigation.ts`
- MobileNav and UserDropdown extracted from Header.tsx
- Dashboard overview: simplified view for new users, collapsible stats for returning users
- CSS modernization: `--text-tertiary`, `--space-7`, `var(--transition)`, `color-mix()`

**Feature Visibility Toggles:**
- 6 toggle switches (showShop, showSchool, enableTips, enableReplies, enableLikes, showViewCount) on profile edit page
- API backend already handles these fields

**HashtagInput Embedding:**
- Replaced manual hashtag input in EventForm with HashtagInput component
- Added hashtags to PlanDetailClient (plan overview edit)
- Added hashtags to RequestsClient (create + edit forms)
- Added hashtags to groups (create modal in groups/page + edit modal in groups/[id]/page)

**UI Polish:**
- Emoji icons on hero section CTAs + 🏷️ Hashtags link
- Emoji icons on hashtag tab bar (📝 🛍️ 📅 🔧 🎓 📋 🙋 👥)
- Copy Link icon changed to two-overlapping-documents (distinct from Share)
- Mobile nav accent dot CSS fixed (was white boxes)

### ✅ Complete — School Content Overhaul

**School Content Detail Page:**
- New route: `/school/[slug]/content/[id]`
- Full content body, type badge, price/free badge, images gallery, video player, hashtags, author info
- Related content section (shows other content from same school)
- API: single-content GET with hashtags, author image, section/order fields

**School Page Redundancy Fixes:**
- Hide contentPreview when card expanded (no more inline expansion — now navigates)
- Hide aboutPreview when About tab is active
- Removed floating EntityActions bars at bottom
- Added compact EntityActions per content card
- Cleaned up unused state (showShareModal, shareContent, selectedContent)

**Content Creation Enhancements:**
- RichEditor component (bold, italic, headings H2/H3, UL/OL, inline image/video embed, source view)
- ImageUploader (up to 5 images) + video URL field in content form
- Course section grouping (contentSection field, sortOrder field)
- Prisma: added `contentSection` (String?) and `sortOrder` (Int) to SchoolContent
- Content type filter bar (All / Article / Lesson / Note / Guide / Course / Resource)
- Edit/delete content (owner-only, with ConfirmDialog for delete)
- Content list sorted by section + sortOrder, grouped under section headers

**Quiz Engine:**
- Quiz content type with `Question|Opt1|Opt2|Opt3|Opt4|Correct` format
- Interactive quiz UI on detail page (selectable answers, score, correct/wrong highlighting)
- Quiz creation via textarea when contentType === 'quiz'

**API Updates:**
- Content create endpoint handles images/videoUrl/section/sortOrder
- Content update endpoint handles section/sortOrder
- Content list endpoint returns hashtags, sorted by sortOrder then createdAt

### ✅ Complete — Fixes

- TS build error: missing `hashtags` in setEditForm call in RequestsClient.tsx
- TS build error: `walletRequired` missing from NavItem type
- Copy Link icon conflict with Share icon
- Mobile nav accent dots rendering as white boxes
- EntityActions redundancies (native share button vs copy, icon conflicts)

---

### ⏳ Next Pass: Creator-First Experience (General → Specialized)

The goal: get users **creating content quickly** and **displaying it valuably**.

**Phase A: Quick-Create Everywhere**

| # | Change | Files | Effort |
|---|--------|-------|--------|
| 1 | Add `+ Create` dropdown button in Header (desktop) and MobileNav | `Header.tsx`, `MobileNav.tsx` | Medium |
| 2 | New Post → opens inline modal instead of navigating away | `CreateFAB.tsx`, new `QuickPostModal.tsx` | Medium |
| 3 | First-visit banner on dashboard: add "Write your first post" prompt | `dashboard/overview/page.tsx` | Small |
| 4 | FAB visible on load (no scroll threshold) for new users | `CreateFAB.tsx` | Small |
| 5 | Dashboard checklist: "Create your first school content" item | `dashboard/overview/page.tsx` | Small |
| 6 | Feed empty state: prominent "Create your first post" CTA | `dashboard/feed/page.tsx` | Small |

**Phase B: Content Templates & Starter Kits**

| # | Change | Files | Effort |
|---|--------|-------|--------|
| 7 | Pre-built content templates for schools (lesson plan, course outline, tutorial, guide) | `src/lib/content-templates.ts` (new) | Medium |
| 8 | "Quick Start" button on school setup that pre-fills 3 starter content items | `school/setup/page.tsx` + API | Medium |
| 9 | Template picker in school content creation form | `school/[slug]/page.tsx` | Medium |

**Phase C: Rich Content Display**

| # | Change | Files | Effort |
|---|--------|-------|--------|
| 10 | Content series navigation (prev/next) on detail page | detail page | Small |
| 11 | Content progress tracking (mark as complete, continue later) | detail page + Prisma | Medium |
| 12 | Reading time estimate on content cards + detail page | page.tsx + util | Small |
| 13 | Better content cards with type-specific icons and richer previews | CSS + school page | Small |

**Phase D: Dashboard Content Hub**

| # | Change | Files | Effort |
|---|--------|-------|--------|
| 14 | Unified "My Content" section on dashboard showing all user-created content | `dashboard/overview/page.tsx` | Medium |
| 15 | Content stats (views, likes, comments per content item) | dashboard + API | Medium |
| 16 | Quick-edit from dashboard (inline edit without navigating away) | dashboard + modal | Medium |

**Phase E: Project/Plan Pages Revamp**

| # | Change | Files | Effort |
|---|--------|-------|--------|
| 17 | Apply same RichEditor to plan description editing | `PlanDetailClient.tsx` | Small |
| 18 | Plan content view pages (dedicated URLs for plan resources/materials) | new routes | Medium |
| 19 | Share EntityActions + rich content display to project pages | PlanDetailClient + EntityActions | Small |

---

### Priority Order (recommended execution)

1. **Small wins** — #3, #4, #5, #6, #13 (dashboard prompts + card polish) → immediate impact, minimal code
2. **Header Create button** — #1 (biggest visibility gap, users can't find how to create)
3. **Quick post modal** — #2 (first real content creation should be frictionless)
4. **Content templates** — #7, #8, #9 (scaffolding for new creators)
5. **Content series + progress** — #10, #11, #12 (valuable display for viewers)
6. **Dashboard content hub** — #14, #15, #16 (surface creator stats)
7. **Project revamp** — #17, #18, #19

### Git Log
```
39f7eb2 fix: add walletRequired to NavItem type
bf91f20 feat: rich text editor, course sections, quiz engine, content ordering
93b3c2e feat: expand school content features - images/video in creation, edit/delete, type filtering, related content
c2b2808 feat: school content detail page, fix redundancies, fix TS build error, fix copy link icon, fix mobile nav accent CSS
d1c3605 feat: geo-analytics, nav refactor, dashboard personalization, feature toggles, hashtag forms, UI polish, and accent/mobile nav fixes
8c07887 feat: add traffic source analytics (country, referrer) to admin panel
d5fc86e feat: inject EntityActions into all entity pages, remove old action components
ed4f5f6 feat: universal entity actions + per-user feature toggles
b5c84da feat: share bar, backlink system, and related items
c9b626c feat: universal hashtag system + school content hashtag integration + UI/UX passes 1-4
```
