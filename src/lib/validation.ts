import { z } from 'zod'

// Shared password policy — single source of truth for every password-setting
// flow (register, reset, change). Keep in sync with the client-side rules
// checklist on the register page.
export const PASSWORD_MIN_LENGTH = 8
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[0-9]/, 'Password must include a number')

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional().nullable(),
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  username: z.string().min(2, 'Username must be at least 2 characters').optional().nullable(),
  inviteCode: z.string().optional().nullable()
})

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const errorMessage = result.error.issues.map(i => i.message).join(', ')
  return { success: false, error: errorMessage }
}

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema
})

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required')
})

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address')
})

export const userLinkSchema = z.object({
  type: z.string().min(1, 'Link type is required'),
  url: z.string().url('Invalid URL').refine(
    (url) => !url || (!url.startsWith('javascript:') && !url.startsWith('data:')),
    'Invalid URL protocol'
  ),
  label: z.string().max(100).optional().nullable(),
  icon: z.preprocess(
    v => v === '' ? null : v,
    z.string().url().optional().nullable()
  ),
  sortOrder: z.number().int().optional()
})