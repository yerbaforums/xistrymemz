import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
export type { NextRequest }
export { NextResponse }
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Session } from 'next-auth'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  errors?: Record<string, string[]>
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function apiError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status })
}

export function apiErrors(errors: Record<string, string[]>, status = 400) {
  return NextResponse.json({ success: false, error: 'Validation failed', errors }, { status })
}

export function apiUnauthorized(msg = 'Unauthorized') {
  return apiError(msg, 401)
}

export function apiNotFound(msg = 'Not found') {
  return apiError(msg, 404)
}

export function apiServerError(error: unknown) {
  console.error('API Error:', error)
  return apiError('Internal server error', 500)
}

export async function getAuthSession(): Promise<Session | null> {
  return getServerSession(authOptions)
}

export async function requireAuth(): Promise<{ session: Session; userId: string }> {
  const session = await getAuthSession()
  if (!session?.user?.id) throw new AuthError()
  return { session, userId: session.user.id }
}

export async function requireAdmin(): Promise<{ session: Session; userId: string }> {
  const { session, userId } = await requireAuth()
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (user?.role !== 'ADMIN') throw new AuthError('Admin access required')
  return { session, userId }
}

export class AuthError extends Error {
  status = 401
  constructor(msg = 'Unauthorized') { super(msg) }
}

export class NotFoundError extends Error {
  status = 404
  constructor(msg = 'Not found') { super(msg) }
}

export class ValidationError extends Error {
  status = 400
  errors: Record<string, string[]>
  constructor(errors: Record<string, string[]>) {
    super('Validation failed')
    this.errors = errors
  }
}

export function withAuth<T>(
  handler: (req: Request, session: Session, context: { params: Record<string, string>; searchParams: Record<string, string> }) => Promise<NextResponse<T>>
) {
  return async (req: Request, context: { params: Promise<Record<string, string>> } | Record<string, string>) => {
    try {
      const session = await getAuthSession()
      if (!session?.user?.id) return apiUnauthorized()
      const params = context && 'then' in context ? await context : (context || {})
      const url = new URL(req.url)
      const searchParams = Object.fromEntries(url.searchParams)
      return handler(req, session, { params: params as Record<string, string>, searchParams })
    } catch (err) {
      return apiServerError(err)
    }
  }
}

export function withValidation<T>(
  schema: { parse: (data: unknown) => T },
  handler: (data: T, req: Request, session: Session) => Promise<NextResponse<unknown>>
) {
  return async (req: Request, context?: unknown) => {
    try {
      const session = await getAuthSession()
      if (!session?.user?.id) return apiUnauthorized()
      const body = await req.json()
      const parsed = schema.parse(body)
      return handler(parsed, req, session)
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'issues' in err) {
        const issues = (err as { issues: { path: (string | number)[]; message: string }[] }).issues
        const errors: Record<string, string[]> = {}
        for (const issue of issues) {
          const key = issue.path.join('.')
          if (!errors[key]) errors[key] = []
          errors[key].push(issue.message)
        }
        return apiErrors(errors)
      }
      return apiServerError(err)
    }
  }
}

export async function handleApi<T>(fn: () => Promise<T>) {
  try {
    const result = await fn()
    if (result === undefined || result === null) return apiNotFound()
    return apiSuccess(result)
  } catch (err) {
    if (err instanceof AuthError) return apiUnauthorized(err.message)
    if (err instanceof NotFoundError) return apiNotFound(err.message)
    if (err instanceof ValidationError) return apiErrors(err.errors)
    return apiServerError(err)
  }
}

export async function apiGet<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { method: 'GET', ...options })
  const body: ApiResponse<T> = await res.json()
  if (!body.success) throw new Error(body.error || 'Request failed')
  return body.data as T
}

export async function apiPost<T>(url: string, data?: unknown): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined })
  const body: ApiResponse<T> = await res.json()
  if (!body.success) throw new Error(body.error || 'Request failed')
  return body.data as T
}

export async function apiPut<T>(url: string, data?: unknown): Promise<T> {
  const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined })
  const body: ApiResponse<T> = await res.json()
  if (!body.success) throw new Error(body.error || 'Request failed')
  return body.data as T
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: 'DELETE' })
  const body: ApiResponse<T> = await res.json()
  if (!body.success) throw new Error(body.error || 'Request failed')
  return body.data as T
}
