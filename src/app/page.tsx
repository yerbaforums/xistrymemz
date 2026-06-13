'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import styles from './page.module.css'
import HomeMap from '@/components/HomeMap'
import HeroSection from '@/components/home/HeroSection'
import StatsSection from '@/components/home/StatsSection'
import HashtagSection from '@/components/home/HashtagSection'
import PulseSection from '@/components/home/PulseSection'
import StepsSection from '@/components/home/StepsSection'
import FeaturesSection from '@/components/home/FeaturesSection'
import CTASection from '@/components/home/CTASection'
import PassportSection from '@/components/home/PassportSection'
import FeedbackSection from '@/components/home/FeedbackSection'
import HomeFooterSection from '@/components/home/HomeFooterSection'
import HomeTourWrapper from '@/components/HomeTourWrapper'
import type { PlatformStats, FeaturedShop, FeaturedProduct, PublicRequest, FeaturedEvent, PublicProject, FeaturedBoard } from '@/components/home/types'

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
  const [loadingShops, setLoadingShops] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [loadingBoards, setLoadingBoards] = useState(true)
  const [trendingTags, setTrendingTags] = useState<{ tag: string; postCount: number; entities: { posts: number; products: number; events: number; forumPosts: number; groupPosts: number } }[]>([])
  const animatedStats = useCountUp(stats)

  const fetchProducts = useCallback(async (type?: string) => {
    setLoadingProducts(true)
    try {
      const params = !type || type === 'all' ? 'limit=6' : `limit=6&type=${type}`
      const res = await fetch(`/api/products?${params}`)
      if (res.ok) {
        const data = await res.json()
        if (data?.items) setProducts(data.items)
      }
    } catch { } finally { setLoadingProducts(false) }
  }, [])

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data) setStats(d.data) })
      .catch(() => {})

    fetch('/api/shops')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data?.shops) setShops(d.data.shops.slice(0, 4)); setLoadingShops(false) })
      .catch(() => setLoadingShops(false))

    fetchProducts('all')

    fetch('/api/requests?isPublic=true&take=4')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const list = d?.items || d?.data?.items || (Array.isArray(d) ? d : [])
        if (Array.isArray(list)) setRequests(list.slice(0, 4))
        setLoadingRequests(false)
      })
      .catch(() => setLoadingRequests(false))

    fetch('/api/hashtags?mode=trending&limit=20')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data?.hashtags) setTrendingTags(d.data.hashtags) })
      .catch(() => {})

    fetch('/api/public/events')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setEvents(Array.isArray(data?.data) ? data.data.slice(0, 4) : Array.isArray(data) ? data.slice(0, 4) : []); setLoadingEvents(false) })
      .catch(() => setLoadingEvents(false))

    fetch('/api/projects?public=true')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.data?.items || [])
        setProjects(list.slice(0, 4)); setLoadingPlans(false)
      })
      .catch(() => setLoadingPlans(false))

    fetch('/api/boards?limit=4')
      .then(r => r.ok ? r.json() : { boards: [] })
      .then(data => { setBoards(data?.data?.boards || data?.boards || []); setLoadingBoards(false) })
      .catch(() => setLoadingBoards(false))
  }, [fetchProducts])

  return (
    <div className={`${styles.landing} page-enter`}>
      <HeroSection />
      <StatsSection stats={animatedStats} />
      <HashtagSection tags={trendingTags} />
      <PulseSection
        shops={shops}
        products={products}
        requests={requests}
        events={events}
        projects={projects}
        boards={boards}
        loadingShops={loadingShops}
        loadingProducts={loadingProducts}
        loadingRequests={loadingRequests}
        loadingEvents={loadingEvents}
        loadingPlans={loadingPlans}
        loadingBoards={loadingBoards}
        trendingTags={trendingTags}
      />
      <StepsSection />
      <FeaturesSection />
      <PassportSection />
      <HomeMap />
      <CTASection memberCount={animatedStats.members} />
      <FeedbackSection />
      <HomeFooterSection />
      <HomeTourWrapper />
    </div>
  )
}
