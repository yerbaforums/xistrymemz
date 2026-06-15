import { z } from 'zod'

export const projectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional(),
  imageUrl: z.string().optional().nullable(),
  status: z.string().optional(),
  published: z.boolean().optional(),
  category: z.string().optional(),
  goals: z.string().optional(),
  mileposts: z.string().optional(),
  lookingForCollaborators: z.boolean().optional(),
  location: z.string().optional(),
  locationDetails: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  images: z.string().optional().nullable(),
  videoUrl: z.string().optional().nullable(),
  goalAmount: z.number().optional().nullable(),
  needsVolunteers: z.boolean().optional(),
  volunteerRoles: z.string().optional().nullable(),
  volunteerDescription: z.string().optional().nullable(),
  acceptsDonations: z.boolean().optional(),
  donationAddress: z.string().max(500).optional().nullable(),
  donationCurrency: z.string().max(10).optional(),
  donationDescription: z.string().max(1000).optional().nullable(),
  donationAddresses: z.string().optional().nullable(),
  phases: z.string().optional().nullable(),
  postUpdate: z.string().optional().nullable(),
  shareToFeed: z.boolean().optional(),
  hashtags: z.array(z.string()).optional()
})

export const requestSchema = z.object({
  projectId: z.string().optional(),
  productId: z.string().optional(),
  groupId: z.string().optional(),
  schoolContentId: z.string().optional(),
  eventId: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional(),
  imageUrl: z.string().optional().nullable(),
  category: z.string().optional(),
  priority: z.string().optional(),
  budget: z.number().optional().nullable(),
  goalAmount: z.number().optional().nullable(),
  currentFunding: z.number().optional().nullable(),
  location: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  deadline: z.string().optional().nullable(),
  payoutAddress: z.string().optional().nullable(),
  payoutCurrency: z.string().optional().nullable(),
  allowFulfillments: z.boolean().optional(),
  showDonationAddress: z.boolean().optional(),
  acceptsDonations: z.boolean().optional(),
  donationAddress: z.string().optional().nullable(),
  donationCurrency: z.string().optional(),
  donationAddresses: z.string().optional().nullable(),
  selectedDonationAddrs: z.array(z.object({
    id: z.string(),
    currency: z.string(),
    address: z.string(),
    label: z.string().nullable().optional(),
    qrCodeUrl: z.string().nullable().optional(),
    showQR: z.boolean().optional(),
    sortOrder: z.number().optional(),
  })).optional(),
  isPublic: z.boolean().optional(),
  createGroup: z.boolean().optional(),
  hashtags: z.array(z.string()).optional()
})

export const productSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional().nullable(),
  price: z.coerce.number().min(0).optional().nullable(),
  type: z.enum(['PRODUCT', 'RENTAL']).optional().nullable(),
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
  acceptsDonations: z.boolean().optional(),
  donationAddress: z.string().optional().nullable(),
  donationCurrency: z.string().optional(),
  donationAddresses: z.string().optional().nullable(),
  sellerPayoutAddress: z.string().optional().nullable(),
  sellerCryptoCurrency: z.string().optional().nullable(),
  createGroup: z.boolean().optional(),
  hashtags: z.array(z.string()).optional(),
  acceptsAppointments: z.boolean().optional(),
  appointmentDuration: z.coerce.number().int().min(5).optional().nullable(),
  appointmentLeadTime: z.coerce.number().int().min(0).optional().nullable(),
  appointmentLocation: z.string().optional().nullable(),
  appointmentMeetingLink: z.string().optional().nullable(),
  appointmentFormFields: z.array(z.object({
    label: z.string().min(1),
    type: z.enum(['text', 'textarea']),
    required: z.boolean()
  })).optional().nullable()
})

export const SERVICE_CATEGORIES_ENUM = [
  'PERFORMANCE', 'RECORDING', 'PHOTOGRAPHY', 'DESIGN',
  'CONSULTATION', 'LESSON_TUTORING', 'HEALTH_WELLNESS', 'EVENT_SERVICES',
  'LAWN_GARDEN', 'CLEANING', 'MAINTENANCE_REPAIR', 'CONSTRUCTION',
  'MOVING_HAULING', 'PET_CARE', 'CHILDCARE', 'TECH_SUPPORT',
  'TRANSPORTATION', 'OTHER',
] as const

export const serviceOfferingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional().nullable(),
  category: z.enum(SERVICE_CATEGORIES_ENUM),
  duration: z.coerce.number().int().min(5, 'Duration must be at least 5 minutes'),
  price: z.coerce.number().min(0).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  meetingLink: z.string().url().optional().nullable().or(z.literal('')),
  imageUrl: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  acceptsDonations: z.boolean().optional(),
  donationAddress: z.string().optional().nullable(),
  donationCurrency: z.string().optional(),
  donationAddresses: z.string().optional().nullable(),
  selectedDonationAddrs: z.array(z.object({
    id: z.string(),
    currency: z.string(),
    address: z.string(),
    label: z.string().nullable().optional(),
    qrCodeUrl: z.string().nullable().optional(),
    showQR: z.boolean().optional(),
    sortOrder: z.number().optional(),
  })).optional(),
  acceptsAppointments: z.boolean().optional(),
  appointmentDuration: z.coerce.number().int().min(5).optional().nullable(),
  appointmentLeadTime: z.coerce.number().int().min(0).optional().nullable(),
  appointmentLocation: z.string().max(200).optional().nullable(),
  appointmentMeetingLink: z.string().url().optional().nullable().or(z.literal('')),
  appointmentFormFields: z.array(z.object({
    label: z.string().min(1),
    type: z.enum(['text', 'textarea']),
    required: z.boolean()
  })).optional().nullable(),
})

export const groupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().optional().nullable(),
  privacy: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  isLocationBased: z.boolean().optional(),
  acceptsDonations: z.boolean().optional(),
  donationAddress: z.string().optional().nullable(),
  donationCurrency: z.string().optional(),
  donationAddresses: z.string().optional().nullable(),
  selectedDonationAddrs: z.array(z.object({
    id: z.string(),
    currency: z.string(),
    address: z.string(),
    label: z.string().nullable().optional(),
    qrCodeUrl: z.string().nullable().optional(),
    showQR: z.boolean().optional(),
    sortOrder: z.number().optional(),
  })).optional(),
  hashtags: z.array(z.string()).optional()
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
  imageUrl: z.string().optional().nullable(),
  eventCategory: z.string().optional(),
  eventDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  locationDetails: z.string().optional(),
  maxJoiners: z.coerce.number().int().min(0).optional(),
  isPrivate: z.boolean().optional(),
  isTicketed: z.boolean().optional(),
  ticketPrice: z.coerce.number().min(0).optional(),
  currency: z.string().optional(),
  visibility: z.string().optional(),
  eventType: z.string().optional(),
  acceptsDonations: z.boolean().optional(),
  donationAddress: z.string().optional().nullable(),
  donationCurrency: z.string().optional(),
  donationAddresses: z.string().optional().nullable(),
  needsVolunteers: z.boolean().optional(),
  volunteerRoles: z.string().optional(),
  volunteerDescription: z.string().optional(),
  isVirtual: z.boolean().optional(),
  meetingLink: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  groupId: z.string().optional().nullable(),
  schoolId: z.string().optional().nullable(),
  shopId: z.string().optional().nullable(),
  createGroup: z.boolean().optional(),
  hashtags: z.array(z.string()).optional()
})

export const boardSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(1000).optional().nullable(),
  location: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  isPublic: z.boolean().optional(),
})

export const pinSchema = z.object({
  boardId: z.string().min(1, 'Board ID is required'),
  title: z.string().max(200).optional().nullable(),
  content: z.string().max(5000).optional().nullable(),
  images: z.string().optional().nullable(),
  entityType: z.string().optional().nullable(),
  entityId: z.string().optional().nullable(),
  entityTitle: z.string().optional().nullable(),
  entityImage: z.string().optional().nullable(),
  contactName: z.string().max(100).optional().nullable(),
  contactEmail: z.string().email().optional().nullable().or(z.literal('')),
  contactPhone: z.string().max(20).optional().nullable(),
  category: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
})

export const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email').max(200),
  message: z.string().min(1, 'Message is required').max(5000)
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
  content: z.string().max(2000).default(''),
  imageUrl: z.string().max(500).optional().nullable(),
  images: z.array(z.string()).optional().nullable(),
  targetUserId: z.string().min(1).optional().nullable(),
  context: z.enum(['PROFILE', 'SHOP', 'SCHOOL', 'WALL', 'REPOST']).optional(),
  parentId: z.string().min(1).optional().nullable(),
  referenceType: z.enum(['PRODUCT', 'SERVICE', 'EVENT', 'REQUEST', 'PLAN', 'POST']).optional().nullable(),
  referenceId: z.string().min(1).optional().nullable(),
  referenceTitle: z.string().max(500).optional().nullable()
})

export const profileUpdateSchema = z.object({
  name: z.string().max(100).optional().nullable(),
  username: z.string().max(50).optional().nullable(),
  image: z.string().max(500).optional().nullable(),
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
  acceptsDonations: z.boolean().optional(),
  lookingForCollaborators: z.boolean().optional(),
  coverImage: z.string().max(500).optional().nullable(),
  coverStyle: z.string().max(20).optional().nullable(),
  showShop: z.boolean().optional(),
  showSchool: z.boolean().optional(),
  enableTips: z.boolean().optional(),
  enableReplies: z.boolean().optional(),
  enableLikes: z.boolean().optional(),
  showViewCount: z.boolean().optional()
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