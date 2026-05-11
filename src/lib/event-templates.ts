export interface EventTemplate {
  id: string
  name: string
  description: string
  icon: string
  category: string
  tags: string[]
  suggestedDescription: string
  suggestedMaxJoiners: number
  suggestedDuration: string
  suggestedVolunteerRoles: string[]
  suggestedLocation?: string
}

export const eventTemplates: EventTemplate[] = [
  {
    id: 'nature-hike',
    name: 'Nature Day Hike',
    description: 'Guided group hike through scenic nature trails',
    icon: '🥾',
    category: 'OUTDOOR',
    tags: ['hiking', 'nature', 'outdoors', 'fitness'],
    suggestedDescription: 'Join us for a guided nature hike through beautiful trails. We will explore local flora and fauna, enjoy scenic viewpoints, and connect with fellow nature lovers. Suitable for all fitness levels. Please bring water, snacks, and appropriate footwear.',
    suggestedMaxJoiners: 20,
    suggestedDuration: '4-6 hours',
    suggestedVolunteerRoles: ['Trail Leader', 'Sweep (trail end)', 'Photographer'],
    suggestedLocation: 'Local Nature Trail'
  },
  {
    id: 'wellness-retreat',
    name: 'Wellness Retreat',
    description: 'Multi-day wellness retreat with yoga, meditation, and healing',
    icon: '🧘',
    category: 'RETREAT',
    tags: ['wellness', 'retreat', 'yoga', 'meditation', 'healing'],
    suggestedDescription: 'Immerse yourself in a transformative multi-day wellness retreat. Daily yoga sessions, guided meditations, healthy meals, workshops, and evening ceremonies. Disconnect from the noise and reconnect with yourself in a beautiful natural setting.',
    suggestedMaxJoiners: 30,
    suggestedDuration: '2-5 days',
    suggestedVolunteerRoles: ['Yoga Instructor', 'Kitchen Team', 'Setup Crew', 'Workshop Facilitator'],
    suggestedLocation: 'Retreat Center'
  },
  {
    id: 'community-cleanup',
    name: 'Community Cleanup',
    description: 'Volunteer event to clean and restore local natural areas',
    icon: '🧹',
    category: 'COMMUNITY',
    tags: ['volunteer', 'cleanup', 'environment', 'community'],
    suggestedDescription: 'Come together to clean and restore our local environment. We will pick up litter, remove invasive species, and beautify public spaces. Gloves, bags, and tools provided. Great for families, groups, and anyone who loves our planet.',
    suggestedMaxJoiners: 50,
    suggestedDuration: '3-4 hours',
    suggestedVolunteerRoles: ['Team Lead', 'Supplies Coordinator', 'Waste Sorter', 'Photographer'],
    suggestedLocation: 'Local Park or Beach'
  },
  {
    id: 'full-moon-gathering',
    name: 'Full Moon Gathering',
    description: 'Evening ceremony and gathering under the full moon',
    icon: '🌕',
    category: 'CEREMONY',
    tags: ['ceremony', 'full moon', 'gathering', 'meditation'],
    suggestedDescription: 'Gather under the full moon for an evening of connection, reflection, and ceremony. We will share intentions, meditate, drum, dance, and celebrate the lunar energy. Bring blankets, instruments, and an open heart.',
    suggestedMaxJoiners: 40,
    suggestedDuration: '2-3 hours',
    suggestedVolunteerRoles: ['Fire Keeper', 'Sound Healer', 'Setup Crew', 'Tea Server'],
    suggestedLocation: 'Outdoor Gathering Space'
  },
  {
    id: 'skill-share',
    name: 'Skill Share Workshop',
    description: 'Community skill sharing and hands-on learning workshop',
    icon: '🔧',
    category: 'WORKSHOP',
    tags: ['workshop', 'learning', 'skills', 'community'],
    suggestedDescription: 'Share your skills and learn from others in this community skill share event. Topics may include gardening, cooking, crafts, technology, music, and more. Each session features a different skill led by a community member. All ages welcome.',
    suggestedMaxJoiners: 25,
    suggestedDuration: '3-5 hours',
    suggestedVolunteerRoles: ['Workshop Facilitator', 'Logistics', 'Welcome Host'],
    suggestedLocation: 'Community Center'
  },
  {
    id: 'ecstatic-dance',
    name: 'Ecstatic Dance',
    description: 'Free-form conscious dance journey with live music',
    icon: '💃',
    category: 'WORKSHOP',
    tags: ['dance', 'movement', 'music', 'wellness'],
    suggestedDescription: 'A drug and alcohol-free conscious dance experience. Move your body freely to a curated playlist spanning world beats, electronic, and acoustic sounds. No steps to follow, just authentic movement. Opening and closing circle included.',
    suggestedMaxJoiners: 60,
    suggestedDuration: '2-3 hours',
    suggestedVolunteerRoles: ['Sound Engineer', 'Check-in Host', 'Water Station', 'Setup/Cleanup'],
    suggestedLocation: 'Dance Studio or Outdoor Space'
  },
  {
    id: 'cacao-ceremony',
    name: 'Fire Circle & Cacao Ceremony',
    description: 'Sacred cacao ceremony with fire circle, drumming, and connection',
    icon: '🔥',
    category: 'CEREMONY',
    tags: ['ceremony', 'cacao', 'fire', 'drumming', 'medicine'],
    suggestedDescription: 'Join us for a heart-opening cacao ceremony around the fire. We will drink ceremonial-grade cacao, share intentions, drum, sing, and connect in a safe container. Bring your drums, rattles, and a mug for cacao.',
    suggestedMaxJoiners: 30,
    suggestedDuration: '3-4 hours',
    suggestedVolunteerRoles: ['Fire Keeper', 'Cacao Server', 'Drum Circle Lead'],
    suggestedLocation: 'Private Land or Retreat Space'
  },
  {
    id: 'yoga-nature',
    name: 'Yoga in Nature',
    description: 'Outdoor yoga session in a beautiful natural setting',
    icon: '🌿',
    category: 'WELLNESS',
    tags: ['yoga', 'nature', 'wellness', 'meditation'],
    suggestedDescription: 'Practice yoga outdoors surrounded by nature. All levels welcome — from beginners to advanced practitioners. We will flow through a gentle sequence, breathe fresh air, and end with a guided meditation. Bring your mat and water.',
    suggestedMaxJoiners: 25,
    suggestedDuration: '1.5-2 hours',
    suggestedVolunteerRoles: ['Yoga Instructor', 'Sound/Music'],
    suggestedLocation: 'Park or Beach'
  },
  {
    id: 'potluck',
    name: 'Potluck Gathering',
    description: 'Community potluck with food, music, and connection',
    icon: '🥗',
    category: 'MEETUP',
    tags: ['food', 'community', 'gathering', 'social'],
    suggestedDescription: 'Bring a dish to share and join the community potluck! Connect with neighbors and friends over delicious homemade food. Live acoustic music, games, and great conversations. Please bring your own plate, utensils, and a dish to share.',
    suggestedMaxJoiners: 40,
    suggestedDuration: '3-4 hours',
    suggestedVolunteerRoles: ['Setup Crew', 'Music Coordinator', 'Cleanup Crew'],
    suggestedLocation: 'Community Garden or Park'
  },
  {
    id: 'camping-trip',
    name: 'Camping Trip',
    description: 'Group camping adventure in nature with campfires and stargazing',
    icon: '🏕️',
    category: 'OUTDOOR',
    tags: ['camping', 'outdoors', 'adventure', 'nature'],
    suggestedDescription: 'Join us for a group camping adventure! We will set up camp, cook meals over the fire, hike during the day, and stargaze at night. All camping experience levels welcome. Gear list will be provided upon registration.',
    suggestedMaxJoiners: 20,
    suggestedDuration: '2-4 days',
    suggestedVolunteerRoles: ['Camp Lead', 'Cook', 'First Aid', 'Gear Coordinator'],
    suggestedLocation: 'Campground or National Forest'
  },
  {
    id: 'sound-bath',
    name: 'Sound Bath & Meditation',
    description: 'Immersive sound healing journey with singing bowls and gongs',
    icon: '🔔',
    category: 'WELLNESS',
    tags: ['sound bath', 'meditation', 'healing', 'wellness'],
    suggestedDescription: 'Lie back and let the sounds wash over you in this immersive sound bath experience. Crystal singing bowls, gongs, chimes, and other instruments create a deep meditative state. Bring a yoga mat, blanket, and pillow for comfort.',
    suggestedMaxJoiners: 20,
    suggestedDuration: '1.5-2 hours',
    suggestedVolunteerRoles: ['Sound Healer', 'Setup/Host'],
    suggestedLocation: 'Studio or Quiet Indoor Space'
  },
  {
    id: 'farm-garden-day',
    name: 'Farm / Garden Day',
    description: 'Hands-on day at the farm with planting, harvesting, and learning',
    icon: '🌱',
    category: 'WORKSHOP',
    tags: ['farming', 'gardening', 'permaculture', 'sustainability'],
    suggestedDescription: 'Spend a day at the farm! Learn about permaculture, organic gardening, and sustainable living. Hands-on activities include planting, harvesting, composting, and seed saving. Enjoy a farm-to-table lunch together.',
    suggestedMaxJoiners: 15,
    suggestedDuration: '5-7 hours',
    suggestedVolunteerRoles: ['Farm Lead', 'Workshop Facilitator', 'Lunch Coordinator'],
    suggestedLocation: 'Local Farm or Garden'
  },
  {
    id: 'sunrise-circle',
    name: 'Sunrise / Sunset Circle',
    description: 'Morning or evening circle to greet or bid farewell to the sun',
    icon: '🌅',
    category: 'CEREMONY',
    tags: ['sunrise', 'sunset', 'ceremony', 'meditation'],
    suggestedDescription: 'Gather at golden hour to honor the sun. We will sit in circle, share gratitudes, breathe together, meditate, and witness the beauty of sunrise/sunset. A gentle and grounding way to start or end the day.',
    suggestedMaxJoiners: 30,
    suggestedDuration: '1-1.5 hours',
    suggestedVolunteerRoles: ['Circle Facilitator', 'Tea Server'],
    suggestedLocation: 'Scenic Overlook or Beach'
  },
  {
    id: 'cold-plunge',
    name: 'Cold Plunge / Ice Bath',
    description: 'Group cold exposure experience with breathwork and community',
    icon: '🧊',
    category: 'WELLNESS',
    tags: ['cold plunge', 'ice bath', 'breathwork', 'wellness', 'wim hof'],
    suggestedDescription: 'Experience the invigorating power of cold exposure. We will begin with breathwork and meditation, followed by a guided cold plunge or ice bath. End with warm tea and community connection. Beginners welcome and supported.',
    suggestedMaxJoiners: 15,
    suggestedDuration: '2-3 hours',
    suggestedVolunteerRoles: ['Breathwork Guide', 'Safety Monitor', 'Tea & Towels'],
    suggestedLocation: 'Lake, River, or Private Tub'
  },
  {
    id: 'art-workshop',
    name: 'Creative Art Workshop',
    description: 'Guided art session for creative expression and connection',
    icon: '🎨',
    category: 'WORKSHOP',
    tags: ['art', 'creativity', 'workshop', 'painting'],
    suggestedDescription: 'Unleash your creativity in this guided art workshop. No experience necessary! We will explore different art techniques, create individual and collaborative pieces, and express ourselves through color and form. All materials provided.',
    suggestedMaxJoiners: 20,
    suggestedDuration: '2-3 hours',
    suggestedVolunteerRoles: ['Art Instructor', 'Materials Coordinator', 'Cleanup'],
    suggestedLocation: 'Studio or Outdoor Pavilion'
  }
]

export const eventCategories = [
  'OUTDOOR',
  'RETREAT',
  'CEREMONY',
  'WORKSHOP',
  'WELLNESS',
  'MEETUP',
  'COMMUNITY'
]

export function getEventTemplatesByCategory(category: string): EventTemplate[] {
  return eventTemplates.filter(t => t.category === category)
}

export function getEventTemplateById(id: string): EventTemplate | undefined {
  return eventTemplates.find(t => t.id === id)
}

export function getEventTemplatesByTag(tag: string): EventTemplate[] {
  return eventTemplates.filter(t => t.tags.includes(tag))
}
