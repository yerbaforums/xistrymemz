'use client'

import { useState } from 'react'
import ProductCard from './ProductCard'
import ProductQuickViewModal from './ProductQuickViewModal'
import Skeleton from './Skeleton'
import { EmptyState } from '@/components/EmptyState'
import type { Product } from '@/types/product'
import styles from './ProductGrid.module.css'

interface ProductGridProps {
  products: Product[]
  loading: boolean
  viewMode: 'grid' | 'list'
  page: number
  pageSize: number
  onViewModeChange: (mode: 'grid' | 'list') => void
  onFund?: (product: Product) => void
  onClearFilters?: () => void
  showOwnerActions?: boolean
  onEdit?: (product: Product) => void
  onTogglePublish?: (product: Product) => void
  onDelete?: (product: Product) => void
  onPin?: (product: Product) => void
}

export default function ProductGrid({
  products,
  loading,
  viewMode,
  page,
  pageSize,
  onViewModeChange,
  onFund,
  onClearFilters,
  showOwnerActions,
  onEdit,
  onTogglePublish,
  onDelete,
  onPin,
}: ProductGridProps) {
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null)

  const paginated = products.slice(0, page * pageSize)
  const hasMore = paginated.length < products.length
  const totalPages = Math.ceil(products.length / pageSize)

  if (loading) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={styles.skeleton}>
            <Skeleton height={140} borderRadius="0" />
            <div className={styles.skelBody}>
              <Skeleton width="40%" height="0.75rem" />
              <Skeleton width="80%" height="0.9rem" className={styles.skelGap} />
              <Skeleton width="60%" height="0.7rem" className={styles.skelGap} />
            </div>
            <div className={styles.skelFooter}>
              <Skeleton width="30%" height="1rem" />
              <Skeleton width="80px" height="28px" borderRadius="4px" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return <EmptyState icon="🛒" title="No products found" description="Try adjusting your filters or search criteria." action={onClearFilters ? { label: 'Clear Filters', onClick: onClearFilters } : undefined} />
  }

  return (
    <>
      <div className={viewMode === 'grid' ? styles.grid : styles.list}>
        {paginated.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            viewMode={viewMode}
            onQuickView={setQuickViewProduct}
            onFund={onFund}
            showOwnerActions={showOwnerActions}
            onEdit={onEdit}
            onTogglePublish={onTogglePublish}
            onDelete={onDelete}
            onPin={onPin}
          />
        ))}
      </div>

      {hasMore && (
        <div className={styles.loadMoreWrap}>
          <span className={styles.count}>
            Showing {paginated.length} of {products.length}
          </span>
          <div className={styles.loadMoreRow}>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
              <button
                key={i}
                className={`${styles.pageBtn} ${page === i + 1 ? styles.active : ''}`}
                onClick={() => onViewModeChange(viewMode)}
              >
                {i + 1}
              </button>
            ))}
            {totalPages > 5 && <span className={styles.ellipsis}>...</span>}
          </div>
        </div>
      )}

      <ProductQuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onFund={onFund}
      />
    </>
  )
}
