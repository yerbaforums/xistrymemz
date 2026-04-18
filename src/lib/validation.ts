import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  inviteCode: z.string().min(1, 'Invite code required')
})

export const escrowSchema = z.object({
  sellerId: z.string().min(1, 'Seller ID required'),
  amount: z.number().positive('Amount must be positive').max(1000000, 'Amount exceeds maximum'),
  currency: z.string().optional(),
  productId: z.string().optional(),
  description: z.string().max(500).optional(),
  courierId: z.string().optional(),
  courierFee: z.number().optional(),
  courierService: z.string().optional(),
  deliveryAddress: z.string().max(500).optional(),
  cryptoCurrency: z.string().optional(),
  paymentType: z.enum(['DIRECT', 'ESCROW']).optional()
})

export const paymentAddressSchema = z.string().refine(
  (addr) => /^0x[a-fA-F0-9]{40}$/.test(addr) || /^#[a-zA-Z0-9]+$/.test(addr),
  'Invalid payment address format'
)

export const cryptoAmountSchema = z.object({
  amount: z.number().positive().max(1e15),
  txHash: z.string().min(32, 'Invalid transaction hash')
})

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const errorMessage = result.error.issues.map(i => i.message).join(', ')
  return { success: false, error: errorMessage }
}