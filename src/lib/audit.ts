import { NextRequest, NextResponse } from 'next/server'

export type AuditAction = 
  | 'USER_LOGIN'
  | 'USER_REGISTER'
  | 'USER_LOGOUT'
  | 'PLAN_CREATE'
  | 'PLAN_UPDATE'
  | 'PLAN_DELETE'
  | 'REQUEST_CREATE'
  | 'REQUEST_UPDATE'
  | 'REQUEST_APPROVE'
  | 'REQUEST_REJECT'
  | 'REQUEST_COMPLETE'
  | 'PRODUCT_CREATE'
  | 'PRODUCT_UPDATE'
  | 'PRODUCT_DELETE'
  | 'ORDER_CREATE'
  | 'ORDER_UPDATE'
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_COMPLETED'
  | 'ESCROW_CREATED'
  | 'ESCROW_RELEASED'
  | 'WALLET_DEPOSIT'
  | 'WALLET_WITHDRAW'
  | 'GROUP_CREATE'
  | 'GROUP_JOIN'
  | 'FORUM_POST_CREATE'
  | 'FORUM_REPLY_CREATE'
  | 'RATING_SUBMITTED'
  | 'CONTACT_MESSAGE'
  | 'ADMIN_ACTION'

export interface AuditLogEntry {
  timestamp: string
  action: AuditAction
  userId?: string
  userEmail?: string
  ip?: string
  userAgent?: string
  targetId?: string
  targetType?: string
  metadata?: Record<string, unknown>
  success: boolean
  error?: string
}

function getClientInfo(request: NextRequest): { ip: string; userAgent: string } {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip') 
    || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  return { ip, userAgent }
}

export function logAudit(entry: Omit<AuditLogEntry, 'timestamp'>): void {
  const logEntry: AuditLogEntry = {
    ...entry,
    timestamp: new Date().toISOString()
  }
  
  const level = entry.success ? 'INFO' : 'WARN'
  console.log(`[AUDIT:${level}]`, JSON.stringify(logEntry))
}

export function auditMiddleware(
  action: AuditAction,
  handler: (req: NextRequest, info: { ip: string; userAgent: string }) => Promise<NextResponse>
) {
  return async function(req: NextRequest): Promise<NextResponse> {
    const { ip, userAgent } = getClientInfo(req)
    
    try {
      const response = await handler(req, { ip, userAgent })
      
      logAudit({
        action,
        success: response.ok,
        ip,
        userAgent
      })
      
      return response
    } catch (error) {
      logAudit({
        action,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        ip,
        userAgent
      })
      
      throw error
    }
  }
}