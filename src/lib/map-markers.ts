'use client'

import { ENTITY_ICONS } from '@/lib/entity-icons'

export function getMapMarkerIcon(L: any, type: string, opts?: { size?: number; highlighted?: boolean }): any {
  if (!L) return undefined
  const key = type.toUpperCase()
  const info = ENTITY_ICONS[key] || { emoji: '📍', color: '#6b7280' }
  const s = opts?.size || 28
  const glow = opts?.highlighted ? `0 0 0 3px ${info.color}40,` : ''
  return L.divIcon({
    className: '',
    html: `<div style="width:${s}px;height:${s}px;border-radius:50%;background:${info.color};display:flex;align-items:center;justify-content:center;font-size:${s * 0.48}px;border:2px solid white;box-shadow:${glow}0 1px 4px rgba(0,0,0,0.3);">${info.emoji}</div>`,
    iconSize: [s + 4, s + 4],
    iconAnchor: [(s + 4) / 2, (s + 4) / 2],
    popupAnchor: [0, -(s + 4) / 2],
  })
}

export function getBoardMarkerIcon(L: any, isOwner?: boolean, highlighted?: boolean): any {
  if (!L) return undefined
  const plankColor = isOwner ? '#6b8e23' : '#8B6914'
  const pinColor = isOwner ? '#00d9ff' : '#ef4444'
  const glow = highlighted ? '0 0 0 3px rgba(0,217,255,0.4),' : ''
  return L.divIcon({
    className: '',
    html: `<div style="width:32px;height:26px;display:flex;align-items:center;justify-content:center;font-size:20px;background:${plankColor};border:2px solid ${isOwner ? '#4a6d13' : '#4a2e00'};border-radius:3px;box-shadow:${glow}0 1px 4px rgba(0,0,0,0.3);">🪵</div>`,
    iconSize: [36, 30],
    iconAnchor: [18, 28],
    popupAnchor: [0, -28],
  })
}
