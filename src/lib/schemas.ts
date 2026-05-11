import { z } from 'zod'

export const planSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional(),
  goals: z.string().optional(),
  mileposts: z.string().optional()
})

export const requestSchema = z.object({
  planId: z.string().optional(),
  productId: z.string().optional(),
  groupId: z.string().optional(),
  schoolContentId: z.string().optional(),
  eventId: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional(),
  category: z.string().optional(),
  priority: z.string().optional(),
  budget: z.number().optional().nullable(),
  goalAmount: z.number().optional().nullable(),
  currentFunding: z.number().optional().nullable(),
  location: z.string().optional(),
  isPublic: z.boolean().optional(),
  createGroup: z.boolean().optional()
})

export const productSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional().nullable(),
  price: z.coerce.number().min(0).optional().nullable(),
  type: z.enum(['PRODUCT', 'SERVICE', 'RENTAL']).optional().nullable(),
  category: z.string().optional().nullable(),
  condition: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  locationDetails: z.string().optional().nullable(),
  isGlobal: z.boolean().optional(),
  isRemote: z.boolean().optional(),
  imageUrl: z.string().optional().nullable(),
  paymentMethods: z.string().optional().nullable(),
  paymentType: z.enum(['BOTH', 'ESCROW', 'DIRECT']).optional().nullable(),
  acceptsRequests: z.boolean().optional(),
  acceptsOffers: z.boolean().optional(),
  requestPrice: z.coerce.number().min(0).optional().nullable(),
  published: z.boolean().optional(),
  rentalDaily: z.coerce.number().min(0).optional().nullable(),
  rentalWeekly: z.coerce.number().min(0).optional().nullable(),
  rentalMonthly: z.coerce.number().min(0).optional().nullable(),
  rentalDeposit: z.coerce.number().min(0).optional().nullable(),
  rentalMinDays: z.coerce.number().int().min(1).optional(),
  rentalMaxDays: z.coerce.number().int().min(1).optional().nullable(),
  rentalAvailable: z.boolean().optional(),
  createGroup: z.boolean().optional()
})

export const groupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(1000).optional(),
  privacy: z.enum(['PUBLIC', 'PRIVATE']).optional()
})

export const forumPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  content: z.string().min(1, 'Content is required').max(20000),
  categoryId: z.string().optional(),
  isPoll: z.boolean().optional(),
  pollType: z.enum(['single', 'multi']).optional(),
  pollEndsAt: z.string().optional(),
  pollOptions: z.array(z.string().min(1)).max(6).optional()
})

export const pollVoteSchema = z.object({
  postId: z.string().min(1, 'Post ID is required'),
  optionId: z.string().min(1, 'Option ID is required')
})

export const eventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  isOnline: z.boolean().optional()
})

export const updateSchema = z.object({
  content: z.string().min(1, 'Content is required').max(10000)
})

export const commentSchema = z.object({
  content: z.string().min(1, 'Content is required').max(2000)
})

export const roleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['ADMIN', 'MODERATOR', 'USER'])
})

export const settingsSchema = z.object({
  key: z.string().min(1, 'Key is required'),
  value: z.string()
})

export const schoolSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(5000).optional(),
  category: z.string().optional()
})

export const shopSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().min(1, 'Slug is required').max(100),
  description: z.string().max(2000).optional()
})

export const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email').max(200),
  message: z.string().min(1, 'Message is required').max(5000)
})

export const locationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
})

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body)
  if (!result.success) {
    const issues = result.error.issues.map(i => i.message).join(', ')
    return { success: false, error: issues }
  }
  return { success: true, data: result.data }
}

export const barterOfferCreateSchema = z.object({
  offerType: z.enum(['MAKE_OFFER', 'REQUEST_OFFER']),
  listingType: z.enum(['PRODUCT', 'REQUEST']),
  listingId: z.string().min(1, 'Listing ID is required'),
  listingTitle: z.string().min(1, 'Listing title is required').max(200),
  offeredItem: z.string().min(1, 'Offered item description is required').max(500),
  offeredValue: z.number().min(0).optional(),
  message: z.string().max(1000).optional()
})

export const barterOfferUpdateSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED', 'COUNTERED', 'WITHDRAWN', 'COMPLETED']).optional(),
  message: z.string().max(1000).optional()
})

export const counterOfferSchema = z.object({
  offeredItem: z.string().min(1, 'Offered item description is required').max(500),
  offeredValue: z.number().min(0).optional(),
  message: z.string().max(1000).optional()
})

export const postSchema = z.object({
  content: z.string().min(1, 'Content is required').max(2000),
  imageUrl: z.string().max(500).optional().nullable(),
  targetUserId: z.string().min(1).optional().nullable()
})

export const profileUpdateSchema = z.object({
  name: z.string().max(100).optional().nullable(),
  username: z.string().max(50).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  neighborhood: z.string().max(200).optional().nullable(),
  searchRadius: z.number().int().min(1).max(500).optional(),
  traveling: z.boolean().optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  website: z.string().max(500).optional().nullable(),
  userClass: z.string().max(100).optional().nullable(),
  walletAddress: z.string().max(200).optional().nullable(),
  paymentAddress: z.string().max(200).optional().nullable(),
  refundAddress: z.string().max(200).optional().nullable(),
  cryptoCurrency: z.string().max(10).optional(),
  donationAddress: z.string().max(500).optional().nullable(),
  donationCurrency: z.string().max(10).optional(),
  acceptsDonations: z.boolean().optional()
})

export const ratingSchema = z.object({
  userId: z.string().min(1, 'Valid user ID is required'),
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  comment: z.string().max(1000).optional().nullable(),
  type: z.enum(['SELLER', 'BUYER', 'GENERAL']).optional(),
  productId: z.string().min(1).optional().nullable(),
  transactionId: z.string().optional().nullable()
})

export const connectionSchema = z.object({
  receiverId: z.string().min(1, 'Valid user ID is required'),
  message: z.string().max(1000).optional()
})

export const replySchema = z.object({
  content: z.string().min(1, 'Content is required').max(10000),
  postId: z.string().min(1, 'Valid post ID is required')
})