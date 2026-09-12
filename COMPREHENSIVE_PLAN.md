# XistrYmemZ — Comprehensive Community & UX Plan v3

> **v3.0** — Rebased from deep code audit (lightweight, UX, custom forms, search/filter, ideas & voting, debates, location grouping, coop, voice). Priorities lock: **Ideas & voting first → Extend forum → Reddit-style votes.**

---

## Progress (session updates)

**Phase 4 — DONE (9/12/2026):** Schema (`ForumPost.postType/status/score`+indexes, `ForumVote`, `ForumReplyVote`, `ForumReply.side/score`, `ForumPollVote @@unique[userId,optionId]`) applied via `prisma db push` (migrate dev broken — shadow DB P3006; history lacks Event creation). APIs: `/api/forum/vote`, `/api/forum/reply-vote`, `posts?sortBy=score/postType/status/q`, thread/reply `myVote` hydration, poll expiry + multi fix, `GET forums?q`, backfill script `scripts/backfill-forum-types.ts`, `Debates` category seed. UI: postType tabs + status badges + vote strip (list), vote arrows + score + debate PRO/CON side select/filter/consensus (thread), pollEndsAt expiry state, Skeleton loading. Vote retract via DELETE (`forumVoteDeleteSchema`/`forumReplyVoteDeleteSchema` — value not required on DELETE). Build + typecheck pass.

**Phase 3 (part) — DONE:** `SearchResultsClient` filter bar + section map now include `forumPosts`; `SearchResult` interface typed with optional `name/username/content`.

**Phase 5 (part) — DONE:** `Report` + `UserBlock` models added and pushed; `/api/reports` (POST submit w/ 7-day dedupe, GET admin queue) + `/api/reports/[id]` (PATCH status); 🚩 Report button + reason/description modal on forum thread (non-moderators); `/admin/reports/page.tsx` moderation queue (resolve/dismiss, status filter).

**Next:** GroupMember roles/promote-kick, LocationTag radius queries, Task/Proposal/coop, Phase 6 Jest tests + verify.

---

## Audit Summary (verified against source)

### Lightweight / Performance
- Heavy deps lazy-loaded well (`leaflet`, `html5-qrcode`, `simple-peer`, `emoji-picker-react` all `dynamic`/`await import`). ✅
- **Dead weight**: 6× `@tari-project/*` with zero runtime imports (verify), `kubo-rpc-client` likely unused. `optimizePackageImports: [next-auth]` only.
- `next/image` correct in ~40 files; gaps: `ImageUploader.tsx:59`, `MentionInput.tsx:267` raw `<img>`, no `priority` on LCP/hero.

### Smooth UX
- Thin server page → `*Client.tsx` pattern correct but 100+ `'use client'` files.
- Loading fragmented: `Loading.tsx` (dragon + rotating messages), `Skeleton.tsx` unused on critical paths, 16× `loading.tsx` (detail/auth only), bare `Loading...`/`Saving...` sprawl.

### Customizable Forms
- No `react-hook-form`. Manual `useState` everywhere (`RequestForm.tsx`, `EventFormFields.tsx:563 lines`, `products/new`, `groups/new`).
- Validation `zod@4.3.6` server-only via `src/lib/schemas.ts` + `validateBody()`. Client = HTML `required` only.
- Only dynamic custom-fields system: `appointmentFormFields[]` (`types/service.ts` / `BookAppointmentModal.tsx`).
- Theming global (`ThemeContext.tsx`, `data-theme-mode/accent`) — no per-form customization.

### Search / Filter
- Global `/api/search` (projects/products/services/users/groups/events/requests/schoolContent/forumPost+hashtag).
- Forum: client-only `title+content includes` (`community/forum/page.tsx:99-106`); server only `categoryId,authorId,limit,offset`; fixed `take:20`; sort client-side (`newest|oldest|mostReplies|mostViews|mostTips`).
- `/api/search/entities` typed search exists; `SearchResultsClient` filter bar missing `forumPosts`.

### Ideas / Voting / Debates
- `Ideas` is only a `ForumCategory.slug='ideas'`. No Idea/Proposal/Debate model, template, or status workflow.
- Voting = polls only. `@@unique[userId,postId]` breaks `pollType=multi` at DB level. No expiry enforcement. `userVoted/userVotes` not hydrated into thread fetch. `Like` is local `useState Set` (not persisted).
- No debates — no pro/con sides, argument mapping, timed rounds, consensus view.
- Gap: no upvote/downvote/ranking on posts/replies/ideas, no vote-sorted view.

### Community / Location / Coop
- `User lat/lng/searchRadius(50)`, `Group isLocationBased+lat/lng` but no radius query, `BulletinBoard+Pin` de-facto geo-community, `LocationCategory.userId` required (no shared taxonomy), Nominatim uncached direct calls, `geoip-lite` stale.
- `CollaborationRequest.entityId:String` unvalidated (no FK). No `Task/Bounty/Proposal/Charter/RevenueSplit` models.
- No `Report/Block`, `GroupMember` always `MEMBER` (no promote/kick), role enforcement ad-hoc (`requireAdmin`).
- **Voice strengths**: open posting, `PostTip/EntityTip/Repost`, mentions, hashtags-follow, fediverse `Outbox/InboxActivity`.

---

## Phases

### Phase 0 — Lightweight Cleanup (1-2 days)
- Remove dead `@tari-project/*` (6 pkgs) + `kubo-rpc-client` if confirmed unused. Add `optimizePackageImports: [leaflet, emoji-picker-react, html5-qrcode]`.
- Convert `ImageUploader`/`MentionInput` previews to `next/image`; add `priority` to hero/LCP.
- Lazy-load `VideoChatModal`/`ConstellationMap` via `dynamic(ssr:false)`.
- Verify with `next build` + bundle analyze.

### Phase 1 — Smooth UX Standard (parallel)
- Replace critical-path `Loading.tsx` with `Skeleton*`; add missing `loading.tsx` (`feed/discover/boards/products/search`).
- Standardize `ui/Button loading` + `useState actionLoading`; wire `hooks/useFocusTrap.ts` into `ui/Modal.tsx`; add `aria-invalid/describedby`, `aria-live` for vote/search.

### Phase 2 — Customizable Forms
- `hooks/useZodForm(schema)` reusing `lib/schemas.ts` client-side + `components/ui/{FormField,Input,Textarea,Select,FormError}.tsx`.
- Generic `CustomField {label,type:text|textarea|select|date|number,required,options[]}` for groups/events/projects/forum-idea template (extend `appointmentFormFields` pattern).
- Migrate `RequestForm`, `EventFormFields`, forum create-post; per-form `accent`/`className` → CSS vars.

### Phase 3 — Search + Filter (unblock idea discovery)
- Server `GET /api/forum/posts`: add `q, sortBy(score|replies|views|new), timeRange, status` + Prisma `contains(insensitive)` + cursor pagination (replace fixed `take:20`).
- `forumPosts` into `SearchResultsClient` filter bar.
- Index `@@index([categoryId,createdAt])`; cache Nominatim in `lib/geocoding.ts`.

### Phase 4 — Ideas & Voting (CORE — extend forum)
- **Schema**: `ForumPost += postType(GENERAL|IDEA|DEBATE|POLL), status(PROPOSED|UNDER_REVIEW|ACCEPTED|IMPLEMENTED|REJECTED), score Int @default(0)`; `ForumVote(voterId+postId @@unique, value +1|-1)`; `ForumReplyVote(voterId+replyId @@unique, value +1|-1)`; fix `ForumPollVote @@unique[userId,optionId]` (multi); migrate + backfill score.
- **API**: `POST/DELETE /api/forum/vote` (transaction upsert + score), `/api/forum/reply-vote`; `GET posts?sortBy=score`; poll vote expiry + multi fix + hydrate `userVotes` in thread fetch. Wire real `EntityLike` → thread Like button.
- **UI (same route, no new top nav)**: `community/forum/page.tsx` — postType tabs + status badges + IDEA template (problem/solution) + sort `Top/New`; `[postId]/ForumThreadClient.tsx` — up/down arrows + score + vote retract + poll expiry countdown.
- **Debates** (`postType=DEBATE`): `ForumReply.side(PRO|CON|NEUTRAL)` + side filter + consensus box. Nav (`lib/navigation.ts`, `Header.tsx`, `sitemap.ts`) unchanged.

### Phase 5 — Growing Community + Location + Coop
- **Moderation**: `Report {reporterId,entityType,entityId,reason,status}`, `Block/Mute`, `GroupMember role(MEMBER|MODERATOR|ADMIN)` + promote/demote/kick API, `app/admin/reports/page.tsx` queue. RBAC pattern from `TripCollaborator VIEWER|EDITOR|OWNER`.
- **Location grouping**: shared `LocationTag {name,slug,lat,lng,radius}` (vs per-user `LocationCategory`), `Group.locationTagId + radius`, SQL Haversine bounding-box filter (replace in-memory), auto-suggest board membership via `BulletinBoard.radius`.
- **Coop collab**: `Task {title,status,assigneeId,groupId,projectId}`, `Proposal {forumPostId,status,voteEndsAt}` (IDEA → vote → Task), `SkillTag`, validate `CollaborationRequest.entityId`.
- **Voice**: `EntityReply` for products/events/projects; `Repost` + `share-links.ts` on forum cards; notifications on votes/status; newsletter via `resend`.

### Phase 6 — Verification
- `npm run typecheck && lint && test` (add Jest for vote transaction, multi-poll, search filter), `prisma migrate dev`, manual: create IDEA → vote → sort Top → status → Proposal/Task; create DEBATE → PRO/CON filter.

---

## Out of Scope (ask if wanted)
- PostGIS, reputation-weighted voting, fediverse federation of votes.