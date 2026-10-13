'use client'

import type { SelectHTMLAttributes } from 'react'
import { SUPPORTED_CRYPTOS } from '@/lib/constants'
import { getCryptoName } from '@/lib/crypto-icons'

interface GoalCurrencySelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  value: string
  onChange: (currency: string) => void
}

/**
 * Currency picker for funding goals — FUSD default everywhere. Keeps goals
 * labeled in the rail they are actually recorded in, instead of a "$" label
 * hiding a silent XMR default.
 */
export default function GoalCurrencySelect({ value, onChange, ...props }: GoalCurrencySelectProps) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label="Funding goal currency"
      {...props}
    >
      {SUPPORTED_CRYPTOS.map(c => (
        <option key={c} value={c}>{getCryptoName(c)} ({c})</option>
      ))}
    </select>
  )
}
