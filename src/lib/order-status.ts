// Single source of truth for order + courier status display. The color maps
// were duplicated verbatim across the orders list and order detail pages;
// unknown values degrade gracefully via humanizeEnum.

import { humanizeEnum } from './utils'

const ORDER_STATUS_COLORS: Record<string, string> = {
  PAID: '#3b82f6',
  SHIPPED: '#f59e0b',
  DELIVERED: '#10b981',
  CANCELLED: '#6b7280',
}

const COURIER_STATUS_COLORS: Record<string, string> = {
  REQUESTED: '#f59e0b',
  BOOKED: '#3b82f6',
  IN_TRANSIT: '#8b5cf6',
  DELIVERED: '#10b981',
  DECLINED: '#ef4444',
}

export function getOrderStatusLabel(status: string | null | undefined): string {
  return humanizeEnum(status)
}

export function getOrderStatusColor(status: string | null | undefined): string {
  return (status && ORDER_STATUS_COLORS[status]) || '#6b7280'
}

export function getCourierStatusLabel(status: string | null | undefined): string {
  return humanizeEnum(status)
}

export function getCourierStatusColor(status: string | null | undefined): string {
  return (status && COURIER_STATUS_COLORS[status]) || '#6b7280'
}
