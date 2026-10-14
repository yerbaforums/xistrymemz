import { apiSuccess } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import {
  getEffectiveListingLocation,
  isPassportHidden,
} from '@/lib/listing-location'

export const dynamic = 'force-dynamic'

const OWNER_PASSPORT_SELECT = {
  traveling: true,
  latitude: true,
  longitude: true,
  location: true,
  preferences: true,
} as const

export async function GET() {
  try {
    const [products, events, plans, requests, shops, rentals, services, boards] = await Promise.all([
      prisma.product.findMany({
        // Include travelsWithOwner listings even without their own coords —
        // they can appear at the owner's current location.
        where: {
          published: true,
          type: { not: 'RENTAL' },
          OR: [{ latitude: { not: null } }, { travelsWithOwner: true }],
        },
        select: {
          id: true, title: true, latitude: true, longitude: true, price: true, imageUrl: true, userId: true,
          isGlobal: true, isRemote: true, travelsWithOwner: true,
          user: { select: OWNER_PASSPORT_SELECT },
        },
        take: 100,
      }),
      prisma.event.findMany({
        where: { eventDate: { gte: new Date() }, latitude: { not: null }, longitude: { not: null } },
        select: { id: true, title: true, latitude: true, longitude: true, eventDate: true, organizerId: true },
        take: 100,
      }),
      prisma.project.findMany({
        where: { published: true, latitude: { not: null }, longitude: { not: null } },
        select: { id: true, title: true, latitude: true, longitude: true, userId: true },
        take: 100,
      }),
      prisma.request.findMany({
        where: { isPublic: true, latitude: { not: null }, longitude: { not: null } },
        select: { id: true, title: true, latitude: true, longitude: true, userId: true, goalAmount: true, currentFunding: true },
        take: 100,
      }),
      prisma.user.findMany({
        where: { latitude: { not: null }, longitude: { not: null }, shopSlug: { not: null } },
        // Hidden passports omit their pin from public maps entirely.
        select: { id: true, shopName: true, shopSlug: true, latitude: true, longitude: true, shopImage: true, preferences: true },
        take: 100,
      }),
      prisma.product.findMany({
        where: {
          published: true,
          type: 'RENTAL',
          OR: [{ latitude: { not: null } }, { travelsWithOwner: true }],
        },
        select: {
          id: true, title: true, latitude: true, longitude: true, rentalDaily: true, imageUrl: true, userId: true,
          travelsWithOwner: true,
          user: { select: OWNER_PASSPORT_SELECT },
        },
        take: 100,
      }),
      prisma.serviceOffering.findMany({
        where: { isActive: true },
        select: {
          id: true, title: true, location: true, price: true, imageUrl: true,
          latitude: true, longitude: true, travelsWithOwner: true,
          user: { select: OWNER_PASSPORT_SELECT },
        },
        take: 100,
      }),
      prisma.bulletinBoard.findMany({
        where: { isPublic: true, latitude: { not: null }, longitude: { not: null } },
        select: { id: true, name: true, slug: true, latitude: true, longitude: true },
        take: 100,
      }),
    ])

    // Listings opted into "travels with me" plot at the owner's current
    // passport location while the owner is traveling. Owners with a hidden
    // passport are omitted from public maps entirely (privacy promise).
    const listingPins = (
      list: Array<{
        id: string
        title: string
        latitude: number | null
        longitude: number | null
        isGlobal?: boolean
        isRemote?: boolean
        price?: number | null
        rentalDaily?: number | null
        imageUrl?: string | null
        travelsWithOwner: boolean
        user: { traveling: boolean; latitude: number | null; longitude: number | null; location: string | null; preferences: unknown } | null
      }>,
      type: 'product' | 'rental',
    ) =>
      list
        .map((p) => {
          // Global/remote listings have no physical location to pin.
          if (p.isGlobal || p.isRemote) return null
          const effective = getEffectiveListingLocation(p, p.user)
          if (effective.latitude == null || effective.longitude == null) return null
          if (effective.traveling && isPassportHidden(p.user?.preferences)) return null
          const traveling = effective.traveling
          const priceMeta = type === 'rental'
            ? (p.rentalDaily ? `$${p.rentalDaily}/day` : undefined)
            : (p.price ? `$${p.price}` : undefined)
          return {
            id: p.id,
            type,
            title: p.title,
            lat: effective.latitude,
            lng: effective.longitude,
            url: `/products/${p.id}`,
            image: p.imageUrl ?? null,
            meta: traveling ? `✈️ Traveling${priceMeta ? ` · ${priceMeta}` : ''}` : priceMeta,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)

    const items = [
      ...listingPins(products, 'product'),
      ...events.map(e => ({ id: e.id, type: 'event' as const, title: e.title, lat: e.latitude!, lng: e.longitude!, url: `/events/${e.id}`, image: null, meta: e.eventDate ? new Date(e.eventDate).toLocaleDateString() : undefined })),
      ...plans.map(p => ({ id: p.id, type: 'project' as const, title: p.title, lat: p.latitude!, lng: p.longitude!, url: `/projects/${p.id}`, image: null, meta: 'Project' })),
      ...requests.map(r => ({ id: r.id, type: 'request' as const, title: r.title, lat: r.latitude!, lng: r.longitude!, url: `/requests/${r.id}`, image: null, meta: r.goalAmount ? `$${r.currentFunding || 0} / $${r.goalAmount}` : undefined })),
      ...shops
        .filter(s => !isPassportHidden(s.preferences))
        .map(s => ({ id: s.id, type: 'shop' as const, title: s.shopName || 'Shop', lat: s.latitude!, lng: s.longitude!, url: `/shop/${s.shopSlug}`, image: s.shopImage, meta: 'Shop' })),
      ...listingPins(rentals, 'rental'),
      ...services
        .map((s) => {
          const effective = getEffectiveListingLocation(s, s.user)
          // Services without their own coordinates have historically plotted
          // at the owner's location; keep that, but a hidden passport means
          // no public pin there (fall back to the service's own coords).
          let lat = effective.latitude
          let lng = effective.longitude
          const traveling = effective.traveling
          // A hidden passport never exposes the traveling-derived pin.
          if (traveling && isPassportHidden(s.user?.preferences)) return null
          if (lat == null && s.user?.latitude != null && s.user?.longitude != null) {
            if (isPassportHidden(s.user.preferences)) return null
            lat = s.user.latitude
            lng = s.user.longitude
          }
          if (lat == null || lng == null) return null
          return {
            id: s.id,
            type: 'service' as const,
            title: s.title,
            lat,
            lng,
            url: `/services/${s.id}`,
            image: s.imageUrl,
            meta: traveling ? `✈️ Traveling${s.price ? ` · $${s.price}` : ''}` : s.price ? `$${s.price}` : undefined,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
      ...boards.map(b => ({ id: b.id, type: 'board' as const, title: b.name, lat: b.latitude!, lng: b.longitude!, url: `/boards/${b.slug}`, image: null, meta: 'Board' })),
    ]

    return apiSuccess({ items })
  } catch (error) {
    console.error('Error fetching map data:', error)
    return apiSuccess({ items: [] })
  }
}
