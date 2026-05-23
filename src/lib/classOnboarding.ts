export interface ClassSetupStep {
  id: string
  icon: string
  title: string
  description: string
  href: string
  feature: 'shop' | 'product' | 'service' | 'rental' | 'event' | 'school'
}

export interface ClassGuide {
  icon: string
  description: string
  subtitle: string
  steps: ClassSetupStep[]
}

export type UserClass = keyof typeof CLASS_SETUP_GUIDES

export const CLASS_SETUP_GUIDES: Record<string, ClassGuide> = {
  Artist: {
    icon: '🎨',
    description: 'Create, perform, and sell your art to the community.',
    subtitle: 'Sell art, offer commissions, host workshops',
    steps: [
      { id: 'artist-shop', icon: '🏪', title: 'Create Your Shop', description: 'Branded storefront for all your art and services', href: '/dashboard/shop', feature: 'shop' },
      { id: 'artist-products', icon: '🖼️', title: 'List Art Pieces', description: 'Sell paintings, prints, digital art, or crafts', href: '/products/new', feature: 'product' },
      { id: 'artist-services', icon: '🎨', title: 'Offer Commissions', description: 'Take custom requests as bookable services', href: '/dashboard/services', feature: 'service' },
      { id: 'artist-events', icon: '📅', title: 'Host a Workshop', description: 'Teach techniques or host an exhibition', href: '/events/new', feature: 'event' },
      { id: 'artist-rentals', icon: '🏠', title: 'Rent Studio Space', description: 'List your workspace for others to use', href: '/dashboard/rentals', feature: 'rental' },
    ],
  },
  Builder: {
    icon: '🔨',
    description: 'Build, craft, and repair — turn your skills into listings.',
    subtitle: 'Sell creations, offer repair, rent tools',
    steps: [
      { id: 'builder-products', icon: '🪚', title: 'Sell Your Creations', description: 'List furniture, crafts, or built items', href: '/products/new', feature: 'product' },
      { id: 'builder-services', icon: '🔧', title: 'Offer Repair Services', description: 'Bookable custom build or repair services', href: '/dashboard/services', feature: 'service' },
      { id: 'builder-rentals', icon: '🔨', title: 'Rent Tools & Equipment', description: 'Let others borrow your tools for a fee', href: '/dashboard/rentals', feature: 'rental' },
      { id: 'builder-shop', icon: '🏪', title: 'Create Your Shop', description: 'Brand your workshop as a storefront', href: '/dashboard/shop', feature: 'shop' },
    ],
  },
  Teacher: {
    icon: '📚',
    description: 'Share knowledge through courses, lessons, and workshops.',
    subtitle: 'Create courses, offer lessons, host workshops',
    steps: [
      { id: 'teacher-school', icon: '📚', title: 'Create Your School', description: 'Publish structured courses and curriculum', href: '/school/setup', feature: 'school' },
      { id: 'teacher-services', icon: '👨‍🏫', title: 'Offer Tutoring', description: 'Book 1-on-1 lessons and tutoring sessions', href: '/dashboard/services', feature: 'service' },
      { id: 'teacher-events', icon: '📅', title: 'Host a Workshop', description: 'Teach a group in-person or online', href: '/events/new', feature: 'event' },
      { id: 'teacher-shop', icon: '🏪', title: 'Create Your Shop', description: 'Sell teaching materials and resources', href: '/dashboard/shop', feature: 'shop' },
    ],
  },
  Guide: {
    icon: '🧭',
    description: 'Lead others through experiences, travel, and discovery.',
    subtitle: 'Offer tours, host outings, sell guides',
    steps: [
      { id: 'guide-services', icon: '🧭', title: 'Offer Tour Services', description: 'Bookable guided tours and experiences', href: '/dashboard/services', feature: 'service' },
      { id: 'guide-events', icon: '📅', title: 'Host Group Outings', description: 'Organize hikes, city tours, or expeditions', href: '/events/new', feature: 'event' },
      { id: 'guide-products', icon: '🗺️', title: 'Sell Maps & Guides', description: 'List travel guides, maps, or resources', href: '/products/new', feature: 'product' },
    ],
  },
  Healer: {
    icon: '💚',
    description: 'Support wellness through healing practices and services.',
    subtitle: 'Offer sessions, host wellness events, sell products',
    steps: [
      { id: 'healer-services', icon: '💚', title: 'Offer Healing Sessions', description: 'Bookable wellness and healing appointments', href: '/dashboard/services', feature: 'service' },
      { id: 'healer-events', icon: '📅', title: 'Host a Wellness Workshop', description: 'Yoga, meditation, or group healing', href: '/events/new', feature: 'event' },
      { id: 'healer-products', icon: '🌿', title: 'Sell Wellness Products', description: 'Herbs, oils, crystals, or wellness tools', href: '/products/new', feature: 'product' },
      { id: 'healer-shop', icon: '🏪', title: 'Create Your Shop', description: 'Brand your healing practice', href: '/dashboard/shop', feature: 'shop' },
    ],
  },
  Revealer: {
    icon: '👁️',
    description: 'Reveal hidden truths through readings, art, and insight.',
    subtitle: 'Offer readings, sell art, host talks',
    steps: [
      { id: 'revealer-services', icon: '👁️', title: 'Offer Reading Sessions', description: 'Bookable tarot, astrology, or intuitive readings', href: '/dashboard/services', feature: 'service' },
      { id: 'revealer-products', icon: '📖', title: 'Sell Books & Art', description: 'Publish writings, zines, or revelation art', href: '/products/new', feature: 'product' },
      { id: 'revealer-events', icon: '📅', title: 'Host a Talk or Circle', description: 'Share insights through group events', href: '/events/new', feature: 'event' },
      { id: 'revealer-shop', icon: '🏪', title: 'Create Your Shop', description: 'Brand your practice', href: '/dashboard/shop', feature: 'shop' },
    ],
  },
  Seer: {
    icon: '🔮',
    description: 'Provide foresight through divination, readings, and guidance.',
    subtitle: 'Offer readings, sell tools, host gatherings',
    steps: [
      { id: 'seer-services', icon: '🔮', title: 'Offer Divination Sessions', description: 'Bookable readings and consultations', href: '/dashboard/services', feature: 'service' },
      { id: 'seer-products', icon: '🕯️', title: 'Sell Spiritual Tools', description: 'Candles, crystals, cards, or ritual items', href: '/products/new', feature: 'product' },
      { id: 'seer-events', icon: '📅', title: 'Host a Circle or Ritual', description: 'Group divination or spiritual gathering', href: '/events/new', feature: 'event' },
      { id: 'seer-shop', icon: '🏪', title: 'Create Your Shop', description: 'Brand your practice', href: '/dashboard/shop', feature: 'shop' },
    ],
  },
  Warrior: {
    icon: '⚔️',
    description: 'Build discipline and strength through training and coaching.',
    subtitle: 'Offer training, host retreats, sell gear',
    steps: [
      { id: 'warrior-services', icon: '⚔️', title: 'Offer Training Sessions', description: 'Bookable coaching and fitness sessions', href: '/dashboard/services', feature: 'service' },
      { id: 'warrior-events', icon: '📅', title: 'Host a Retreat or Workshop', description: 'Group training camps or intensives', href: '/events/new', feature: 'event' },
      { id: 'warrior-products', icon: '🛡️', title: 'Sell Training Gear', description: 'Equipment, apparel, or training resources', href: '/products/new', feature: 'product' },
      { id: 'warrior-shop', icon: '🏪', title: 'Create Your Shop', description: 'Brand your training practice', href: '/dashboard/shop', feature: 'shop' },
    ],
  },
  Guardian: {
    icon: '🛡️',
    description: 'Protect and serve your community with security and preparedness.',
    subtitle: 'Offer services, sell safety products',
    steps: [
      { id: 'guardian-services', icon: '🛡️', title: 'Offer Protection Services', description: 'Security consulting or safety workshops', href: '/dashboard/services', feature: 'service' },
      { id: 'guardian-products', icon: '🔦', title: 'Sell Safety Products', description: 'Emergency kits, gear, or preparedness tools', href: '/products/new', feature: 'product' },
      { id: 'guardian-shop', icon: '🏪', title: 'Create Your Shop', description: 'Brand your safety practice', href: '/dashboard/shop', feature: 'shop' },
    ],
  },
  Sage: {
    icon: '🦉',
    description: 'Share wisdom through teaching, mentoring, and writing.',
    subtitle: 'Teach courses, mentor, publish writings',
    steps: [
      { id: 'sage-school', icon: '📚', title: 'Create Your School', description: 'Publish courses and share your wisdom', href: '/school/setup', feature: 'school' },
      { id: 'sage-services', icon: '🦉', title: 'Offer Mentoring', description: 'Book 1-on-1 wisdom sessions', href: '/dashboard/services', feature: 'service' },
      { id: 'sage-products', icon: '📖', title: 'Publish Writings', description: 'Sell books, essays, or research', href: '/products/new', feature: 'product' },
      { id: 'sage-events', icon: '📅', title: 'Host a Lecture', description: 'Share knowledge through talks and panels', href: '/events/new', feature: 'event' },
    ],
  },
  Mystic: {
    icon: '✨',
    description: 'Weave spiritual practices into offerings for the community.',
    subtitle: 'Offer rituals, sell tools, host ceremonies',
    steps: [
      { id: 'mystic-services', icon: '✨', title: 'Offer Ritual Services', description: 'Bookable ceremonies and spiritual sessions', href: '/dashboard/services', feature: 'service' },
      { id: 'mystic-products', icon: '🔮', title: 'Sell Ritual Tools', description: 'Herbs, wands, incense, or spiritual items', href: '/products/new', feature: 'product' },
      { id: 'mystic-events', icon: '📅', title: 'Host a Ceremony', description: 'Group rituals, full moons, or celebrations', href: '/events/new', feature: 'event' },
      { id: 'mystic-shop', icon: '🏪', title: 'Create Your Shop', description: 'Brand your mystical practice', href: '/dashboard/shop', feature: 'shop' },
    ],
  },
  Architect: {
    icon: '🏗️',
    description: 'Design and plan — turn blueprints into built reality.',
    subtitle: 'Offer design services, sell plans, brand your firm',
    steps: [
      { id: 'architect-services', icon: '🏗️', title: 'Offer Design Services', description: 'Bookable architecture or design consultations', href: '/dashboard/services', feature: 'service' },
      { id: 'architect-products', icon: '📐', title: 'Sell Plans & Blueprints', description: 'Digital designs, templates, or schematics', href: '/products/new', feature: 'product' },
      { id: 'architect-shop', icon: '🏪', title: 'Create Your Shop', description: 'Brand your design firm', href: '/dashboard/shop', feature: 'shop' },
    ],
  },
  Explorer: {
    icon: '🌍',
    description: 'Discover new places and share adventures with others.',
    subtitle: 'Lead expeditions, offer tours, sell gear',
    steps: [
      { id: 'explorer-events', icon: '🌍', title: 'Lead an Expedition', description: 'Organize group adventures and explorations', href: '/events/new', feature: 'event' },
      { id: 'explorer-services', icon: '🧭', title: 'Offer Tour Services', description: 'Bookable guided experiences', href: '/dashboard/services', feature: 'service' },
      { id: 'explorer-products', icon: '🎒', title: 'Sell Adventure Gear', description: 'Maps, packs, or exploration tools', href: '/products/new', feature: 'product' },
    ],
  },
  Mentor: {
    icon: '🌟',
    description: 'Guide others on their journey with experience and care.',
    subtitle: 'Create courses, coach, host workshops',
    steps: [
      { id: 'mentor-school', icon: '📚', title: 'Create Your School', description: 'Publish courses and guide students', href: '/school/setup', feature: 'school' },
      { id: 'mentor-services', icon: '🌟', title: 'Offer Coaching', description: 'Book 1-on-1 mentoring sessions', href: '/dashboard/services', feature: 'service' },
      { id: 'mentor-events', icon: '📅', title: 'Host a Workshop', description: 'Group mentoring or skill-building events', href: '/events/new', feature: 'event' },
      { id: 'mentor-products', icon: '📖', title: 'Publish Resources', description: 'Books, guides, or worksheets', href: '/products/new', feature: 'product' },
      { id: 'mentor-shop', icon: '🏪', title: 'Create Your Shop', description: 'Brand your mentoring practice', href: '/dashboard/shop', feature: 'shop' },
    ],
  },
}

export function getClassGuides(classes: string[]): ClassGuide[] {
  return classes
    .map(c => c.trim())
    .filter(c => CLASS_SETUP_GUIDES[c])
    .map(c => CLASS_SETUP_GUIDES[c])
}

export function getAllSetupStepIds(classes: string[]): string[] {
  const seen = new Set<string>()
  for (const cls of classes) {
    const guide = CLASS_SETUP_GUIDES[cls.trim()]
    if (!guide) continue
    for (const step of guide.steps) {
      seen.add(step.id)
    }
  }
  return Array.from(seen)
}

export function getClassSetupsByFeature(feature: ClassSetupStep['feature'], classes: string[]): ClassSetupStep[] {
  const seen = new Set<string>()
  const steps: ClassSetupStep[] = []
  for (const cls of classes) {
    const guide = CLASS_SETUP_GUIDES[cls.trim()]
    if (!guide) continue
    for (const step of guide.steps) {
      if (step.feature === feature && !seen.has(step.id)) {
        seen.add(step.id)
        steps.push(step)
      }
    }
  }
  return steps
}
