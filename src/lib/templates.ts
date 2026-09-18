export interface BusinessTemplate {
  id: string
  type: 'SHOP' | 'SCHOOL' | 'COURIER'
  category: string
  name: string
  description: string
  icon: string
  estimatedTime: string
  data: {
    // Shop fields
    shopName?: string
    shopAbout?: string
    shopImage?: string
    // School fields
    schoolName?: string
    schoolAbout?: string
    schoolImage?: string
    // Courier fields
    serviceName?: string
    serviceDescription?: string
    serviceType?: string
    basePrice?: number
    pricePerMile?: number
    maxDistance?: number
    availableAreas?: string
    isActive?: boolean
  }
  sampleProducts?: Array<{
    title: string
    description: string
    price: number
    type: 'PRODUCT'
    category: string
    condition?: string
    paymentMethods: string
    paymentType: 'BOTH' | 'ESCROW' | 'DIRECT'
    acceptsRequests: boolean
    acceptsOffers: boolean
  }>
  sampleContent?: Array<{
    title: string
    description: string
    contentType: string
    price?: number
    isPublished: boolean
  }>
}

export const businessTemplates: BusinessTemplate[] = [
  // SHOP TEMPLATES
  {
    id: 'shop-restaurant',
    type: 'SHOP',
    category: 'Food & Dining',
    name: 'Restaurant / Cafe',
    description: 'Sell food items, meals, catering services, and handle online orders',
    icon: '🍽️',
    estimatedTime: '10 min',
    data: {
      shopName: 'My Restaurant',
      shopAbout: 'Serving delicious meals made with fresh, locally-sourced ingredients. We offer dine-in, takeout, and delivery services.',
      shopImage: ''
    },
    sampleProducts: [
      {
        title: 'Classic Burger Combo',
        description: 'Juicy beef burger with lettuce, tomato, cheese, served with fries and a drink',
        price: 14.99,
        type: 'PRODUCT',
        category: 'Main Course',
        condition: 'NEW',
        paymentMethods: 'Cash,Venmo,PayPal,Card',
        paymentType: 'BOTH',
        acceptsRequests: true,
        acceptsOffers: false
      },
      {
        title: 'Catering Service (per person)',
        description: 'Full catering service for events. Includes setup, serving, and cleanup. Menu customizable.',
        price: 25.00,
        type: 'PRODUCT',
        category: 'Catering',
        paymentMethods: 'Cash,Venmo,PayPal,Card',
        paymentType: 'ESCROW',
        acceptsRequests: true,
        acceptsOffers: false
      },
      {
        title: 'House Salad',
        description: 'Fresh garden salad with mixed greens, vegetables, and your choice of dressing',
        price: 8.99,
        type: 'PRODUCT',
        category: 'Appetizers',
        condition: 'NEW',
        paymentMethods: 'Cash,Venmo,PayPal,Card',
        paymentType: 'BOTH',
        acceptsRequests: false,
        acceptsOffers: false
      },
      {
        title: 'Daily Special - Chef\'s Choice',
        description: 'Ask about our daily special! Fresh ingredients, chef\'s special recipe changes daily.',
        price: 12.99,
        type: 'PRODUCT',
        category: 'Daily Special',
        condition: 'NEW',
        paymentMethods: 'Cash,Venmo,PayPal,Card',
        paymentType: 'BOTH',
        acceptsRequests: false,
        acceptsOffers: false
      }
    ]
  },
  {
    id: 'shop-retail',
    type: 'SHOP',
    category: 'Retail & Fashion',
    name: 'Retail Store',
    description: 'Sell clothing, accessories, electronics, home goods, and track inventory',
    icon: '🛍️',
    estimatedTime: '12 min',
    data: {
      shopName: 'Fashion & More',
      shopAbout: 'Your one-stop shop for trendy clothing, accessories, and lifestyle products. Quality items at affordable prices.',
      shopImage: ''
    },
    sampleProducts: [
      {
        title: 'Classic White T-Shirt',
        description: 'Premium cotton t-shirt, comfortable fit, available in all sizes',
        price: 19.99,
        type: 'PRODUCT',
        category: 'Clothing',
        condition: 'NEW',
        paymentMethods: 'Cash,Venmo,PayPal,Card,Crypto',
        paymentType: 'BOTH',
        acceptsRequests: false,
        acceptsOffers: true
      },
      {
        title: 'Wireless Bluetooth Headphones',
        description: 'High-quality sound, noise canceling, 20-hour battery life',
        price: 89.99,
        type: 'PRODUCT',
        category: 'Electronics',
        condition: 'NEW',
        paymentMethods: 'Cash,Venmo,PayPal,Card,Crypto',
        paymentType: 'BOTH',
        acceptsRequests: false,
        acceptsOffers: true
      },
      {
        title: 'Personal Styling Service',
        description: 'Get personalized style recommendations and shopping assistance',
        price: 50.00,
        type: 'PRODUCT',
        category: 'Services',
        paymentMethods: 'Venmo,PayPal,Card',
        paymentType: 'DIRECT',
        acceptsRequests: true,
        acceptsOffers: false
      }
    ]
  },
  {
    id: 'shop-services',
    type: 'SHOP',
    category: 'Professional Services',
    name: 'Service Provider',
    description: 'Offer professional services like consulting, repairs, cleaning, tutoring, etc.',
    icon: '🔧',
    estimatedTime: '8 min',
    data: {
      shopName: 'Pro Services',
      shopAbout: 'Professional services you can trust. Experienced, reliable, and committed to quality work.',
      shopImage: ''
    },
    sampleProducts: [
      {
        title: 'Home Cleaning Service (2 hours)',
        description: 'Professional home cleaning. Includes dusting, vacuuming, bathroom and kitchen cleaning.',
        price: 80.00,
        type: 'PRODUCT',
        category: 'Cleaning',
        paymentMethods: 'Cash,Venmo,PayPal,Zelle',
        paymentType: 'ESCROW',
        acceptsRequests: true,
        acceptsOffers: false
      },
      {
        title: 'Computer Repair & Diagnostics',
        description: 'Full computer diagnostics and repair. Hardware and software issues fixed.',
        price: 60.00,
        type: 'PRODUCT',
        category: 'Technology',
        paymentMethods: 'Cash,Venmo,PayPal,Card',
        paymentType: 'BOTH',
        acceptsRequests: true,
        acceptsOffers: false
      },
      {
        title: 'Math Tutoring (per hour)',
        description: 'One-on-one math tutoring for all grade levels. Algebra, Geometry, Calculus.',
        price: 35.00,
        type: 'PRODUCT',
        category: 'Education',
        paymentMethods: 'Cash,Venmo,PayPal,Zelle',
        paymentType: 'DIRECT',
        acceptsRequests: true,
        acceptsOffers: false
      }
    ]
  },
  {
    id: 'shop-digital',
    type: 'SHOP',
    category: 'Digital Products',
    name: 'Digital Products',
    description: 'Sell ebooks, courses, templates, software, music, art, and digital downloads',
    icon: '💻',
    estimatedTime: '10 min',
    data: {
      shopName: 'Digital Market',
      shopAbout: 'Premium digital products for creators, developers, and entrepreneurs. Instant downloads.',
      shopImage: ''
    },
    sampleProducts: [
      {
        title: 'Web Development eBook - Complete Guide',
        description: 'Comprehensive guide to modern web development. HTML, CSS, JavaScript, React, and more.',
        price: 29.99,
        type: 'PRODUCT',
        category: 'Ebooks',
        condition: 'NEW',
        paymentMethods: 'PayPal,Card,Crypto',
        paymentType: 'DIRECT',
        acceptsRequests: false,
        acceptsOffers: true
      },
      {
        title: 'Business Plan Template Pack',
        description: 'Professional business plan templates for startups and small businesses.',
        price: 19.99,
        type: 'PRODUCT',
        category: 'Templates',
        condition: 'NEW',
        paymentMethods: 'PayPal,Card,Crypto',
        paymentType: 'DIRECT',
        acceptsRequests: false,
        acceptsOffers: true
      },
      {
        title: 'Custom Website Design Service',
        description: 'Professional website design tailored to your business. Responsive and modern.',
        price: 500.00,
        type: 'PRODUCT',
        category: 'Design',
        paymentMethods: 'PayPal,Card,Crypto',
        paymentType: 'ESCROW',
        acceptsRequests: true,
        acceptsOffers: false
      }
    ]
  },

  // SCHOOL TEMPLATES
  {
    id: 'school-academy',
    type: 'SCHOOL',
    category: 'Education',
    name: 'Online Academy',
    description: 'Create structured courses, modules, and offer certificates upon completion',
    icon: '🎓',
    estimatedTime: '15 min',
    data: {
      schoolName: 'Online Learning Academy',
      schoolAbout: 'Comprehensive online education platform offering courses in technology, business, and personal development. Learn at your own pace.',
      schoolImage: ''
    },
    sampleContent: [
      {
        title: 'Introduction to Web Development',
        description: 'Learn the basics of HTML, CSS, and JavaScript. Perfect for beginners.',
        contentType: 'COURSE',
        price: 49.99,
        isPublished: true
      },
      {
        title: 'Advanced React Patterns',
        description: 'Deep dive into advanced React concepts, hooks, and performance optimization.',
        contentType: 'COURSE',
        price: 79.99,
        isPublished: true
      },
      {
        title: 'Free: JavaScript Basics Cheat Sheet',
        description: 'Downloadable cheat sheet covering JavaScript fundamentals.',
        contentType: 'RESOURCE',
        price: 0,
        isPublished: true
      }
    ]
  },
  {
    id: 'school-workshop',
    type: 'SCHOOL',
    category: 'Workshops & Training',
    name: 'Workshop / Bootcamp',
    description: 'Host live workshops, training sessions, and intensive bootcamps',
    icon: '🏗️',
    estimatedTime: '12 min',
    data: {
      schoolName: 'Skills Workshop',
      schoolAbout: 'Hands-on workshops and intensive training programs. Learn practical skills from industry experts.',
      schoolImage: ''
    },
    sampleContent: [
      {
        title: 'Weekend Coding Bootcamp',
        description: 'Intensive 2-day coding bootcamp. Build and deploy your first web application.',
        contentType: 'WORKSHOP',
        price: 199.99,
        isPublished: true
      },
      {
        title: 'Digital Marketing Workshop',
        description: 'Learn SEO, social media marketing, and content strategy in this hands-on workshop.',
        contentType: 'WORKSHOP',
        price: 149.99,
        isPublished: true
      }
    ]
  },
  {
    id: 'school-tutoring',
    type: 'SCHOOL',
    category: 'Tutoring & Coaching',
    name: 'Tutoring / Coaching',
    description: 'Offer one-on-one tutoring, group classes, and personal coaching sessions',
    icon: '📚',
    estimatedTime: '10 min',
    data: {
      schoolName: 'Expert Tutoring',
      schoolAbout: 'Personalized tutoring and coaching services. Expert instructors in math, science, languages, and more.',
      schoolImage: ''
    },
    sampleContent: [
      {
        title: 'Math Tutoring - All Levels',
        description: 'One-on-one math tutoring sessions. Algebra, Geometry, Calculus, Statistics.',
        contentType: 'SESSION',
        price: 40.00,
        isPublished: true
      },
      {
        title: 'Language Lessons - Spanish',
        description: 'Learn Spanish with native speakers. Conversation practice, grammar, and vocabulary.',
        contentType: 'SESSION',
        price: 35.00,
        isPublished: true
      }
    ]
  },

  // COURIER TEMPLATES
  {
    id: 'courier-local',
    type: 'COURIER',
    category: 'Local Delivery',
    name: 'Local Delivery Service',
    description: 'Same-day delivery within your city or neighborhood',
    icon: '🚲',
    estimatedTime: '8 min',
    data: {
      serviceName: 'Local Express Delivery',
      serviceDescription: 'Fast and reliable local delivery service. Same-day delivery within the city limits.',
      serviceType: 'DELIVERY',
      basePrice: 10.00,
      pricePerMile: 1.50,
      maxDistance: 25,
      availableAreas: '',
      isActive: true
    }
  },
  {
    id: 'courier-express',
    type: 'COURIER',
    category: 'Express & Rush',
    name: 'Express / Rush Delivery',
    description: 'Priority express delivery for urgent packages - 2-hour, same-day, and next-day options',
    icon: '⚡',
    estimatedTime: '8 min',
    data: {
      serviceName: 'Express Rush Delivery',
      serviceDescription: 'Urgent delivery when you need it fast. 2-hour express, same-day, and next-day options available.',
      serviceType: 'EXPRESS',
      basePrice: 25.00,
      pricePerMile: 2.50,
      maxDistance: 50,
      availableAreas: '',
      isActive: true
    }
  },
  {
    id: 'courier-international',
    type: 'COURIER',
    category: 'Long Distance',
    name: 'Long Distance / Intercity',
    description: 'Ship packages across the country or internationally with tracking and insurance',
    icon: '✈️',
    estimatedTime: '10 min',
    data: {
      serviceName: 'Nationwide Shipping',
      serviceDescription: 'Reliable long-distance shipping service. Tracked, insured, and delivered with care.',
      serviceType: 'INTERNATIONAL',
      basePrice: 50.00,
      pricePerMile: 0.75,
      maxDistance: 500,
      availableAreas: '',
      isActive: true
    }
  }
]

export function getTemplatesByType(type: 'SHOP' | 'SCHOOL' | 'COURIER'): BusinessTemplate[] {
  return businessTemplates.filter(t => t.type === type)
}

export function getTemplateById(id: string): BusinessTemplate | undefined {
  return businessTemplates.find(t => t.id === id)
}

// --- Channel templates -----------------------------------------------------
// These cover the Quick Create channels (product, service, project, group,
// request). Selecting one opens Quick Create on the matching tab with the
// suggested fields pre-filled, so users can turn a template into reality fast.

export interface ChannelTemplate {
  id: string
  type: 'PRODUCT' | 'SERVICE' | 'PROJECT' | 'GROUP' | 'REQUEST'
  tab: 'product' | 'service' | 'project' | 'group' | 'request'
  category: string
  name: string
  description: string
  icon: string
  estimatedTime: string
  data: {
    title?: string
    name?: string
    description?: string
    price?: string
    category?: string
    duration?: string
    goalAmount?: string
    budget?: string
    deadline?: string
    lookingForCollaborators?: boolean
    needsVolunteers?: boolean
    volunteerRoles?: string
  }
  sampleItems?: Array<{ label: string; value: string }>
}

export const channelTemplates: ChannelTemplate[] = [
  // --- PRODUCTS ---
  {
    id: 'product-handmade',
    type: 'PRODUCT',
    tab: 'product',
    category: 'Handmade & Crafts',
    name: 'Handmade Goods',
    description: 'Sell crafts, art, prints, and other things you make yourself',
    icon: '🧶',
    estimatedTime: '2 min',
    data: {
      title: 'Handmade [Your Craft]',
      description: 'Made by hand with love. Tell your story, materials used, and why it is special.',
      price: '45',
      category: 'ART',
    },
    sampleItems: [
      { label: 'Title', value: 'Handmade ceramic mug' },
      { label: 'Price', value: '$45' },
      { label: 'Category', value: 'Art' },
      { label: 'Condition', value: 'New' },
    ],
  },
  {
    id: 'product-farmstand',
    type: 'PRODUCT',
    tab: 'product',
    category: 'Food & Produce',
    name: 'Farm Stand / Produce',
    description: 'Sell fresh produce, eggs, honey, baked goods, and garden surplus',
    icon: '🥕',
    estimatedTime: '2 min',
    data: {
      title: 'Fresh [Produce] - Farm Stand',
      description: 'Harvested this week from my garden. Pesticide-free and full of flavor.',
      price: '8',
      category: 'HOME',
    },
    sampleItems: [
      { label: 'Title', value: 'Fresh eggs - dozen' },
      { label: 'Price', value: '$8 / dozen' },
      { label: 'Payment', value: 'Cash or barter' },
    ],
  },

  // --- SERVICES ---
  {
    id: 'service-tutoring',
    type: 'SERVICE',
    tab: 'service',
    category: 'Teaching & Tutoring',
    name: 'Tutor / Mentor',
    description: 'Offer lessons, tutoring, coaching, or mentorship in your area of expertise',
    icon: '🧑‍🏫',
    estimatedTime: '2 min',
    data: {
      title: 'Tutoring in [Subject]',
      description: 'One-on-one tutoring sessions tailored to your level. I will help you reach your goals.',
      price: '25',
      category: 'LESSON_TUTORING',
      duration: '60',
    },
    sampleItems: [
      { label: 'Session length', value: '60 minutes' },
      { label: 'Rate', value: '$25 / session' },
      { label: 'Category', value: 'Lesson / Tutoring' },
    ],
  },
  {
    id: 'service-handy',
    type: 'SERVICE',
    tab: 'service',
    category: 'Home & Repair',
    name: 'Handyman / Repair',
    description: 'Offer repairs, assembly, maintenance, and odd jobs in your neighborhood',
    icon: '🛠️',
    estimatedTime: '2 min',
    data: {
      title: 'Handyman Services - [Skill]',
      description: 'Reliable help with repairs, furniture assembly, and small home projects.',
      price: '40',
      category: 'MAINTENANCE_REPAIR',
      duration: '120',
    },
    sampleItems: [
      { label: 'Hourly rate', value: '$40 / hour' },
      { label: 'Category', value: 'Maintenance & Repair' },
      { label: 'Booking', value: 'Availability + location' },
    ],
  },

  // --- PROJECTS ---
  {
    id: 'project-community',
    type: 'PROJECT',
    tab: 'project',
    category: 'Community Projects',
    name: 'Community Project',
    description: 'Launch a project that helps your neighborhood, school, or town',
    icon: '🏘️',
    estimatedTime: '3 min',
    data: {
      title: 'Community [Project Name]',
      description: 'What is the problem you are solving, and how will the community benefit? Who can help?',
      category: 'COMMUNITY',
      lookingForCollaborators: true,
      needsVolunteers: true,
      volunteerRoles: 'Helpers, organizers, sponsors',
      goalAmount: '500',
    },
    sampleItems: [
      { label: 'Category', value: 'Community' },
      { label: 'Looking for collaborators', value: 'Yes' },
      { label: 'Needs volunteers', value: 'Yes' },
      { label: 'Funding goal', value: '$500 (optional)' },
    ],
  },
  {
    id: 'project-create',
    type: 'PROJECT',
    tab: 'project',
    category: 'Creative Projects',
    name: 'Creative Project',
    description: 'Music, art, writing, film, or design projects with milestones and goals',
    icon: '🎨',
    estimatedTime: '3 min',
    data: {
      title: '[Creative Project Title]',
      description: 'The vision, what is done, and what comes next. Who would you like to collaborate with?',
      category: 'CREATIVE',
      lookingForCollaborators: true,
      needsVolunteers: false,
      goalAmount: '250',
    },
    sampleItems: [
      { label: 'Category', value: 'Creative' },
      { label: 'Collaborators wanted', value: 'Yes' },
      { label: 'Milestones', value: 'Plan → Create → Share' },
    ],
  },

  // --- GROUPS ---
  {
    id: 'group-community',
    type: 'GROUP',
    tab: 'group',
    category: 'Community Groups',
    name: 'Local Community Group',
    description: 'Bring neighbors together around a shared interest, cause, or need',
    icon: '🤝',
    estimatedTime: '2 min',
    data: {
      name: 'Local [Interest] Club',
      description: 'A friendly group for neighbors who care about [topic]. All are welcome!',
      category: 'LOCAL',
    },
    sampleItems: [
      { label: 'Group name', value: 'Local Book Club' },
      { label: 'Privacy', value: 'Public (or Private)' },
      { label: 'Focus', value: 'Regular meetups + chat' },
    ],
  },
  {
    id: 'group-trade',
    type: 'GROUP',
    tab: 'group',
    category: 'Trade & Barter Groups',
    name: 'Trade / Barter Circle',
    description: 'Organize local trading, bartering, and skill-sharing circles',
    icon: '🔄',
    estimatedTime: '2 min',
    data: {
      name: 'Neighborhood Trade Circle',
      description: 'Swap skills, tools, and goods with your neighbors. No money needed.',
      category: 'BUSINESS',
    },
    sampleItems: [
      { label: 'Group name', value: 'Neighborhood Trade Circle' },
      { label: 'Members', value: 'Neighbors + friends' },
      { label: 'Rules', value: 'Fair trades, no scams' },
    ],
  },

  // --- REQUESTS ---
  {
    id: 'request-help',
    type: 'REQUEST',
    tab: 'request',
    category: 'Help & Support',
    name: 'Ask the Community',
    description: 'Ask the community for help, support, feedback, or a hand with something',
    icon: '🆘',
    estimatedTime: '2 min',
    data: {
      title: 'Looking for help with [Need]',
      description: 'Explain what you need, why it matters, and how people can help.',
      category: 'HELP',
    },
    sampleItems: [
      { label: 'Category', value: 'Help' },
      { label: 'Priority', value: 'Medium' },
      { label: 'Reward', value: 'Payment, barter, or gratitude' },
    ],
  },
  {
    id: 'request-raise',
    type: 'REQUEST',
    tab: 'request',
    category: 'Funding & Resources',
    name: 'Fund-a-Dream',
    description: 'Raise funds or gather resources for a dream project, trip, or big goal',
    icon: '💰',
    estimatedTime: '2 min',
    data: {
      title: 'Help me fund [Dream Goal]',
      description: 'What are you raising for, why does it matter, and how will the money be used?',
      category: 'FUNDING',
      goalAmount: '1000',
    },
    sampleItems: [
      { label: 'Category', value: 'Funding' },
      { label: 'Goal amount', value: '$1,000' },
      { label: 'Updates', value: 'Share progress with supporters' },
    ],
  },
]

export function getChannelTemplatesByType(type: ChannelTemplate['type']): ChannelTemplate[] {
  return channelTemplates.filter(t => t.type === type)
}
