# PolySocial Protocol Specification v0.1

## Vision

A **next-generation decentralized social protocol** that merges the best of existing systems (AT Protocol, ActivityPub, Nostr, Gozzip, Clout, Farcaster Snapchain) into a unified, scalable, censorship-resistant infrastructure with:
- **Content-addressed data** (portable between platforms)
- **Trust-weighted gossip** (your social graph = your algorithm)
- **Bilateral storage pacts** (friends store your data)
- **Account-scoped transactions** (no smart contracts, just social actions)
- **DNS-based identity** (you own your username)
- **"Dark" social graph** (third parties can't map your connections)
- **IPFS-backed storage** (user uploads + database backups)
- **Torrent-seeded backups** (decentralized disaster recovery)

---

## Core Concepts

### 1. Content-Addressed Data (Gozzip + AT Protocol inspired)

All data is addressed by cryptographic hash of content:
- **Primary**: `BLAKE3(json_encode(data))` for collision resistance
- **Secondary**: `SHA-256` for compatibility with IPFS CIDs
- **Format**: `blake3:<hex>` or `ipfs:<CID>`

Portable between XistrYmemZ, Bluesky, Mastodon via bridge nodes.

### 2. Bilateral Storage Pacts (Gozzip-inspired)

Users form **bilateral "pacts"** with friends to store each other's data:
- Enforced by challenge-response: `HMAC(content_hash, daily_rotation_key)`
- No unilateral caching (unlike SSB) - friends can't free-ride your data
- Pact terms: storage quota (MB), retention period, challenge frequency

```
Pact {
  peer_did: String,
  trust_score: Float,  // 0.0 - 1.0
  storage_quota: Int,   // MB
  challenge_nonce: [u8; 32],
  created_at: DateTime
}
```

### 3. Trust-Weighted Gossip (Clout-inspired)

Forward only to:
- **Distance 0**: You (author)
- **Distance 1**: Direct friends (trust = 1.0)
- **Distance 2**: Friends-of-friends (trust = 0.6)
- **Distance 3+**: "Auto-shadowbanned" (not in your reality)

Trust score decays exponentially: `trust = base_trust * (0.6 ^ distance)`

### 4. Account-Scoped Shards (Snapchain-inspired)

- Each user account = 1 shard (not global blockchain)
- **Transactions**: Post, Like, Follow, ProfileUpdate (no smart contracts)
- **Merkle root per account**, not global - enables parallel validation
- **Pruning**: Old deleted content can be removed from shard

```
Shard {
  owner_did: DID,
  events: [Event],
  merkle_root: BLAKE3Hash,
  sequence_num: Int
}
```

### 5. "Dark" Social Graph (Clout-inspired, Privacy Priority)

- Social graph stored **ONLY in client**, encrypted with:
  ```
  X25519_seal(content, recipient_pubkey)
  ```
- Servers/relays see: `{ content_hash, timestamp, hmac }` (no author, no target)
- Even storage pact partners can't map who you follow
- **Implementation first** (user priority decision)

### 6. Domain-Based Identity (AT Protocol-inspired)

- **Username**: `@handle.yourdomain.com` (you own the domain)
- **Key hierarchy**:
  - Root key (cold storage, ed25519 or secp256k1)
  - Device keys (daily use)
  - Delegation chain for apps
- **DID format**: `did:ps:secp256k1:<public_key_hex>` (user chose secp256k1)

### 7. Tiered Retrieval (Gozzip-inspired)

1. **Local pact storage** (92% of reads, 0ms latency)
2. **Pact gossip** (2.2% of reads, ~60ms latency)
3. **Relay fallback** (4.7% of reads, ~200ms latency)
4. **Never broadcast** to unknown nodes (unlike Nostr)

### 8. IPFS Integration (NEW)

- **User Uploads**: All file uploads pinned to IPFS
  - CID returned: `ipfs:<CID>`
  - Gateway URL: `https://gateway.pinata.cloud/ipfs/<CID>`
  - Stored in `File` model with polymorphic relation to User/Product/Post/etc.

- **Database Backups**: `pg_dump` → gzip → IPFS → torrent seed
  - Magnet links with IPFS webseed for hybrid availability
  - Admin UI to trigger backups and view magnet links

---

## Wire Format

### Event Structure:
```json
{
  "id": "blake3:abc123...",
  "type": "post" | "follow" | "like" | "profile_update",
  "author": "did:ps:secp256k1:<pubkey>",
  "content": "encrypted_or_plain_text",
  "reply_to": "blake3:...",
  "tags": ["#hashtag"],
  "created_at": "2026-05-06T17:00:00Z",
  "trust_distance": 1,
  "signature": "secp256k1_sig:<sig_hex>",
  "ipfs_cid": "Qm..."  // Optional: if content is large file
}
```

### Gossip Message:
```json
{
  "event": Event,
  "forwarded_by": "did:ps:...",
  "hop_count": 2,
  "hmac": "sha256:<hmac_hex>"
}
```

---

## Network Layer

### Transport Options:
1. **QUIC** (iRoh-inspired): UDP-based, NAT traversal, low latency
2. **WebRTC**: Browser-to-browser for local mesh
3. **HTTPS API**: For relay fallback and bridge nodes
4. **BLE** (future): For offline-first mobile mesh

### Web of Trust Configuration:
```json
{
  "pacts": [
    { "peer_did": "did:ps:...", "trust_score": 1.0, "storage_quota": "100MB" }
  ],
  "shadowbanned": ["did:ps:..."],
  "daily_rotation_key": "base64:...",
  "ipfs_gateway": "https://gateway.pinata.cloud/ipfs/"
}
```

---

## IPFS/Torrent Backup Specification

### Database Backup Flow:
```
1. pg_dump --dbname="$DATABASE_URL" > backup-{DATE}.sql
2. gzip backup-{DATE}.sql -> backup-{DATE}.sql.gz
3. ipfs add --pin backup-{DATE}.sql.gz -> CID = Qm...
4. Create torrent:
   mktorrent -a udp://tracker.opentrackr.org:1337 \
             -a udp://tracker.open-internet.nl:6969 \
             -o backup-{DATE}.torrent \
             backup-{DATE}.sql.gz
5. Magnet link:
   magnet:?xt=urn:btih:{INFOHASH}
     &dn=backup-{DATE}.sql.gz
     &tr=udp://tracker.opentrackr.org:1337
     &ws=https://gateway.pinata.cloud/ipfs/{CID}
6. Seed: Start torrent client seeding backup-{DATE}.torrent
```

### Magnet Link Format (with IPFS webseed):
```
magnet:?xt=urn:btih:{INFOHASH}
       &dn={FILENAME}
       &tr={TRACKER_URL}
       &ws={IPFS_GATEWAY_URL}
```

### Torrent File Storage:
- Stored in: `public/backups/{DATE}.torrent`
- Metadata in DB: `Backup` model with `cid`, `magnetLink`, `fileSize`, `createdAt`

---

## Bridge Nodes (Interoperability)

Allow XistrYmemZ users to interact with:

| Protocol | Bridge Type | Conversion |
|----------|-------------|-------------|
| **Bluesky (AT Protocol)** | Relay bridge | `did:plc:` ↔ `did:ps:`, AT Post ↔ PolySocial post |
| **Mastodon (ActivityPub)** | Federation bridge | `Note` ↔ post, `Follow` ↔ follow |
| **Nostr** | Relay bridge | `kind:1` ↔ post, `npub` ↔ `did:ps:` |
| **XistrYmemZ Native** | Direct bridge | ForumPost, Post, Plan, Product ↔ PolySocial events |

---

## Prisma Schema Extensions (for PolySocial + IPFS)

```prisma
// IPFS-backed file storage
model File {
  id          String   @id @default(cuid())
  cid         String   @unique  // IPFS CID (Qm... or bafy...)
  fileName    String
  mimeType    String
  size        Int
  gatewayUrl  String   // https://gateway.pinata.cloud/ipfs/{cid}
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  modelName   String   // "User", "Product", "Post", etc.
  modelId     String   // The ID of the record
  createdAt   DateTime @default(now())
}

// Database backups with torrent seeding
model Backup {
  id           String   @id @default(cuid())
  cid          String   @unique  // IPFS CID of backup file
  magnetLink   String   // Full magnet URI with trackers + IPFS webseed
  torrentFile  String   // Path to .torrent file
  fileName     String   // backup-2026-05-06.sql.gz
  fileSize     Int      // Bytes
  dbSize       Int      // Original DB size before compression
  createdAt    DateTime @default(now())
  createdBy    String   // Admin user ID
}

// PolySocial pacts
model StoragePact {
  id           String   @id @default(cuid())
  initiatorId  String
  initiator    User     @relation("PactInitiator", fields: [initiatorId], references: [id])
  peerId       String
  peer         User     @relation("PactPeer", fields: [peerId], references: [id])
  trustScore   Float    @default(1.0)
  storageQuota Int      // MB
  status       String   @default("ACTIVE")  // ACTIVE, PAUSED, TERMINATED
  challengeNonce String // Base64
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

// PolySocial events (account-scoped shards)
model PolySocialEvent {
  id           String   @id @default(cuid())
  eventId      String   @unique  // blake3 hash
  type         String   // post, follow, like, profile_update
  authorDid    String
  content      String   // Encrypted or plain text
  replyTo      String?  // eventId of parent
  tags         String[] // Hashtags
  trustDistance Int      @default(1)
  signature    String
  ipfsCid      String?  // If large content
  createdAt    DateTime @default(now())
}
```

---

## Implementation Phases

| Phase | Task | Files | Status |
|-------|------|-------|--------|
| **1** | Write PolySocial spec | `protocol/polysocial-spec.md` | ✅ DONE |
| **2** | IPFS client lib | `src/lib/ipfs.ts`, `package.json` | TODO |
| **3** | File model + migrations | `prisma/schema.prisma` | TODO |
| **4** | Modify upload route for IPFS | `src/app/api/upload/route.ts` | TODO |
| **5** | Backup script | `scripts/backup-db.ts` | TODO |
| **6** | Torrent/magnet utils | `src/lib/torrent.ts` | TODO |
| **7** | Admin backup API + UI | `src/app/api/admin/backup/route.ts`, `src/app/admin/backups/page.tsx` | TODO |
| **8** | Agent CLI: `polysocial` commands | `xistrymemz-agent/src/api/polysocial.ts`, `src/index.ts` | TODO |
| **9** | Rust core implementation | `protocol/rust-core/` | TODO |
| **10** | Bridge nodes | `protocol/bridges/` | TODO |

---

## NPM Dependencies Needed

### XistrYmemZ (Next.js):
```json
{
  "dependencies": {
    "kubo-rpc-client": "^6.1.0",  // IPFS RPC client (Kubo node)
    "pinata": "^2.0.0",             // Alternative: managed IPFS
    "magnet2torrent-js": "^1.0.0", // Magnet → torrent
    "parse-torrent": "^5.0.0",     // Parse/generate magnet URIs
    "blake3": "^2.1.0",            // BLAKE3 hashing
    "tweetnacl": "^1.0.3",         // secp256k1 + X25519 crypto
    "pg": "^8.13.0"                // For pg_dump script
  }
}
```

### XistrYmemZ-Agent:
```json
{
  "dependencies": {
    "kubo-rpc-client": "^6.1.0",
    "pinata": "^2.0.0"
  }
}
```

---

## Security Considerations

1. **Private Keys**: Never sent to server, stored only in client (Clout model)
2. **Dark Graph**: Social connections encrypted at rest and in transit
3. **Storage Pacts**: Challenge-response prevents free-riding
4. **IPFS**: CIDs are content-addressed, immutable - supports deletion via unpinning
5. **Torrents**: Magnet links include IPFS webseed as fallback - hybrid availability
6. **Backups**: `pg_dump` output should be encrypted before IPFS upload (future)

---

## References

- AT Protocol: https://atproto.com/specs/atp
- Gozzip: https://github.com/gozzip-protocol/gozzip
- Clout: https://github.com/flammafex/clout
- Snapchain: https://medium.com/@heimlabs/snapchain-whitepaper
- IPFS: https://docs.ipfs.tech/
- kubo-rpc-client: https://github.com/ipfs/js-kubo-rpc-client
- magnet2torrent-js: https://github.com/JindaiKirin/magnet2torrent-js

---

*Specification version: 0.1*
*Last updated: 2026-05-06*
*Authors: Xtr4d3 + opencode/big-pickle*
