export interface ShopCategory {
  value: string
  label: string
  icon: string
}

export const SHOP_CATEGORIES: ShopCategory[] = [
  { value: 'TECHNOLOGY', label: 'Technology & Electronics', icon: '💻' },
  { value: 'ARTS_CRAFTS', label: 'Arts & Crafts', icon: '🎨' },
  { value: 'AUTOMOTIVE', label: 'Automotive', icon: '🔧' },
  { value: 'BABY_KIDS', label: 'Baby & Kids', icon: '👶' },
  { value: 'BOOKS_MEDIA', label: 'Books & Media', icon: '📚' },
  { value: 'CLOTHING_FASHION', label: 'Clothing & Fashion', icon: '👔' },
  { value: 'COMPUTERS_SOFTWARE', label: 'Computers & Software', icon: '🖥️' },
  { value: 'CONSTRUCTION', label: 'Construction & Contracting', icon: '🏗️' },
  { value: 'EDUCATION_TUTORING', label: 'Education & Tutoring', icon: '🎓' },
  { value: 'FOOD_DINING', label: 'Food & Dining', icon: '🍽️' },
  { value: 'GARDEN_OUTDOOR', label: 'Garden & Outdoor', icon: '🪴' },
  { value: 'HEALTH_BEAUTY', label: 'Health & Beauty', icon: '💇' },
  { value: 'HOME_DECOR', label: 'Home & Decor', icon: '🏠' },
  { value: 'JEWELRY_ACCESSORIES', label: 'Jewelry & Accessories', icon: '💍' },
  { value: 'LEGAL_PROFESSIONAL', label: 'Legal & Professional', icon: '⚖️' },
  { value: 'MUSIC_ENTERTAINMENT', label: 'Music & Entertainment', icon: '🎵' },
  { value: 'PETS_ANIMALS', label: 'Pets & Animals', icon: '🐾' },
  { value: 'PHOTOGRAPHY_VIDEO', label: 'Photography & Video', icon: '📸' },
  { value: 'REPAIR_MAINTENANCE', label: 'Repair & Maintenance', icon: '🔨' },
  { value: 'SPORTS_FITNESS', label: 'Sports & Fitness', icon: '🏃' },
  { value: 'TRANSPORTATION_LOGISTICS', label: 'Transportation & Logistics', icon: '🚚' },
  { value: 'TRAVEL_ACCOMMODATION', label: 'Travel & Accommodation', icon: '✈️' },
  { value: 'VINTAGE_SECONDHAND', label: 'Vintage & Secondhand', icon: '♻️' },
  { value: 'WELLNESS_SPIRITUAL', label: 'Wellness & Spiritual', icon: '🔮' },
  { value: 'OTHER', label: 'Other', icon: '📦' },
]

export const SHOP_CATEGORY_MAP = new Map(SHOP_CATEGORIES.map(c => [c.value, c]))

export const GROUP_CATEGORIES: { value: string; label: string; icon: string }[] = [
  { value: 'GENERAL', label: 'General', icon: '👥' },
  { value: 'TECHNOLOGY', label: 'Technology', icon: '💻' },
  { value: 'ARTS', label: 'Arts & Creativity', icon: '🎨' },
  { value: 'MUSIC', label: 'Music & Audio', icon: '🎵' },
  { value: 'SPORTS', label: 'Sports & Recreation', icon: '🏃' },
  { value: 'EDUCATION', label: 'Education & Learning', icon: '🎓' },
  { value: 'SOCIAL', label: 'Social & Community', icon: '🤝' },
  { value: 'BUSINESS', label: 'Business & Entrepreneurship', icon: '💼' },
  { value: 'HEALTH', label: 'Health & Wellness', icon: '💚' },
  { value: 'TRAVEL', label: 'Travel & Adventure', icon: '✈️' },
  { value: 'GAMING', label: 'Gaming', icon: '🎮' },
  { value: 'NATURE', label: 'Nature & Environment', icon: '🌿' },
  { value: 'POLITICS', label: 'Politics & Advocacy', icon: '🗳️' },
  { value: 'SCIENCE', label: 'Science & Research', icon: '🔬' },
  { value: 'SPIRITUALITY', label: 'Spirituality & Philosophy', icon: '🕯️' },
  { value: 'LOCAL', label: 'Local & Neighborhood', icon: '📍' },
]
