export const PLATFORM_FEE_PERCENT = 10

export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * (PLATFORM_FEE_PERCENT / 100) * 100) / 100
}

export function calculateNetAmount(amount: number): number {
  return Math.round((amount - calculatePlatformFee(amount)) * 100) / 100
}

export function calculatePlatformFeeFromNet(netAmount: number): number {
  const gross = Math.round(netAmount / (1 - PLATFORM_FEE_PERCENT / 100) * 100) / 100
  return Math.round((gross - netAmount) * 100) / 100
}
