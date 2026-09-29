# Contributing to XistrYmemZ

Thanks for looking. This is a member-owned cooperative — the roadmap is
whatever the members decide, and code contributions are the most direct way
to shape it.

## Where help is most wanted

1. **UI/UX** — the densest surface and the least polished. Real design sense
   beats feature volume here.
2. **Mobile / responsive** — several surfaces still assume desktop width.
3. **Tests** — coverage is thin relative to feature count.
4. **Docs & self-hosting** — Docker containerization, deployment guides,
   `.env` explanations. Currently a real gap.
5. **ActivityPub federation** — endpoints exist, the logic is not wired.
6. **i18n parity** — 16 locales; several surfaces fall back to English.

Start with anything labelled `good first issue`.

## Setup

```bash
git clone https://github.com/yerbaforums/xistrymemz
cd xistrymemz
npm install
cp .env.example .env
npx prisma db push
npm run dev
```

`DATABASE_URL` and `NEXTAUTH_SECRET` are the only required values to boot.
`openssl rand -base64 32` is a fine way to generate the secret.

## Gates

Every change must pass all four before it is considered done:

```bash
npm run typecheck   # tsc --noEmit, zero errors
npm run lint        # zero errors (warnings are a known baseline — don't add more)
npm test            # 2 passed / 5 skipped is the expected clean baseline
npm run build       # must pass
```

Check the **exit codes**, not the tail of the output. A stale `.next` has
masked a real failure before. If the build looks wrong, try a clean rebuild.

The Jest suites under `__tests__/api/**` hit a live server and skip
automatically when none is running. To run them, start `npm run dev` first.

## Conventions

- TypeScript strict; no `any` in new code.
- Zod for input validation at API boundaries — match the existing schemas in
  `src/lib/schemas.ts` rather than hand-rolling checks.
- IDs are **cuids**, not UUIDs. Zod validators take `.min(1)`, never `.uuid()`.
  (This has bitten the codebase before; don't reintroduce it.)
- API responses go through `apiSuccess` / `apiError` in `@/lib/api-helpers`.
- Soft-fail new `home-pulse` legs rather than failing the whole homepage.
- No new `dangerouslySetInnerHTML` in an editor surface. React 19 re-applies
  it on parent re-render and it destroys the caret. See the RichEditor commit
  for the pattern.
- Don't touch unrelated code. The diff should be reviewable.

## Hard rules from maintainers

These are deliberate and not up for individual PR discussion:

- **No schema changes** — the shadow-database flow (P3006) is broken. Prefer
  additive columns with sane defaults, or prefs stored as JSON.
- **No auth/RBAC changes** without an explicit conversation first.
- **No URL removals.** Canonical vs. dashboard route mapping is documented in
  `.opencode/plan/consolidated-path-forward.md` — check before adding a route.
- **No `migrate deploy` in the Vercel build** (advisory-lock timeouts on
  pooled Neon).
- **Don't add `EntityActions` to list views.**

## Pull requests

1. Branch from `main`.
2. Make the gates pass.
3. Describe what changed and why. Reference the issue if there is one.
4. Small and focused beats large and clever.

## Reporting bugs

Use `/feedback` on the live site, or open an issue. Include the route, what
you expected, and what happened instead.

## Donations

If you'd rather fund the infrastructure than write code, that's genuinely
useful too — the platform takes no fees and runs on donations:
<https://xistrymemz.xyz/donate>
