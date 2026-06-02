import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiSuccess, apiError, withValidation } from '@/lib/api-helpers'
import { planSchema } from '@/lib/schemas'
import { extractAndLinkHashtags, linkHashtags } from '@/services/hashtagService'
import { getPublicPlans, getPlansByUser, createPlan } from '@/services/planService'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  const { searchParams } = new URL(request.url)
  const isPublic = searchParams.get('public') === 'true'

  if (isPublic) {
    const plans = await getPublicPlans(4)
    return apiSuccess(plans)
  }

  if (!session?.user?.id) {
    return apiError('Unauthorized', 401)
  }

  const plans = await getPlansByUser(session.user.id)
  return apiSuccess(plans)
}

export const POST = withValidation(planSchema, async (req, session, data) => {
  const { title, description, imageUrl, goals, mileposts, lookingForCollaborators, acceptsDonations, donationAddress, donationCurrency, donationDescription, donationAddresses, hashtags } = data

  const plan = await createPlan({
    title,
    description,
    imageUrl,
    goals,
    mileposts,
    userId: session.user.id,
  })

  await prisma.plan.update({
    where: { id: plan.id },
    data: {
      lookingForCollaborators: lookingForCollaborators ?? false,
      acceptsDonations: acceptsDonations ?? false,
      donationAddress: donationAddress || null,
      donationCurrency: donationCurrency || 'ETH',
      donationDescription: donationDescription || null,
      donationAddresses: donationAddresses || null,
    },
  })

  if (Array.isArray(hashtags) && hashtags.length > 0) {
    await linkHashtags('PLAN', plan.id, hashtags)
  } else {
    const text = [title, description || ''].join(' ')
    await extractAndLinkHashtags(text, 'PLAN', plan.id)
  }

  return apiSuccess(plan, 201)
})
