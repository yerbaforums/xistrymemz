# Fediverse Integration Plan — XistrYmemZ

## Goal
Enable XistrYmemZ users to federate with the broader fediverse (Mastodon, Pixelfed, Lemmy, etc.) via the ActivityPub protocol. Users get handles like `@username@xistrymemz.xyz` and can follow, be followed, and have content shared across instances.

---

## Architecture

```
┌──────────────────────────────────────┐       ActivityPub/HTTPS       ┌──────────────────┐
│         XistrYmemZ Server            │ ◄──────────────────────────► │  Fediverse       │
│                                      │    Follow / Create / Like    │  (Mastodon,      │
│  ┌────────────────────────────────┐  │    Announce / Delete          │   Pixelfed, etc) │
│  │      Next.js App Router       │  │                               │                  │
│  │                                │  │                               └──────────────────┘
│  │  ┌──────────┐  ┌───────────┐  │  │
│  │  │ Existing │  │ Fediverse │  │  │
│  │  │ Routes   │  │ Routes    │  │  │
│  │  │          │  │           │  │  │
│  │  │ /api/*   │  │ /.well-known/   │
│  │  │          │  │   webfinger │  │  │
│  │  │          │  │ /api/        │  │  │
│  │  │          │  │   fediverse/ │  │  │
│  │  │          │  │   *         │  │  │
│  │  └──────────┘  └───────────┘  │  │
│  │                                │  │
│  │  ┌────────────────────────┐   │  │
│  │  │   Fedify (Fediverse    │   │  │
│  │  │   Middleware + KV)     │   │  │
│  │  └────────────────────────┘   │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  PostgreSQL (via Prisma)      │  │
│  │  - Users, Follows, Activities │  │
│  │  - Inbox/Outbox queue         │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

---

## Prisma Schema

### New Models

```prisma
/// Fediverse-specific user fields (add to existing User model)
model User {
  // ... existing fields ...

  // Fediverse fields
  federatedUrl      String?   @unique                 // https://xistrymemz.xyz/fediverse/actor/username
  privateKey        String?                           // RSA private key (PEM), for signing outgoing activities
  publicKey         String?                           // RSA public key (PEM), served via Actor endpoint
  followersCount    Int       @default(0)
  followingCount    Int       @default(0)
  inboxUrl          String?                           // actor inbox URL (mostly same for local, stored for remotes)
  sharedInboxUrl    String?                           // for receiving from remote instances
}

/// Tracks follows — both local↔local and local↔remote
model Follow {
  id              String    @id @default(cuid())
  followerId      String                             // local user ID who follows
  follower        User      @relation("Follower", fields: [followerId], references: [id], onDelete: Cascade)
  followedId      String                             // local user OR remote actor URL
  followed        User?     @relation("Followed", fields: [followedId], references: [id], onDelete: SetNull)
  remoteActorUrl  String?                            // if following a remote user, their actor URL
  remoteInboxUrl  String?                            // cached inbox URL for delivery
  status          String    @default("PENDING")      // PENDING / ACCEPTED / REJECTED
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([followerId, followedId])
  @@index([followerId])
  @@index([followedId])
}

/// Outbound activity queue — for reliable delivery to remote instances
model OutboxActivity {
  id              String    @id @default(cuid())
  userId          String                             // local user who created the activity
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  activityType    String                             // Follow, Create, Like, Announce, Delete
  objectType      String?                            // Note, Person, etc.
  objectId        String?                            // ID of the local object (ForumPost, etc.)
  serialized      String                             // Full JSON-LD activity, pre-serialized
  status          String    @default("PENDING")      // PENDING / DELIVERED / FAILED
  retryCount      Int       @default(0)
  lastError       String?
  createdAt       DateTime  @default(now())
  deliveredAt     DateTime?

  @@index([status, createdAt])
}

/// Track inbox activities received (for idempotency)
model InboxActivity {
  id              String    @id @default(cuid())
  activityId      String    @unique                   // ActivityPub `id` field — dedup key
  type            String                              // Follow, Create, Like, etc.
  actor           String                              // remote actor URL who sent it
  objectId        String?                             // the object being acted upon
  raw             String                              // full JSON-LD payload
  processed       Boolean   @default(false)
  processedAt     DateTime?
  createdAt       DateTime  @default(now())
}
```

---

## Route Map

All new routes under `src/app/`:

```
.well-known/
  webfinger/route.ts          → GET  /.well-known/webfinger?resource=acct:user@domain
  nodeinfo/route.ts           → GET  /.well-known/nodeinfo
  host-meta/route.ts          → GET  /.well-known/host-meta (XML, for older software)

api/
  fediverse/
    actor/
      [username]/route.ts     → GET  application/activity+json — Person object + key
    inbox/route.ts            → POST application/activity+json — shared inbox
    outbox/
      [userId]/route.ts       → GET  application/activity+json — OrderedCollectionPage
    follow/
      route.ts                → POST local follow (internal)
      [id]/route.ts           → PUT/DELETE approve/reject/unfollow
    nodeinfo/
      2.1/route.ts            → GET  application/json — server stats
    webfinger/route.ts        → GET  application/jrd+json — alternate WebFinger
```

---

## Route Implementations

### 1. WebFinger (`src/app/.well-known/webfinger/route.ts`)

```typescript
// /.well-known/webfinger?resource=acct:alice@xistrymemz.xyz
export async function GET(request: NextRequest) {
  const resource = request.nextUrl.searchParams.get('resource')
  if (!resource || !resource.startsWith('acct:')) {
    return NextResponse.json({ error: 'Invalid resource' }, { status: 400 })
  }

  const [_, fullHandle] = resource.split('acct:')
  const [username, domain] = fullHandle.split('@')

  if (domain !== 'xistrymemz.xyz') {
    return NextResponse.json({ error: 'Unknown domain' }, { status: 404 })
  }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user || !user.federatedUrl) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const jrd = {
    subject: resource,
    aliases: [user.federatedUrl],
    links: [
      { rel: 'self', type: 'application/activity+json', href: user.federatedUrl },
      { rel: 'http://webfinger.net/rel/profile-page', type: 'text/html', href: `https://xistrymemz.xyz/profile/${username}` }
    ]
  }

  return NextResponse.json(jrd, {
    headers: { 'Content-Type': 'application/jrd+json; charset=utf-8' }
  })
}
```

### 2. Actor (`src/app/api/fediverse/actor/[username]/route.ts`)

```typescript
// GET /api/fediverse/actor/alice → application/activity+json
export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params
  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const baseUrl = `https://xistrymemz.xyz`
  const actorUrl = `${baseUrl}/api/fediverse/actor/${username}`

  const actor = {
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      'https://w3id.org/security/v1',
      { manuallyApprovesFollowers: 'as:manuallyApprovesFollowers' }
    ],
    id: actorUrl,
    type: 'Person',
    preferredUsername: username,
    name: user.name || username,
    summary: user.bio || '',
    url: `${baseUrl}/profile/${username}`,
    icon: user.image ? { type: 'Image', url: user.image } : undefined,
    inbox: `${baseUrl}/api/fediverse/inbox`,
    sharedInbox: `${baseUrl}/api/fediverse/inbox`,
    outbox: `${baseUrl}/api/fediverse/outbox/${user.id}`,
    followers: `${actorUrl}/followers`,
    following: `${actorUrl}/following`,
    manuallyApprovesFollowers: false,
    publicKey: {
      id: `${actorUrl}#main-key`,
      owner: actorUrl,
      publicKeyPem: user.publicKey
    },
    published: user.createdAt.toISOString()
  }

  return NextResponse.json(actor, {
    headers: { 'Content-Type': 'application/activity+json; charset=utf-8' }
  })
}
```

### 3. Inbox (`src/app/api/fediverse/inbox/route.ts`)

```typescript
// POST /api/fediverse/inbox — receives activities from remote instances
export async function POST(request: Request) {
  const body = await request.json()
  const activityId = body.id
  const type = body.type
  const actor = body.actor  // remote actor URL
  const object = body.object

  // Dedup check
  const existing = await prisma.inboxActivity.findUnique({ where: { activityId } })
  if (existing) return NextResponse.json({ status: 'duplicate' })

  // Store raw activity
  await prisma.inboxActivity.create({
    data: {
      activityId,
      type,
      actor,
      objectId: typeof object === 'string' ? object : object?.id,
      raw: JSON.stringify(body)
    }
  })

  // Process by type
  switch (type) {
    case 'Follow':
      await handleFollowActivity(actor, object)
      break
    case 'Accept':
      await handleAcceptActivity(actor, object)
      break
    case 'Create':
    case 'Update':
    case 'Delete':
    case 'Like':
    case 'Announce':
    case 'Undo':
      await handleGenericActivity(type, actor, object)
      break
  }

  return NextResponse.json({ status: 'ok' })
}
```

### 4. Outbox (`src/app/api/fediverse/outbox/[userId]/route.ts`)

```typescript
// GET /api/fediverse/outbox/user-id → OrderedCollectionPage
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20

  const posts = await prisma.forumPost.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: (page - 1) * limit,
    include: {
      author: { select: { username: true, name: true, federatedUrl: true } },
      category: { select: { name: true } }
    }
  })

  const total = await prisma.forumPost.count({ where: { authorId: userId } })
  const totalPages = Math.ceil(total / limit)

  const items = posts.map(post => ({
    id: `${baseUrl}/api/fediverse/activity/${post.id}`,
    type: 'Create',
    actor: post.author.federatedUrl,
    published: post.createdAt.toISOString(),
    object: {
      id: `${baseUrl}/api/fediverse/note/${post.id}`,
      type: 'Note',
      attributedTo: post.author.federatedUrl,
      content: `<p>${escapeHtml(post.content)}</p>`,
      published: post.createdAt.toISOString(),
      tag: [{ type: 'Hashtag', name: `#${post.category.name}` }],
      to: ['https://www.w3.org/ns/activitystreams#Public']
    },
    to: ['https://www.w3.org/ns/activitystreams#Public'],
    cc: [post.author.federatedUrl + '/followers']
  }))

  const collection = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${baseUrl}/api/fediverse/outbox/${userId}`,
    type: 'OrderedCollection',
    totalItems: total,
    first: `${baseUrl}/api/fediverse/outbox/${userId}?page=1`,
    last: `${baseUrl}/api/fediverse/outbox/${userId}?page=${totalPages}`,
    ...(page <= totalPages ? { partOf: `${baseUrl}/api/fediverse/outbox/${userId}`, orderedItems: items } : {})
  }

  return NextResponse.json(collection, {
    headers: { 'Content-Type': 'application/activity+json; charset=utf-8' }
  })
}
```

### 5. NodeInfo (`src/app/.well-known/nodeinfo/route.ts` + `src/app/api/fediverse/nodeinfo/2.1/route.ts`)

```typescript
// GET /.well-known/nodeinfo
export async function GET() {
  return NextResponse.json({
    links: [{
      rel: 'http://nodeinfo.diaspora.software/ns/schema/2.1',
      href: 'https://xistrymemz.xyz/api/fediverse/nodeinfo/2.1'
    }]
  })
}

// GET /api/fediverse/nodeinfo/2.1
export async function GET() {
  const [userCount, postCount, activeMonth] = await Promise.all([
    prisma.user.count(),
    prisma.forumPost.count(),
    prisma.user.count({ where: { lastActiveAt: { gte: new Date(Date.now() - 30 * 86400000) } } })
  ])

  return NextResponse.json({
    version: '2.1',
    software: { name: 'xistrymemz', version: '0.7.0' },
    protocols: { inbound: ['activitypub'], outbound: ['activitypub'] },
    services: { inbound: [], outbound: [] },
    openRegistrations: true,
    usage: {
      users: { total: userCount, activeHalfyear: activeMonth * 6, activeMonth },
      localPosts: postCount,
      localComments: 0
    },
    metadata: { nodeName: 'XistrYmemZ — The Cosmic Whitepages Cooperative' }
  })
}
```

---

## Helper: `src/lib/federation.ts`

Central module for shared Fedify configuration, key management, and delivery logic.

```typescript
import { generateKeyPairSync } from 'crypto'

export function generateActorKeys() {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  })
  return { publicKey, privateKey }
}

export function getBaseUrl() {
  return process.env.NEXTAUTH_URL || 'https://xistrymemz.xyz'
}

// HTTP Signature verification (simplified)
export function verifyHttpSignature(
  signatureHeader: string,
  method: string,
  path: string,
  body: string,
  publicKeyPem: string
): boolean {
  // Parse Signature header, verify with node's crypto
  // Using @fedify/fedify or manual HTTP signature lib
}

// Deliver activity to remote inbox with HTTP signatures
export async function deliverToInbox(
  inboxUrl: string,
  activity: Record<string, unknown>,
  privateKeyPem: string,
  keyId: string
): Promise<boolean> {
  const body = JSON.stringify(activity)
  const digest = createHash('sha256').update(body).digest('base64')
  const date = new Date().toUTCString()

  const signString = `(request-target): post ${new URL(inboxUrl).pathname}\nhost: ${new URL(inboxUrl).host}\ndate: ${date}\ndigest: SHA-256=${digest}`
  const signer = createSign('rsa-sha256')
  signer.update(signString)
  const signature = signer.sign(privateKeyPem, 'base64')

  const header = `keyId="${keyId}",algorithm="rsa-sha256",headers="(request-target) host date digest",signature="${signature}"`

  try {
    const res = await fetch(inboxUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/activity+json',
        'Date': date,
        'Digest': `SHA-256=${digest}`,
        'Signature': header,
        'User-Agent': 'XistrYmemZ/0.7.0 (Fediverse)'
      },
      body
    })
    return res.ok
  } catch {
    return false
  }
}
```

---

## Content Mapping Reference

### Outgoing (XistrYmemZ → ActivityPub)

| XistrYmemZ Event | ActivityPub Type | `object` Mapping |
|---|---|---|
| User creates ForumPost | `Create` → `Note` | `name: post.title`, `content: post.content`, `tag: [{type:'Hashtag',name:'#'+category}]` |
| User deletes ForumPost | `Delete` → `Note` | `id: <note-url>` |
| User likes ForumPost | `Like` → `Note` | `id: <note-url>` |
| User follows another user | `Follow` → `Person` | `id: <target-actor-url>` |
| User accepts follow | `Accept` → `Follow` | `id: <original-follow-activity-url>` |
| User rejects follow | `Reject` → `Follow` | `id: <original-follow-activity-url>` |
| User updates profile | `Update` → `Person` | Full actor object as `object` |

### Incoming (ActivityPub → XistrYmemZ)

| ActivityPub Activity | XistrYmemZ Action |
|---|---|
| `Follow` (remote → local user) | Create `Follow` record with `PENDING`, notify user |
| `Accept` (remote accepted our follow) | Update `Follow` status to `ACCEPTED` |
| `Reject` (remote rejected our follow) | Update `Follow` status to `REJECTED` |
| `Create` → `Note` | Store as wall post (if actor is followed), or ignore |
| `Delete` → `Note` | Remove stored note (if we have it) |
| `Like` → `Note` | Increment like on corresponding local post |
| `Announce` → `Note` | Record as boost/share on the local post |
| `Undo` → `Follow` | Remove follow relationship |

---

## Outbound Delivery Queue

Activities to remote instances must be delivered reliably. Use a queue pattern:

```
User creates ForumPost
  ↓
Create OutboxActivity record (status: PENDING)
  ↓
Cron / webhook processes PENDING activities:
  → Look up all ACCEPTED followers with remoteInboxUrl
  → Sign activity with user's privateKey
  → POST to each follower's inbox
  → Mark DELIVERED on success, FAILED + retryCount on failure
  → Retry failed up to 3 times with exponential backoff
```

**Cron pattern** (via Vercel Cron Jobs or a simple interval):

```typescript
// src/app/api/cron/deliver-fediverse/route.ts — called every 5 minutes
export async function GET() {
  const pending = await prisma.outboxActivity.findMany({
    where: {
      status: 'PENDING',
      retryCount: { lt: 3 },
      createdAt: { gte: new Date(Date.now() - 86400000) } // not older than 1 day
    },
    take: 50
  })

  for (const activity of pending) {
    const followers = await prisma.follow.findMany({
      where: {
        followedId: activity.userId,
        status: 'ACCEPTED',
        remoteInboxUrl: { not: null }
      }
    })

    const user = await prisma.user.findUnique({
      where: { id: activity.userId },
      select: { privateKey: true, federatedUrl: true }
    })
    if (!user?.privateKey || !user?.federatedUrl) continue

    const serialized = JSON.parse(activity.serialized)
    let allDelivered = true

    for (const follower of followers) {
      const ok = await deliverToInbox(
        follower.remoteInboxUrl!,
        serialized,
        user.privateKey,
        `${user.federatedUrl}#main-key`
      )
      if (!ok) allDelivered = false
    }

    await prisma.outboxActivity.update({
      where: { id: activity.id },
      data: {
        status: allDelivered ? 'DELIVERED' : 'FAILED',
        deliveredAt: allDelivered ? new Date() : null,
        retryCount: { increment: 1 },
        lastError: allDelivered ? null : 'Delivery failed'
      }
    })
  }
}
```

---

## Implementation Order

### Sprint 1: Foundation (Days 1-3)

| Day | Tasks |
|-----|-------|
| 1 | Install Fedify, create `src/lib/federation.ts`, generate RSA keys on user registration, add Prisma migrations |
| 2 | WebFinger endpoint + Actor endpoint — test with `curl` and Mastodon's "search" |
| 3 | NodeInfo endpoints, host-meta, verify Mastodon can discover `@user@xistrymemz.xyz` |

**Validation checkpoint:**
```bash
# WebFinger
curl 'https://xistrymemz.xyz/.well-known/webfinger?resource=acct:testuser@xistrymemz.xyz'
# Actor
curl -H 'Accept: application/activity+json' 'https://xistrymemz.xyz/api/fediverse/actor/testuser'
# Mastodon search
# Go to mastodon.social → search → "testuser@xistrymemz.xyz"
```

### Sprint 2: Inbox + Follow (Days 4-7)

| Day | Tasks |
|-----|-------|
| 4 | Build shared inbox (`POST /api/fediverse/inbox`), activity dedup, HTTP signature verification |
| 5 | Handle incoming `Follow` → create Follow record, send `Accept` back |
| 6 | Handle outgoing `Follow` → deliver to remote inbox, process `Accept`/`Reject` responses |
| 7 | Follow/unfollow UI on profile pages, pending follow requests tab |

**Validation checkpoint:**
```bash
# From Mastodon, follow @testuser@xistrymemz.xyz
# Verify follow request appears in XistrYmemZ
# Accept it → verify Mastodon shows "Following"
```

### Sprint 3: Content Federation (Days 8-12)

| Day | Tasks |
|-----|-------|
| 8 | Outbox endpoint — serve user's ForumPosts as `OrderedCollectionPage` |
| 9 | Create-outbound queue — when user posts, persist `OutboxActivity`, deliver to followers |
| 10 | Incoming `Create`/`Note` — store notes from followed remote users as wall posts |
| 11 | Like/Announce handling — incoming likes increment counters, boosts create announcements |
| 12 | Delete propagation — account deletion sends `Delete` to all followers, post deletion sends `Delete` for that note |

### Sprint 4: Polish (Days 13-16)

| Day | Tasks |
|-----|-------|
| 13 | UI: follow/unfollow buttons on profile pages, follower/following counts, remote user profile display |
| 14 | Admin: fediverse settings page (relay URL, blocklist, instance description for NodeInfo) |
| 15 | Rate limiting, error handling, retry logic for failed deliveries |
| 16 | Testing with Mastodon, Pixelfed, Lemmy — fix interoperability issues |

---

## Testing Strategy

### Unit Tests

```typescript
// __tests__/fediverse/webfinger.test.ts
describe('WebFinger', () => {
  it('returns JRD for valid user')
  it('returns 404 for unknown user')
  it('returns 400 for missing resource param')
})

// __tests__/fediverse/actor.test.ts
describe('Actor endpoint', () => {
  it('returns Person with correct publicKey')
  it('returns 404 for nonexistent user')
  it('sets correct Content-Type header')
})

// __tests__/fediverse/signatures.test.ts
describe('HTTP Signatures', () => {
  it('verifies valid signature')
  it('rejects tampered body')
  it('rejects expired date header')
})
```

### Integration Tests

```
1. Create User A on instance 1, User B on instance 2 (or use mastodon.social)
2. Search for User A from instance 2 → verify WebFinger resolves
3. Follow User A from instance 2 → verify follow request appears
4. User A accepts → verify instance 2 shows "Following"
5. User A creates a post → verify it appears in instance 2's timeline
6. User B likes the post → verify like count updates on instance 1
7. User B boosts the post → verify boost appears
8. User A deletes the post → verify it disappears from instance 2
9. User A deletes account → verify followers get Delete activity
```

---

## Security Considerations

| Concern | Mitigation |
|---------|-----------|
| **HTTP Signature Spoofing** | Verify all incoming activities with `crypto.verify()` using the remote actor's publicKey fetched from their Actor endpoint. Cache keys with TTL. |
| **Activity Replay** | Dedup via `InboxActivity.activityId` unique constraint. Reject activities older than 24h via `published` field check. |
| **Private Key Theft** | Store private keys in database column encrypted at rest (PostgreSQL pgcrypto or application-level AES). Never log or expose in error messages. |
| **Follower Spam** | Rate-limit follow requests per remote actor (max 10/min). Require manual approval for new accounts. |
| **Content Injection** | Sanitize HTML in incoming `Note.content` before storing (strip `<script>`, disallowed tags). Use DOMPurify. |
| **Actor Impersonation** | Always verify the `actor` field matches the HTTP Signature key owner. Reject mismatches. |
| **Denial of Service** | Limit incoming activity size (max 1MB). Use Vercel's body size limit. Rate-limit per IP. |

---

## Open Questions

1. **User handle format**: `@username@xistrymemz.xyz` or `@username.xistrymemz.xyz`? Subdomain handles are harder to implement but more portable if users ever want to self-host.
2. **Blocks/muting**: Should fediverse blocks propagate? If User A blocks User B on Mastodon, should that block carry to XistrYmemZ?
3. **Media storage**: Remote instances will fetch media URLs from our CDN. Need proper CORS headers and long-lived cache TTLs.
4. **Groups federation**: Should Group posts federate to a Group actor that remote users can follow? Groups would need their own Actor endpoint.
5. **Crypto tips**: Can tip activities be expressed in ActivityPub? Likely needs custom extension types (e.g. `XistrYmemZTip`).
6. **Delete propagation**: When a user deletes their account, iterate all `Follow` records where user is `followedId` with `remoteInboxUrl`, send `Delete` to each. This could be slow — needs async job.
7. **Email notifications**: When a remote user follows a local user, should they get an email? (Yes, treat like any other notification)
