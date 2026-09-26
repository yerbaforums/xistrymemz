'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './page.module.css'
import HomeMap from '@/components/HomeMap'
import HeroSection from '@/components/home/HeroSection'
import StatsSection from '@/components/home/StatsSection'
import HashtagSection from '@/components/home/HashtagSection'
import PulseSection from '@/components/home/PulseSection'
import StepsSection from '@/components/home/StepsSection'
import StartHereSection from '@/components/home/StartHereSection'
import FeaturesSection from '@/components/home/FeaturesSection'
import CTASection from '@/components/home/CTASection'
import PassportSection from '@/components/home/PassportSection'
import FeedbackSection from '@/components/home/FeedbackSection'
import MemberSpotlightSection from '@/components/home/MemberSpotlightSection'
import HomeFooterSection from '@/components/home/HomeFooterSection'
import HomeTourWrapper from '@/components/HomeTourWrapper'
import type { PlatformStats, FeaturedShop, FeaturedProduct, PublicRequest, FeaturedEvent, PublicProject, FeaturedBoard, FeaturedBlog, FeaturedPodcast, FeaturedService, RecentMember } from '@/components/home/types'

const ZERO_STATS: PlatformStats = {
  members: 0, shops: 0, schools: 0, products: 0, services: 0,
  rentals: 0, events: 0, projects: 0, requests: 0, forumPosts: 0, forumReplies: 0,
  offers: 0, appointments: 0, boards: 0
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function useCountUp(target: PlatformStats): PlatformStats {
  const [current, setCurrent] = useState<PlatformStats>(ZERO_STATS)
  const prevTarget = useRef<PlatformStats>(ZERO_STATS)
  const rafId = useRef<number>(0)

  useEffect(() => {
    if (target.members === 0) { setCurrent(ZERO_STATS); return }

    const startTime = performance.now()
    const duration = 1400
    const from = prevTarget.current
    const to = target
    const keys = Object.keys(to) as (keyof PlatformStats)[]

    function tick(now: number) {
      const t = Math.min((now - startTime) / duration, 1)
      const eased = easeOutCubic(t)
      const next = { ...ZERO_STATS } as PlatformStats
      for (const key of keys) {
        const startVal = from[key]
        const endVal = to[key]
        next[key] = Math.round(startVal + (endVal - startVal) * eased)
      }
      setCurrent(next)
      if (t < 1) rafId.current = requestAnimationFrame(tick)
    }

    rafId.current = requestAnimationFrame(tick)
    prevTarget.current = to
    return () => cancelAnimationFrame(rafId.current)
  }, [target])

  return current
}

export default function Home() {
  const [stats, setStats] = useState<PlatformStats>(ZERO_STATS)
  const [shops, setShops] = useState<FeaturedShop[]>([])
  const [products, setProducts] = useState<FeaturedProduct[]>([])
  const [requests, setRequests] = useState<PublicRequest[]>([])
  const [events, setEvents] = useState<FeaturedEvent[]>([])
  const [projects, setProjects] = useState<PublicProject[]>([])
  const [boards, setBoards] = useState<FeaturedBoard[]>([])
  const [blogs, setBlogs] = useState<FeaturedBlog[]>([])
  const [podcasts, setPodcasts] = useState<FeaturedPodcast[]>([])
  const [services, setServices] = useState<FeaturedService[]>([])
  const [pulseLoading, setPulseLoading] = useState(true)
  const [members, setMembers] = useState<RecentMember[]>([])
  const [trendingTags, setTrendingTags] = useState<{ tag: string; postCount: number; entities: { posts: number; products: number; events: number; forumPosts: number; groupPosts: number } }[]>([])
  const animatedStats = useCountUp(stats)

  useEffect(() => {
    // Single home-pulse call replaces ~12 parallel fetches (same payloads).
    fetch('/api/home-pulse')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d) return
        if (d.stats?.data) setStats(d.stats.data)
        const shops = d.shops?.data?.shops
        if (shops) setShops(shops.slice(0, 4))
        if (d.products?.items) setProducts(d.products.items)
        const reqList = d.requests?.items || d.requests?.data?.items || (Array.isArray(d.requests) ? d.requests : [])
        if (Array.isArray(reqList)) setRequests(reqList.slice(0, 4))
        if (d.hashtags?.data?.hashtags) setTrendingTags(d.hashtags.data.hashtags)
        const ev = d.events
        setEvents(Array.isArray(ev?.data) ? ev.data.slice(0, 4) : Array.isArray(ev) ? ev.slice(0, 4) : [])
        const proj = d.projects
        setProjects((Array.isArray(proj) ? proj : (proj?.data?.items || [])).slice(0, 4))
        const bo = d.boards
        setBoards(bo?.data?.boards || bo?.boards || [])
        const bl = d.blogs
        setBlogs((bl?.data?.blogs || []).slice(0, 4))
        const po = d.podcasts
        setPodcasts((po?.data?.podcasts || []).slice(0, 4))
        const se = d.services
        setServices((se?.data?.services || []).slice(0, 4))
        const me = d.members
        const mList = me?.data?.members || (Array.isArray(me) ? me : [])
        if (Array.isArray(mList)) setMembers(mList.slice(0, 6))
      })
      .catch(() => {})
      .finally(() => setPulseLoading(false))
  }, [])

  return (
    <div className={`${styles.landing} page-enter`}>
      <HeroSection />
      <StatsSection stats={animatedStats} />
      <StartHereSection />
      <PulseSection
        shops={shops}
        products={products}
        requests={requests}
        events={events}
        projects={projects}
        boards={boards}
        blogs={blogs}
        podcasts={podcasts}
        services={services}
        loadingShops={pulseLoading}
        loadingProducts={pulseLoading}
        loadingRequests={pulseLoading}
        loadingEvents={pulseLoading}
        loadingPlans={pulseLoading}
        loadingBoards={pulseLoading}
        loadingBlogs={pulseLoading}
        loadingPodcasts={pulseLoading}
        loadingServices={pulseLoading}
      />
      <HashtagSection tags={trendingTags} />
      <StepsSection />
      <FeaturesSection />
      <PassportSection />
      <HomeMap />
      <MemberSpotlightSection members={members} loading={pulseLoading} stats={animatedStats} />
      <CTASection memberCount={animatedStats.members} />
      <FeedbackSection />
      <HomeFooterSection />
      <HomeTourWrapper />
    </div>
  )
}
