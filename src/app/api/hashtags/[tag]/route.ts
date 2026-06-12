import { NextRequest, apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  try {
    const { tag } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const hashtag = await prisma.hashtag.findUnique({
      where: { tag: tag.toLowerCase() }
    })

    if (!hashtag) {
      return NextResponse.json({
        tag,
        totals: { posts: 0, products: 0, events: 0, services: 0, schoolContents: 0, plans: 0, requests: 0, groups: 0, forumPosts: 0, groupPosts: 0 },
        data: {}
      })
    }

    const [postCount, productCount, eventCount, serviceCount, schoolContentCount, planCount, requestCount, groupCount, forumPostCount, groupPostCount] =
      await Promise.all([
        prisma.postHashtag.count({ where: { hashtagId: hashtag.id, sourceType: 'POST' } }),
        prisma.productHashtag.count({ where: { hashtagId: hashtag.id } }),
        prisma.eventHashtag.count({ where: { hashtagId: hashtag.id } }),
        prisma.serviceOfferingHashtag.count({ where: { hashtagId: hashtag.id } }),
        prisma.schoolContentHashtag.count({ where: { hashtagId: hashtag.id } }),
        prisma.planHashtag.count({ where: { hashtagId: hashtag.id } }),
        prisma.requestHashtag.count({ where: { hashtagId: hashtag.id } }),
        prisma.groupHashtag.count({ where: { hashtagId: hashtag.id } }),
        prisma.postHashtag.count({ where: { hashtagId: hashtag.id, sourceType: 'FORUMPOST' } }),
        prisma.postHashtag.count({ where: { hashtagId: hashtag.id, sourceType: 'GROUPPOST' } }),
      ])

    const totals = { posts: postCount, products: productCount, events: eventCount, services: serviceCount, schoolContents: schoolContentCount, plans: planCount, requests: requestCount, groups: groupCount, forumPosts: forumPostCount, groupPosts: groupPostCount }

    const data: Record<string, any> = {}

    if (type === 'all' || type === 'posts') {
      const postHashtags = await prisma.postHashtag.findMany({
        where: { hashtagId: hashtag.id, sourceType: 'POST' },
        include: {
          post: {
            include: {
              user: { select: { id: true, name: true, image: true, username: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: type === 'all' ? 5 : limit,
        skip: type === 'all' ? 0 : skip,
      })
      data.posts = postHashtags.map(ph => ({ ...ph.post, context: ph.post.context, _sourceType: 'post' }))
    }

    if (type === 'all' || type === 'products') {
      const productHashtags = await prisma.productHashtag.findMany({
        where: { hashtagId: hashtag.id },
        include: {
          product: {
            include: {
              user: { select: { id: true, name: true, image: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: type === 'all' ? 4 : limit,
        skip: type === 'all' ? 0 : skip,
      })
      data.products = productHashtags.map(ph => ph.product)
    }

    if (type === 'all' || type === 'events') {
      const eventHashtags = await prisma.eventHashtag.findMany({
        where: { hashtagId: hashtag.id },
        include: {
          event: {
            include: {
              organizer: { select: { id: true, name: true, image: true } },
              _count: { select: { eventJoiners: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: type === 'all' ? 4 : limit,
        skip: type === 'all' ? 0 : skip,
      })
      data.events = eventHashtags.map(eh => eh.event)
    }

    if (type === 'all' || type === 'services') {
      const serviceHashtags = await prisma.serviceOfferingHashtag.findMany({
        where: { hashtagId: hashtag.id },
        include: {
          serviceOffering: {
            include: {
              user: { select: { id: true, name: true, image: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: type === 'all' ? 4 : limit,
        skip: type === 'all' ? 0 : skip,
      })
      data.services = serviceHashtags.map(sh => sh.serviceOffering)
    }

    if (type === 'all' || type === 'schoolContents') {
      const schoolContentHashtags = await prisma.schoolContentHashtag.findMany({
        where: { hashtagId: hashtag.id },
        include: {
          schoolContent: {
            include: {
              author: { select: { id: true, name: true, image: true } },
              user: { select: { schoolName: true, schoolSlug: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: type === 'all' ? 4 : limit,
        skip: type === 'all' ? 0 : skip,
      })
      data.schoolContents = schoolContentHashtags.map(sch => sch.schoolContent)
    }

    if (type === 'all' || type === 'plans') {
      const planHashtags = await prisma.planHashtag.findMany({
        where: { hashtagId: hashtag.id },
        include: {
          plan: {
            include: {
              user: { select: { id: true, name: true, image: true } },
              _count: { select: { requests: true, joiners: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: type === 'all' ? 4 : limit,
        skip: type === 'all' ? 0 : skip,
      })
      data.plans = planHashtags.map(ph => ph.plan)
    }

    if (type === 'all' || type === 'requests') {
      const requestHashtags = await prisma.requestHashtag.findMany({
        where: { hashtagId: hashtag.id },
        include: {
          request: {
            include: {
              user: { select: { id: true, name: true, image: true } },
              _count: { select: { comments: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: type === 'all' ? 4 : limit,
        skip: type === 'all' ? 0 : skip,
      })
      data.requests = requestHashtags.map(rh => rh.request)
    }

    if (type === 'all' || type === 'groups') {
      const groupHashtags = await prisma.groupHashtag.findMany({
        where: { hashtagId: hashtag.id },
        include: {
          group: {
            include: {
              user: { select: { id: true, name: true, image: true } },
              _count: { select: { members: true, posts: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: type === 'all' ? 4 : limit,
        skip: type === 'all' ? 0 : skip,
      })
      data.groups = groupHashtags.map(gh => gh.group)
    }

    if (type === 'all' || type === 'forumPosts' || type === 'posts') {
      const forumHashtags = await prisma.postHashtag.findMany({
        where: { hashtagId: hashtag.id, sourceType: 'FORUMPOST' },
        include: {
          post: {
            include: {
              user: { select: { id: true, name: true, image: true, username: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: type === 'all' ? 4 : limit,
        skip: type === 'all' ? 0 : skip,
      })
      if (type === 'forumPosts') {
        data.forumPosts = forumHashtags.map(ph => ph.post)
      } else if (type === 'all') {
        if (!data.posts) data.posts = []
        data.posts = [...data.posts, ...forumHashtags.map(ph => ({ ...ph.post, context: ph.post.context, _sourceType: 'FORUMPOST' }))]
      }
    }

    if (type === 'all' || type === 'groupPosts' || type === 'posts') {
      const groupPostHashtags = await prisma.postHashtag.findMany({
        where: { hashtagId: hashtag.id, sourceType: 'GROUPPOST' },
        include: {
          post: {
            include: {
              user: { select: { id: true, name: true, image: true, username: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: type === 'all' ? 4 : limit,
        skip: type === 'all' ? 0 : skip,
      })
      if (type === 'groupPosts') {
        data.groupPosts = groupPostHashtags.map(ph => ph.post)
      } else if (type === 'all') {
        if (!data.posts) data.posts = []
        data.posts = [...data.posts, ...groupPostHashtags.map(ph => ({ ...ph.post, context: ph.post.context, _sourceType: 'GROUPPOST' }))]
      }
    }

    return NextResponse.json({ tag, totals, data })
  } catch (error) {
    console.error('Error fetching hashtag:', error)
    return apiError("Failed to fetch hashtag", 500)
  }
}
