import { prisma } from '@/lib/prisma'
import RentalsBrowseClient from './RentalsBrowseClient'
import Breadcrumbs from '@/components/Breadcrumbs'

export const dynamic = 'force-dynamic'

export default async function RentalsBrowsePage() {
  const rentals = await prisma.product.findMany({
    where: {
      type: 'RENTAL',
      published: true
    },
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      category: true,
      location: true,
      locationDetails: true,
      latitude: true,
      longitude: true,
      isGlobal: true,
      imageUrl: true,
      rentalDaily: true,
      rentalWeekly: true,
      rentalMonthly: true,
      rentalDeposit: true,
      rentalMinDays: true,
      rentalMaxDays: true,
      rentalAvailable: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          username: true,
          shopSlug: true
        }
      }
    },
    orderBy: [
      { pinned: 'desc' },
      { createdAt: 'desc' }
    ]
  })

  const serialized = rentals.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))

  const categories = [...new Set(rentals.map(r => r.category).filter(Boolean))].sort() as string[]
  const locations = [...new Set(rentals.map(r => r.location).filter(Boolean))].sort() as string[]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Rentals' }]} />
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Browse Rentals</h1>
        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          Find items to rent from the community
        </p>
      </div>
      <RentalsBrowseClient
        initialRentals={serialized}
        categories={categories}
        locations={locations}
      />
    </div>
  )
}
