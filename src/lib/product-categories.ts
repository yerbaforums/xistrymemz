export interface ProductCategory {
  value: string
  label: string
  icon: string
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  { value: 'ART', label: 'Art', icon: '🎨' },
  { value: 'ELECTRONICS', label: 'Electronics', icon: '💻' },
  { value: 'CLOTHING', label: 'Clothing', icon: '👔' },
  { value: 'HOME', label: 'Home', icon: '🏠' },
  { value: 'SPORTS', label: 'Sports', icon: '🏃' },
  { value: 'OTHER', label: 'Other', icon: '📦' },
]

export const PRODUCT_CATEGORY_MAP = new Map(PRODUCT_CATEGORIES.map(c => [c.value, c]))

export const PRODUCT_CONDITIONS = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR'] as const

export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number]

export const PRODUCT_TYPES = ['PRODUCT', 'RENTAL'] as const

export type ProductType = (typeof PRODUCT_TYPES)[number]
