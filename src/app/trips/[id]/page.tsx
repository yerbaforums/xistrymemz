import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import TripView from './TripView'
import Breadcrumbs from '@/components/Breadcrumbs'

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  const trip = await prisma.trip.findFirst({
    where: {
      id,
      OR: [
        { isPublic: true },
        { userId: session?.user?.id },
        { collaborators: { some: { userId: session?.user?.id } } }
      ]
    },
    include: {
      stops: { orderBy: [{ day: 'asc' }, { order: 'asc' }] },
      user: { select: { id: true, name: true, image: true } },
      collaborators: {
        include: { user: { select: { id: true, name: true, image: true } } }
      }
    }
  })

  if (!trip) notFound()

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Trips', href: '/trips' }, { label: trip.title || 'Trip' }]} />
      <TripView trip={JSON.parse(JSON.stringify(trip))} sessionUserId={session?.user?.id} />
    </div>
  )
}
