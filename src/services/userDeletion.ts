import { prisma } from '@/lib/prisma'
import { unpinGatewayUrl } from '@/lib/ipfs'
import { rm } from 'fs/promises'
import { join } from 'path'

/**
 * Delete a user completely: unpin their IPFS media (reclaims the Pinata
 * file quota), drop their File rows, remove any local fallback uploads,
 * then delete the user row itself (relations cascade from there).
 *
 * File cleanup is best-effort and never fails the deletion — a missed unpin
 * just leaves a pinned CID behind, never a half-deleted user.
 */
export async function deleteUserCompletely(userId: string): Promise<{
  filesUnpinned: number
  fileRowsDeleted: number
  localDirRemoved: boolean
}> {
  let filesUnpinned = 0
  let fileRowsDeleted = 0
  let localDirRemoved = false

  // 1. Collect every media URL the user owns: File rows + post attachments
  //    (older uploads may lack File rows but still pin quota).
  const urls = new Set<string>()
  try {
    const files = await prisma.file.findMany({
      where: { userId },
      select: { gatewayUrl: true },
    })
    for (const f of files) {
      if (typeof f.gatewayUrl === 'string' && f.gatewayUrl) urls.add(f.gatewayUrl)
    }
  } catch {}

  try {
    const posts = await prisma.post.findMany({
      where: { userId },
      select: { images: true, imageUrl: true, videoUrl: true },
    })
    for (const p of posts) {
      try {
        const parsed = JSON.parse((p as { images?: string | null }).images || 'null')
        if (Array.isArray(parsed)) {
          for (const u of parsed) if (typeof u === 'string' && u) urls.add(u)
        }
      } catch {}
      for (const key of ['imageUrl', 'videoUrl'] as const) {
        const u = (p as Record<string, unknown>)[key]
        if (typeof u === 'string' && u) urls.add(u)
      }
    }
  } catch {}

  // 2. Unpin everything (best-effort, never throws).
  if (urls.size > 0) {
    const results = await Promise.allSettled([...urls].map((u) => unpinGatewayUrl(u)))
    filesUnpinned = results.filter((r) => r.status === 'fulfilled').length
  }

  // 3. Drop File rows (they would FK-block user.delete).
  try {
    const del = await prisma.file.deleteMany({ where: { userId } })
    fileRowsDeleted = del.count
  } catch {}

  // 4. Remove local fallback uploads (dev/self-hosted; Vercel has no FS).
  try {
    await rm(join(process.cwd(), 'public', 'uploads', userId), { recursive: true, force: true })
    localDirRemoved = true
  } catch {
    localDirRemoved = false
  }

  // 5. Delete the user; remaining relations cascade.
  await prisma.user.delete({ where: { id: userId } })

  return { filesUnpinned, fileRowsDeleted, localDirRemoved }
}
