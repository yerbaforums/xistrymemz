import { NextResponse, NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { Session } from 'next-auth'
import type { z } from 'zod'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  metadata?: {
    total?: number
    page?: number
    limit?: number
    [key: string]: unknown
  }
}

export function apiSuccess<T>(data: T, status = 200, metadata?: ApiResponse['metadata']): NextResponse {
  const body: ApiResponse<T> = { success: true, data }
  if (metadata) body.metadata = metadata
  return NextResponse.json(body, { status })
}

export function apiError(message: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, error: message } satisfies ApiResponse, { status })
}

export function apiPaginated<T>(data: T[], total: number, page: number, limit: number): NextResponse {
  return apiSuccess(data, 200, { total, page, limit })
}

function getSessionOrError(session: Session | null): { error: NextResponse } | null {
  if (!session?.user?.id) {
    return { error: apiError('Unauthorized', 401) }
  }
  return null
}

export function requireAdmin(session: Session | null): NextResponse | null {
  if (!session?.user?.id) {
    return apiError('Unauthorized', 401)
  }
  if (session.user.role !== 'ADMIN') {
    return apiError('Forbidden', 403)
  }
  return null
}

interface HandlerContext<T = Record<string, string>> {
  params: T
  searchParams: URLSearchParams
}

type AuthenticatedHandler<T = Record<string, string>> = (
  req: NextRequest,
  session: Session,
  context: HandlerContext<T>
) => Promise<NextResponse>

export function withAuth<T extends Record<string, string> = Record<string, string>>(
  handler: AuthenticatedHandler<T>
): (req: NextRequest, context: { params: Promise<T> }) => Promise<NextResponse> {
  return async (req: NextRequest, context: { params: Promise<T> }) => {
    const session = await getServerSession(authOptions)
    const err = getSessionOrError(session)
    if (err) return err.error

    const searchParams = req.nextUrl.searchParams
    const params = await context.params
    return handler(req, session!, { params, searchParams })
  }
}

type ValidatedHandler<T> = (
  req: NextRequest,
  session: Session,
  data: T
) => Promise<NextResponse>

export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: ValidatedHandler<T>
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    const session = await getServerSession(authOptions)
    const err = getSessionOrError(session)
    if (err) return err.error

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('Invalid JSON body', 400)
    }

    const result = schema.safeParse(body)
    if (!result.success) {
      const messages = result.error.issues.map(i => i.message).join(', ')
      return apiError(messages, 400)
    }

    return handler(req, session!, result.data)
  }
}
