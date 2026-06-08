import type { ReactNode } from 'react'

export interface TourStep {
  target?: string
  title: string
  description: string | ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  spotlightPadding?: number
  action?: { label: string; href?: string; onClick?: () => void }
  page?: string
}

export type TourID = 'post-onboarding' | 'home-welcome'

export const TOUR_DEFAULTS = {
  spotlightPadding: 8,
}

export const POST_ONBOARDING_TOUR: TourStep[] = [
  {
    title: 'Welcome to XistrYmemZ! 🌍',
    description: (
      <div>
        <p style={{ marginBottom: 8 }}>
          You&apos;re one of the <strong>first to experience</strong> this platform. We&apos;re in early
          development (v0.7.0) — which means <strong>you shape what comes next.</strong>
        </p>
        <p style={{ opacity: 0.8, fontSize: '0.85rem' }}>
          Everything is built around your <strong>Earth Passport</strong> — your location, your
          connections, your projects. Set your home base, and the whole platform adapts.
        </p>
        <p style={{ opacity: 0.8, fontSize: '0.85rem', marginTop: 8 }}>
          Your feedback directly guides development. Every feature request, bug report, and idea
          helps build what this becomes.
        </p>
      </div>
    ),
    position: 'center',
  },
  {
    target: 'a[href="/dashboard/passport"]',
    title: '🌍 Earth Passport — Your Home Base',
    description: (
      <div>
        <p style={{ marginBottom: 6 }}>
          Your passport powers everything — boards near you, discover results, trip planning,
          and event suggestions. Set your location once, and the platform adapts.
        </p>
        <p style={{ opacity: 0.8, fontSize: '0.85rem' }}>
          Toggle <strong>Traveling mode</strong> to explore other areas. Your search radius
          controls how far "nearby" reaches.
        </p>
      </div>
    ),
    position: 'right',
    action: { label: 'Open Passport →', href: '/dashboard/passport' },
  },
  {
    target: '.quickActions',
    title: '🚀 Quick Actions — Start Building',
    description: (
      <div>
        <p style={{ marginBottom: 6 }}>
          Create products, services, events, groups, and more right from here. Everything you
          create can be pinned to nearby boards and discovered by others.
        </p>
        <p style={{ opacity: 0.8, fontSize: '0.85rem' }}>
          <strong>Groups</strong> let you collaborate on group buys, share resources, and
          build community around shared interests. Products linked to groups appear in your
          group&apos;s marketplace.
        </p>
      </div>
    ),
    position: 'top',
  },
  {
    target: 'a[href="/dashboard/appointments"]',
    title: '📅 Booking System — Schedule & Appointments',
    description: (
      <div>
        <p style={{ marginBottom: 6 }}>
          Set your availability and let others book time with you directly. Appointments sync
          with your <strong>Planner</strong> and show up on your <strong>Calendar</strong>.
        </p>
        <p style={{ opacity: 0.8, fontSize: '0.85rem' }}>
          Service providers, teachers, and consultants use this to manage scheduling. Every
          booking is linked to your profile and availability.
        </p>
      </div>
    ),
    position: 'right',
    action: { label: 'Open Planner →', href: '/dashboard/appointments' },
  },
  {
    target: 'a[href="/boards"]',
    title: '📌 Boards — Location-Based Discovery',
    description: (
      <div>
        <p style={{ marginBottom: 6 }}>
          Boards are auto-created near your passport location. Pin your products, events,
          services, and listings to boards for local visibility.
        </p>
        <p style={{ opacity: 0.8, fontSize: '0.85rem' }}>
          Each pin can link back to a product, event, service, or group — creating a
          connected ecosystem from a single board.
        </p>
      </div>
    ),
    position: 'right',
    action: { label: 'Explore Boards →', href: '/boards' },
  },
  {
    target: 'a[href="/discover"]',
    title: '🔍 Discover — Find What\'s Near You',
    description: (
      <div>
        <p style={{ marginBottom: 6 }}>
          Everything is filtered by your passport location. People, products, events, services,
          groups — see what&apos;s nearby on the map or in grid view.
        </p>
        <p style={{ opacity: 0.8, fontSize: '0.85rem' }}>
          Filter by entity type, hashtag, or intent. Change your passport radius to expand
          or narrow results.
        </p>
      </div>
    ),
    position: 'right',
    action: { label: 'Open Discover →', href: '/discover' },
  },
  {
    target: '.overviewStats',
    title: '📊 Dashboard Overview — Your Stats at a Glance',
    description: (
      <div>
        <p style={{ marginBottom: 6 }}>
          This panel shows your activity across the platform — projects, products, services,
          events, connections, and more. <strong>Each gauge tracks a different part</strong>{' '}
          of your presence.
        </p>
        <p style={{ opacity: 0.8, fontSize: '0.85rem' }}>
          Click any gauge to dive deeper. The Feature Banner above rotates tips and new
          features — dismiss the ones you've seen. Your Quick Actions below give you one-click
          access to create anything.
        </p>
      </div>
    ),
    position: 'bottom',
  },
  {
    target: 'a[href="/dashboard/planning"]',
    title: '🗺️ Planning — Trips & Itineraries',
    description: (
      <div>
        <p style={{ marginBottom: 6 }}>
          Plan trips using your saved passport locations as stops. Each stop can have linked
          requests, events, products, shopping lists, and collaborators.
        </p>
        <p style={{ opacity: 0.8, fontSize: '0.85rem' }}>
          Calendar view shows stops on actual dates. Share trips with collaborators for
          group planning.
        </p>
      </div>
    ),
    position: 'right',
    action: { label: 'Open Planning →', href: '/dashboard/planning' },
  },
  {
    target: 'a[href="/community"]',
    title: '👥 Community — Groups & Connections',
    description: (
      <div>
        <p style={{ marginBottom: 6 }}>
          Groups are where collaboration happens. Create group buys, share marketplace
          products, make posts, and organize events — all within a group.
        </p>
        <p style={{ opacity: 0.8, fontSize: '0.85rem' }}>
          Groups connect to boards, events, requests, and products. They&apos;re the social
          layer that ties everything together. Find your people.
        </p>
      </div>
    ),
    position: 'right',
    action: { label: 'Browse Groups →', href: '/community/groups' },
  },
  {
    title: '💡 You Shape the Future',
    description: (
      <div>
        <p style={{ marginBottom: 8 }}>
          XistrYmemZ is <strong>open source</strong> and <strong>community-driven</strong>.
          We don&apos;t sell data, run ads, or use algorithms. Every feature exists because
          users asked for it.
        </p>
        <p style={{ marginBottom: 8, opacity: 0.8, fontSize: '0.85rem' }}>
          Spotted a bug? Have an idea? Want something changed? <strong>Tell us.</strong>
          Your feedback goes directly into development.
        </p>
        <p style={{ opacity: 0.8, fontSize: '0.85rem' }}>
          Join the discussion on{' '}
          <a href="https://github.com/yerbaforums/xistrymemz" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--accent-primary)' }}>GitHub</a>{' '}
          or use the contact form.
        </p>
      </div>
    ),
    position: 'center',
    action: { label: 'Send Feedback →', href: '/contact' },
  },
  {
    title: '🎉 You\'re Ready!',
    description: (
      <div>
        <p style={{ marginBottom: 8 }}>
          Your passport connects everything: <strong>location → boards → discover →
          planning → groups → products.</strong> Update your location anytime to explore
          new places.
        </p>
        <p style={{ opacity: 0.8, fontSize: '0.85rem' }}>
          We&apos;re building this together. Every project, product, event, and connection
          you create makes the platform stronger.
        </p>
      </div>
    ),
    position: 'center',
    action: { label: 'Get Started →', href: '/dashboard/overview' },
  },
]

export const HOME_WELCOME_TOUR: TourStep[] = [
  {
    title: 'Welcome to XistrYmemZ 🌍',
    description: (
      <div>
        <p style={{ marginBottom: 8 }}>
          A <strong>cooperative platform</strong> for building, sharing, and growing together.
          Everything revolves around your location — set your passport and the whole platform
          adapts.
        </p>
        <p style={{ opacity: 0.8, fontSize: '0.85rem' }}>
          We&apos;re in early development (v0.7.0). Your feedback shapes what comes next.
        </p>
      </div>
    ),
    position: 'center',
    action: { label: 'Learn More →', href: '/about' },
  },
  {
    title: '🔗 Features Are Connected',
    description: (
      <div>
        <p style={{ marginBottom: 6 }}>
          <strong>Passport</strong> powers boards, discover, events, and planning.
          <strong> Boards</strong> collect pins from products, events, and services.
          <strong> Groups</strong> connect to marketplace, events, and requests.
        </p>
        <p style={{ opacity: 0.8, fontSize: '0.85rem' }}>
          Nothing is siloed. Every feature links to others — your location ties it all together.
        </p>
      </div>
    ),
    position: 'center',
    action: { label: 'See Features →', href: '#features' },
  },
  {
    title: '💡 Shape the Future',
    description: (
      <div>
        <p style={{ marginBottom: 6 }}>
          Open source, ad-free, no algorithms. Every feature request, bug report, and idea
          directly influences development.
        </p>
        <p style={{ opacity: 0.8, fontSize: '0.85rem' }}>
          Found something missing? Tell us. We build what the community needs.
        </p>
      </div>
    ),
    position: 'center',
    action: { label: 'Send Feedback →', href: '/contact' },
  },
  {
    title: '🚀 Ready to Start?',
    description: (
      <div>
        <p style={{ marginBottom: 6 }}>
          Set your passport location, explore nearby boards, find your community, and start
          building. Everything connects from there.
        </p>
      </div>
    ),
    position: 'center',
    action: { label: 'Sign Up Free →', href: '/auth/register' },
  },
]
