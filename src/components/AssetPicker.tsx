'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { fetchApi } from '@/lib/fetch-api'
import styles from './AssetPicker.module.css'

export interface UserAsset {
  id: string
  type: string
  title: string
  image: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
}

const ASSET_ICONS: Record<string, string> = {
  PRODUCT: '🛒',
  SERVICE: '🔧',
  EVENT: '📅',
  GROUP: '👥',
  PLAN: '🚀',
  REQUEST: '📝',
  SCHOOL_CONTENT: '📚',
  POST: '✏️',
  SHOP: '🏪',
  SCHOOL: '🏫',
  USER: '👤',
}

interface AssetPickerProps {
  filterTypes?: string[]
  selectedAsset: UserAsset | null
  onSelect: (asset: UserAsset | null) => void
  label?: string
}

export default function AssetPicker({ filterTypes, selectedAsset, onSelect, label }: AssetPickerProps) {
  const [assets, setAssets] = useState<UserAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    const fetchAssets = async () => {
      setLoading(true)
      try {
        const { assets: allAssets } = await fetchApi<{ assets: UserAsset[] }>('/api/user/assets')
        let all = allAssets || []
        if (filterTypes) {
          all = all.filter((a: UserAsset) => filterTypes.includes(a.type))
        }
        setAssets(all)
      } catch {}
      setLoading(false)
    }
    if (showPicker) fetchAssets()
  }, [showPicker, filterTypes])

  const handleSelect = (asset: UserAsset) => {
    onSelect(asset === selectedAsset ? null : asset)
  }

  const groupedAssets = assets.reduce<Record<string, UserAsset[]>>((acc, a) => {
    if (!acc[a.type]) acc[a.type] = []
    acc[a.type].push(a)
    return acc
  }, {})

  const typeLabel = (type: string) => {
    const map: Record<string, string> = {
      PLAN: 'Plans',
      GROUP: 'Groups',
      SHOP: 'Shops',
      SCHOOL: 'Schools',
      PRODUCT: 'Products',
      EVENT: 'Events',
      REQUEST: 'Requests',
      SERVICE: 'Services',
      SCHOOL_CONTENT: 'Content',
      POST: 'Posts',
    }
    return map[type] || type.charAt(0) + type.slice(1).toLowerCase() + 's'
  }

  return (
    <div className={styles.assetSection}>
      <div className={styles.assetSectionHeader}>
        <span className={styles.label}>{label || 'Link an item (optional)'}</span>
        <button
          type="button"
          className={styles.assetToggle}
          onClick={() => setShowPicker(!showPicker)}
        >
          {showPicker ? 'Hide' : `Choose (${assets.length})`}
        </button>
      </div>

      {selectedAsset && (
        <div className={styles.selectedAsset}>
          <span>{ASSET_ICONS[selectedAsset.type] || '📌'}</span>
          <span className={styles.selectedAssetTitle}>{selectedAsset.title}</span>
          <span className={styles.selectedAssetType}>{selectedAsset.type}</span>
          <button type="button" className={styles.clearAsset} onClick={() => { onSelect(null); setShowPicker(false) }}>✕</button>
        </div>
      )}

      {showPicker && (
        <div className={styles.assetPicker}>
          {loading ? (
            <p className={styles.assetsLoading}>Loading your items...</p>
          ) : assets.length === 0 ? (
            <p className={styles.assetsEmpty}>
              {filterTypes?.length ? `No ${filterTypes.join(', ').toLowerCase()} found.` : 'No items found. Create items first.'}
            </p>
          ) : (
            Object.entries(groupedAssets).map(([type, items]) => (
              <div key={type} className={styles.assetGroup}>
                <div className={styles.assetGroupTitle}>
                  {ASSET_ICONS[type] || '📌'} {typeLabel(type)} ({items.length})
                </div>
                <div className={styles.assetGrid}>
                  {items.map(asset => {
                    const isSelected = selectedAsset?.id === asset.id && selectedAsset?.type === asset.type
                    return (
                      <button
                        key={`${asset.type}-${asset.id}`}
                        type="button"
                        className={`${styles.assetCard} ${isSelected ? styles.assetCardSelected : ''}`}
                        onClick={() => handleSelect(asset)}
                      >
                        {asset.image ? (
                          <div className={styles.assetCardImage}>
                            <Image src={asset.image} alt={asset.title} width={48} height={48} style={{ objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <div className={styles.assetCardIcon}>{ASSET_ICONS[asset.type] || '📌'}</div>
                        )}
                        <div className={styles.assetCardInfo}>
                          <span className={styles.assetCardTitle}>{asset.title}</span>
                          {asset.location && <span className={styles.assetCardLoc}>{asset.location}</span>}
                        </div>
                        {isSelected && <span className={styles.assetCheck}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
