import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { extractAndLinkHashtags, extractHashtags, linkHashtags } from '@/services/hashtagService'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const user = await prisma.user.findFirst({
    where: { schoolSlug: slug },
    select: { id: true }
  })

  if (!user) {
    return apiError("School not found", 404)
  }

  const contents = await prisma.schoolContent.findMany({
    where: { userId: user.id },
    include: { 
      author: { select: { id: true, name: true } },
      user: { select: { schoolName: true, schoolSlug: true } },
      hashtags: { include: { hashtag: true } }
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
  })

  return apiSuccess(contents)
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { slug } = await params

  const user = await prisma.user.findFirst({
    where: { schoolSlug: slug }
  })

  if (!user || user.id !== session.user.id) {
    return apiError("Not authorized", 403)
  }

  const body = await request.json()
  const { title, content, contentType, images, videoUrl, price, isPaid, section, sortOrder, hashtags: explicitHashtags } = body

  if (!title || !content) {
    return apiError("Title and content required", 400)
  }

  const schoolContent = await prisma.schoolContent.create({
    data: {
      title,
      content,
      contentType: contentType || 'article',
      images: images || null,
      videoUrl: videoUrl || null,
      price: isPaid ? (parseFloat(price) || 0) : 0,
      isPaid: isPaid || false,
      contentSection: section || null,
      sortOrder: sortOrder || 0,
      userId: user.id,
      authorId: session.user.id
    }
  })

  if (Array.isArray(explicitHashtags) && explicitHashtags.length > 0) {
    await linkHashtags('SCHOOLCONTENT', schoolContent.id, explicitHashtags)
  } else {
    await extractAndLinkHashtags(title + ' ' + content, 'SCHOOLCONTENT', schoolContent.id)
  }

  return apiSuccess(schoolContent)
}
