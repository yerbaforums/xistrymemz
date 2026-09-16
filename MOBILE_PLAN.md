# Mobile Plan — XistrYmemZ

## Goal
Let users run the whole XistrYmemZ experience from their phone: browse, post, deal, message, and renew a "cosmic whitepages" cooperative credit. This plan covers the phased path from today's responsive web app to a first-class mobile client, without forking the product.

## Current mobile status (web-only, already done)
- Responsive layout works across breakpoints; BottomNav (Home / Studio / Profile) with correct active states.
- MobileNav shows a curated 7-item primary + "All tools" accordion on Browse and Studio.
- Header stays slim: search, sidebars collapse, CommandPalette (Cmd/Ctrl+K) gives global navigation.
- Server-persisted preferences drive which nav destinations are visible.
- These share one Next.js App Router (no `[locale]` segment, flat routes).

No native app exists yet; PWA installability is not set up.

---

## Phased plan

### Phase A — Installable PWA (next ~2 weeks)
Turn the existing web app into an installable, offline-capable app before any native work.

| Task | Notes |
|---|---|
| Web App Manifest (`app/manifest.ts`) | name, short_name, theme_color, icons (192/512 + maskable), display `standalone` |
| Service worker | Network-first for API, cache-first for static (Next public assets + fonts), runtime caching for images |
| iOS meta tags + safe-area | `apple-mobile-web-app-*`, viewport-fit=cover, notch padding on BottomNav |
| Offline shell | Minimal splash / cached homepage; queue **notifications** and messages offline (IndexedDB) then flush |
| Push notifications | Web Push (VAPID) via existing `/api/notifications` + `notificationService` preferences; SW `push`/`notificationclick` handlers |
| Install prompt + home-screen hint | Only after engagement (e.g. 2 visits, >1 min) |

**Exit criteria:** Lighthouse PWA score 95+, installable on iOS Safari & Android Chrome, push works, app usable offline for read-only browsing.

### Phase B — Decide native vs continue PWA
Re-evaluate once Phase A ships. Two viable routes:

1. **Keep PWA only** — costs nothing new; limits: no BackgroundSync push on iOS, some platform quirks.
2. **Native thin-shell (recommended for tray-style/cooperative users)** — React Native (Expo) app that:
   - Reuses backend: all business logic stays in the Next.js API routes; the app is a client.
   - Renders web views for long-tail screens, native screens only for the high-traffic core.

Core-dedicated native screens (shortlist, decided by metrics after Phase A):
- Feed / Browse (posts, products, services, requests)
- Deals hub (orders, offers, appointments) with push-badge support
- Messaging (chat with optimistic send)
- CommandPalette equivalent (spotlight search across all 10 entity types)

Everything else (forms, settings, onboarding) stays a web view until usage justifies porting.

| Factor | PWA only | Expo native |
|---|---|---|
| Cost | 0 | Moderate (1-2 dev-weeks) |
| iOS push reliability | Weak | Strong |
| Offline UX | Good | Better |
| Shared code | 100% | ~80% (client logic shared, UI differs) |

### Phase C — Native client buildout (after Phase B decision)
If native is chosen:
- Design tokens ported to RN (same palette: accent-primary `#00d9ff`, bg-primary, radius scale).
- Auth: same `next-auth` JWT via Authorization header; no re-login prompt, secure store token.
- All mutations go to existing `/api/*` routes; optimistic updates + ToastContext behavior mirrored.
- Notifications preferences (`/api/user/preferences`) enforced client-side too.
- Deep links: `xistrymemz://u/<username>`, `xistrymemz://p/<postId>`, `xistrymemz://order/<id>`; map to routes so invites work across platforms.

---

## Non-goals
- No separate mobile API — routes stay shared.
- No offline-first data sync for write-heavy features (marketplace listings) beyond draft queue.
- No churn on [locale]/i18n segmentation — translations stay via `next-intl` on the server.

## Risks
- Service worker + Next.js App Router caches can serve stale layouts — pin asset hashes, use `next.config` image caching carefully.
- Push entitlement complexity (APNs device tokens vs VAPID web push) — abstract behind one `registerForPush()` helper in `src/lib/push.ts`.
- Cooperative app acceptance often depends on low-end Android devices — test on 2019-era hardware, keep bundle lean.

## Open questions
1. Should the mobile app require an account, or support the "anonymous browse + quick wallet" flow used for donations today?
2. iOS app store distribution or side-load only for the cooperative? (Affects cert/push setup.)
3. Do crypto tip flows (XMR/XTM/ZANO/FUSD) need wallet-deep links per token?
