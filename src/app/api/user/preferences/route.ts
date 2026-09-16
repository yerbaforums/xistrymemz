import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserPreferences, setUserPreferences, PREF_DEFAULTS } from '@/services/preferenceService'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const preferences = await getUserPreferences(session.user.id)
  return NextResponse.json({ preferences, defaults: PREF_DEFAULTS })
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let patch: unknown
  try {
    patch = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return NextResponse.json({ error: 'Body must be a preferences object' }, { status: 400 })
  }

  const preferences = await setUserPreferences(session.user.id, patch as Record<string, unknown>)
  return NextResponse.json({ preferences })
}