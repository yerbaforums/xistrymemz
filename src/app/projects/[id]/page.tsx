import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import ProjectDetailClient from './ProjectDetailClient'
import Breadcrumbs from '@/components/Breadcrumbs'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const project = await prisma.project.findUnique({
    where: { id },
    select: { title: true, description: true, imageUrl: true },
  })
  if (!project) return {}
  const title = `${project.title} — Projects — XistrYmemZ`
  const description = project.description?.slice(0, 160) || 'A cooperative project on XistrYmemZ'
  return {
    title,
    description,
    openGraph: { title, description, images: project.imageUrl ? [project.imageUrl] : [] },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function ProjectDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const session = await getServerSession(authOptions)
  const { id } = await params
  const userId = session?.user?.id || ''
  const userRole = (session?.user as { role?: string })?.role || 'USER'
  
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, username: true, email: true } },
      editors: { select: { userId: true } },
      requests: {
        orderBy: { createdAt: 'desc' },
        include: {
      user: { select: { id: true, name: true, username: true, email: true, image: true } },
          product: { select: { id: true, title: true, price: true, imageUrl: true } }
        }
      },
      events: {
        orderBy: { eventDate: 'asc' },
        include: {
          eventJoiners: {
            include: { user: { select: { id: true, name: true, email: true } } }
          }
        }
      },
      joiners: {
        include: { user: { select: { id: true, name: true, email: true } } }
      },
      contributions: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } }
      }
    }
  })

  if (!project) {
    redirect('/projects')
  }

  const isOwner = project.userId === userId
  const isEditor = project.editors.some(e => e.userId === userId)
  const isAdmin = userRole === 'ADMIN'
  const canEdit = isOwner || isEditor || isAdmin

  const serializedProject = {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    goals: project.goals,
    mileposts: project.mileposts,
    milepostStatus: project.milepostStatus,
    schoolId: project.schoolId,
    shopId: project.shopId,
    requests: project.requests.map(req => ({
      ...req,
      createdAt: req.createdAt.toISOString(),
      updatedAt: req.updatedAt.toISOString(),
    })),
    isOwner,
    isEditor: canEdit,
    joiners: project.joiners.map(j => ({
      ...j,
      joinedAt: j.joinedAt.toISOString(),
      user: { id: j.user.id, name: j.user.name, email: j.user.email }
    })),
    contributions: project.contributions.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      user: { id: c.user.id, name: c.user.name, email: c.user.email }
    })),
    events: project.events.map(event => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      eventDate: event.eventDate ? event.eventDate.toISOString() : null,
      endDate: event.endDate ? event.endDate.toISOString() : null,
      joiners: event.eventJoiners.map(j => ({
        ...j,
        joinedAt: j.joinedAt.toISOString()
      }))
    }))
  }

  return (
    <>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Projects', href: '/projects' },
        { label: serializedProject.title || 'Project' },
      ]} />
      <ProjectDetailClient project={serializedProject} userId={userId} isOwner={canEdit} />
    </>
  )
}
