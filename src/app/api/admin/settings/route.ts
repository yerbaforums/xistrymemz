import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getOrCreateSettings() {
  const settings = await prisma.platformSettings.findFirst()
  if (settings) return settings

  return prisma.platformSettings.create({
    data: {
      platformFeePercent: 10,
      enableCheckout: true,
      enableWallet: true
    }
  })
}

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const settings = await getOrCreateSettings()
    let donationAddresses = []
    try {
      if (settings.donationAddresses) {
        donationAddresses = JSON.parse(settings.donationAddresses)
      }
    } catch {
      donationAddresses = []
    }
    return NextResponse.json({
      enableCheckout: settings.enableCheckout,
      enableWallet: settings.enableWallet,
      platformFeePercent: settings.platformFeePercent,
      donationAddresses,
      enableAutoBackup: settings.enableAutoBackup,
      backupIntervalHours: settings.backupIntervalHours,
      backupRetentionCount: settings.backupRetentionCount,
      lastBackupAt: settings.lastBackupAt?.toISOString() || null,
      ipfsGatewayUrl: settings.ipfsGatewayUrl
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { enableCheckout, enableWallet, platformFeePercent, donationAddresses, enableAutoBackup, backupIntervalHours, backupRetentionCount, ipfsGatewayUrl } = body

    const settings = await getOrCreateSettings()

    const updated = await prisma.platformSettings.update({
      where: { id: settings.id },
      data: {
        enableCheckout: enableCheckout !== undefined ? enableCheckout : settings.enableCheckout,
        enableWallet: enableWallet !== undefined ? enableWallet : settings.enableWallet,
        platformFeePercent: platformFeePercent !== undefined ? platformFeePercent : settings.platformFeePercent,
        donationAddresses: donationAddresses !== undefined ? JSON.stringify(donationAddresses) : settings.donationAddresses,
        enableAutoBackup: enableAutoBackup !== undefined ? enableAutoBackup : settings.enableAutoBackup,
        backupIntervalHours: backupIntervalHours !== undefined ? backupIntervalHours : settings.backupIntervalHours,
        backupRetentionCount: backupRetentionCount !== undefined ? backupRetentionCount : settings.backupRetentionCount,
        ipfsGatewayUrl: ipfsGatewayUrl !== undefined ? ipfsGatewayUrl : settings.ipfsGatewayUrl
      }
    })

    let parsedAddresses = []
    try {
      if (updated.donationAddresses) {
        parsedAddresses = JSON.parse(updated.donationAddresses)
      }
    } catch {
      parsedAddresses = []
    }

    return NextResponse.json({
      enableCheckout: updated.enableCheckout,
      enableWallet: updated.enableWallet,
      platformFeePercent: updated.platformFeePercent,
      donationAddresses: parsedAddresses,
      enableAutoBackup: updated.enableAutoBackup,
      backupIntervalHours: updated.backupIntervalHours,
      backupRetentionCount: updated.backupRetentionCount,
      lastBackupAt: updated.lastBackupAt?.toISOString() || null,
      ipfsGatewayUrl: updated.ipfsGatewayUrl
    })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}