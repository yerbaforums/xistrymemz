export const PLATFORM_FEE_PERCENT = 0
export const DIRECT_FEE_PERCENT = 0

export function calculatePlatformFee(amount: number, feeType: 'escrow' | 'direct' = 'escrow'): number {
  const percent = feeType === 'direct' ? DIRECT_FEE_PERCENT : PLATFORM_FEE_PERCENT
  return Math.round(amount * (percent / 100) * 100) / 100
}

export function calculateNetAmount(amount: number, feeType: 'escrow' | 'direct' = 'escrow'): number {
  return Math.round((amount - calculatePlatformFee(amount, feeType)) * 100) / 100
}

export function calculatePlatformFeeFromNet(netAmount: number, feeType: 'escrow' | 'direct' = 'escrow'): number {
  const percent = feeType === 'direct' ? DIRECT_FEE_PERCENT : PLATFORM_FEE_PERCENT
  const gross = Math.round(netAmount / (1 - percent / 100) * 100) / 100
  return Math.round((gross - netAmount) * 100) / 100
}
