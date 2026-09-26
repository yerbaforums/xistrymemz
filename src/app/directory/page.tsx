'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { SkeletonCard } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import styles from './page.module.css'
import AlphabeticalIndex from '@/components/AlphabeticalIndex'
import Breadcrumbs from '@/components/Breadcrumbs'
import HashtagChips from '@/components/HashtagChips'
import Avatar from '@/components/Avatar'
import DirectoryCardActions from '@/components/DirectoryCardActions'
import { haversineKm, formatDistance } from '@/lib/geo'
import { MapContainer, TileLayer, Popup } from '@/components/LeafletComponents'
import EntityMarker from '@/components/EntityMarker'
import type { IndexItem } from '@/components/AlphabeticalIndex'

interface DirItem {
  id: string; title: string; image: string | null
  url: string; meta?: string; type: string; itemType?: string; userId?: string
  category?: string
  extra?: string; location?: string; owner?: string
  ownerImage?: string | null
  hashtags?: string[]
  createdAt?: string
  latitude?: number | null
  longitude?: number | null
}

// Old-school phonebook: master list + color-coded sections.
// White = members, Yellow/Gold = businesses, Blue = events,
// Green = requests, Violet = projects.
const PHONEBOOK_SECTIONS = [
  { key: 'all', label: 'Master List', icon: '📋', types: [] as string[], blurb: 'Everything, searchable.', accent: '#64748b' },
  { key: 'white', label: 'White Pages', icon: '⬜', types: ['member'], blurb: 'Members — people.', accent: '#e2e8f0' },
  { key: 'yellow', label: 'Yellow Pages', icon: '🟨', types: ['shop', 'product', 'service', 'rental'], blurb: 'Businesses — shops, products, services, rentals.', accent: '#f59e0b' },
  { key: 'blue', label: 'Blue Pages', icon: '🟦', types: ['event'], blurb: 'Events — go out.', accent: '#3b82f6' },
  { key: 'green', label: 'Green Pages', icon: '🟩', types: ['request'], blurb: 'Requests — ask, fund, fulfill.', accent: '#22c55e' },
  { key: 'violet', label: 'Violet Pages', icon: '🟪', types: ['project', 'group', 'board'], blurb: 'Projects, groups & boards — build together.', accent: '#8b5cf6' },
] as const

type SectionKey = typeof PHONEBOOK_SECTIONS[number]['key']

const TYPE_TABS = [
  { key: 'all', label: 'All', icon: '📋' },
  { key: 'member', label: 'Members', icon: '👤' },
  { key: 'shop', label: 'Shops', icon: '🛍️' },
  { key: 'product', label: 'Products', icon: '📦' },
  { key: 'service', label: 'Services', icon: '🔧' },
  { key: 'rental', label: 'Rentals', icon: '🏠' },
  { key: 'event', label: 'Events', icon: '📅' },
  { key: 'project', label: 'Projects', icon: '🚀' },
  { key: 'request', label: 'Requests', icon: '📝' },
  { key: 'group', label: 'Groups', icon: '👥' },
  { key: 'board', label: 'Boards', icon: '📌' },
]

const TYPE_ICONS: Record<string, string> = {
  member: '👤', shop: '🛍️', product: '📦', service: '🔧', rental: '🏠',
  event: '📅', project: '🚀', request: '📝', group: '👥', board: '📌'
}

const SORT_OPTIONS = [
  { key: 'title', label: 'Name' },
  { key: 'newest', label: 'Newest' },
  { key: 'nearest', label: 'Nearest' },
]

export default function DirectoryPage() {
  const { data: session } = useSession()
  const [items, setItems] = useState<DirItem[]>([])
  const [categories, setCategories] = useState<Record<string, string[]>>({})
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState<SectionKey>('all')
  const [activeType, setActiveType] = useState('all')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('')
  const [sortBy, setSortBy] = useState('title')
  const [total, setTotal] = useState(0)
  // Passport locale (opt-in, privacy-safe: hidden passport disables it).
  const [passportLat, setPassportLat] = useState<number | null>(null)
  const [passportLng, setPassportLng] = useState<number | null>(null)
  const [passportRadius, setPassportRadius] = useState(50)
  const [passportHidden, setPassportHidden] = useState(false)
  const [nearMe, setNearMe] = useState(false)
  const [view, setView] = useState<'list' | 'map' | 'calendar'>('list')
  const [mapReady, setMapReady] = useState(false)
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [calDay, setCalDay] = useState<number | null>(null)

  // Leaflet assets load lazily for the map toggle (A-Z list needs none).
  useEffect(() => {
    if (view !== 'map' || mapReady) return
    if (typeof window !== 'undefined') {
      import('leaflet/dist/leaflet.css').catch(() => {})
      setMapReady(true)
    }
  }, [view, mapReady])

  // Deep-link ?section= + ?q=
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const s = params.get('section') as SectionKey | null
      if (s && PHONEBOOK_SECTIONS.some(x => x.key === s)) setSection(s)
      const q = params.get('q')
      if (q) { setSearch(q); setQuery(q) }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('section', section)
      if (query) url.searchParams.set('q', query)
      else url.searchParams.delete('q')
      window.history.replaceState({}, '', url.toString())
    } catch {}
  }, [section, query])

  // Passport home base for locale sort (private use only, never exposed).
  useEffect(() => {
    if (!session?.user) return
    fetch('/api/users/me')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        const u = d?.user
        if (u?.latitude != null && u?.longitude != null) {
          setPassportLat(u.latitude)
          setPassportLng(u.longitude)
        }
        if (u?.searchRadius) setPassportRadius(u.searchRadius)
      })
      .catch(() => {})
    fetch('/api/user/preferences')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.preferences?.privacy?.passportVisibility === 'hidden') {
          setPassportHidden(true)
          setNearMe(false)
        }
      })
      .catch(() => {})
  }, [session?.user])

  const sectionTypes = useMemo(() => {
    const s = PHONEBOOK_SECTIONS.find(x => x.key === section)
    return (s?.types ?? []) as string[]
  }, [section])

  // Fetch the narrowest type that covers the view (master list fetches all).
  const fetchType = useMemo(() => {
    if (activeType !== 'all') return activeType
    if (sectionTypes.length === 1) return sectionTypes[0]
    return 'all'
  }, [activeType, sectionTypes])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    const params = new URLSearchParams()
    if (fetchType !== 'all') params.set('type', fetchType)
    if (query) params.set('q', query)
    if (activeCategory) params.set('category', activeCategory)
    fetch(`/api/directory?${params}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        let list: DirItem[] = data.items || []
        // Phonebook section filter (client-side so master list stays one call).
        if (sectionTypes.length > 0) list = list.filter(i => sectionTypes.includes(i.type))
        if (activeType !== 'all') list = list.filter(i => i.type === activeType)
        setItems(list)
        if (data.categories) setCategories(data.categories)
        if (data.counts) setCounts(data.counts)
        setTotal(data.total ?? data.items?.length ?? 0)
      })
      .catch(err => { if (err?.name !== 'AbortError') setItems([]) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [fetchType, query, activeCategory, sectionTypes, activeType])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery(search)
  }

  const selectSection = (key: SectionKey) => {
    setSection(key)
    setActiveType('all')
    setActiveCategory('')
  }

  const typeCategories = activeType === 'all'
    ? Object.values(categories).flat().filter((v, i, a) => a.indexOf(v) === i)
    : (categories[activeType] || [])

  const visibleTypeTabs = useMemo(() => {
    if (sectionTypes.length === 0) return TYPE_TABS
    return TYPE_TABS.filter(t => t.key === 'all' || sectionTypes.includes(t.key))
  }, [sectionTypes])

  const distanceFor = (item: DirItem): number | null => {
    if (passportLat == null || passportLng == null) return null
    if (item.latitude == null || item.longitude == null) return null
    return haversineKm(passportLat, passportLng, item.latitude, item.longitude)
  }

  const sortedItems = useMemo(() => {
    let list = [...items]
    if (nearMe && passportLat != null && passportLng != null) {
      list = list.filter(i => {
        const d = i.latitude != null && i.longitude != null
          ? haversineKm(passportLat, passportLng, i.latitude, i.longitude)
          : null
        return d != null && d <= passportRadius
      })
    }
    if (sortBy === 'title') list.sort((a, b) => a.title.localeCompare(b.title))
    if (sortBy === 'newest') list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    if (sortBy === 'nearest') {
      list.sort((a, b) => {
        const da = a.latitude != null && a.longitude != null && passportLat != null && passportLng != null
          ? haversineKm(passportLat, passportLng, a.latitude, a.longitude) : Number.POSITIVE_INFINITY
        const db = b.latitude != null && b.longitude != null && passportLat != null && passportLng != null
          ? haversineKm(passportLat, passportLng, b.latitude, b.longitude) : Number.POSITIVE_INFINITY
        return da - db
      })
    }
    return list
  }, [items, sortBy, nearMe, passportLat, passportLng, passportRadius])

  const totalCount = activeType === 'all' && section === 'all'
    ? Object.values(counts).reduce((sum, n) => sum + n, 0)
    : (fetchType === 'all' ? sortedItems.length : (total || sortedItems.length))

  const itemById = useMemo(() => {
    const map = new Map<string, DirItem>()
    for (const item of sortedItems) map.set(`${item.type}-${item.id}`, item)
    return map
  }, [sortedItems])

  const indexItems: IndexItem[] = useMemo(() => sortedItems.map(item => ({
    id: `${item.type}-${item.id}`,
    label: item.title,
    sortKey: item.title,
  })), [sortedItems])

  function startProjectUrl(item: DirItem): string | null {
    if (item.type === 'request') return `/projects/new?fromRequest=${item.id}`
    if (item.type === 'group') return `/projects/new?fromGroup=${item.id}`
    return null
  }

  const activeSection = PHONEBOOK_SECTIONS.find(s => s.key === section)!
  const localeReady = passportLat != null && passportLng != null && !passportHidden
  const geoItems = useMemo(
    () => sortedItems.filter(i => i.latitude != null && i.longitude != null).slice(0, 100),
    [sortedItems]
  )
  const mapCenter: [number, number] = passportLat != null && passportLng != null
    ? [passportLat, passportLng]
    : geoItems.length > 0
      ? [geoItems[0].latitude!, geoItems[0].longitude!]
      : [20, 0]

  // Calendar view: events in the current result set by month.
  const calEvents = useMemo(
    () => sortedItems.filter(i => i.type === 'event' && i.createdAt),
    [sortedItems]
  )
  const calCells = useMemo(() => {
    const first = new Date(calMonth.y, calMonth.m, 1)
    const startDay = first.getDay()
    const days = new Date(calMonth.y, calMonth.m + 1, 0).getDate()
    const cells: (number | null)[] = [...Array(startDay).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [calMonth])
  const calKey = (day: number) => `${calMonth.y}-${String(calMonth.m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const calDayEvents = (day: number) => calEvents.filter(e => (e.createdAt || '').startsWith(calKey(day)))
  const calSelected = calDay != null ? calDayEvents(calDay) : []

  function renderCard(item: DirItem) {
    const accent = PHONEBOOK_SECTIONS.find(s => (s.types as readonly string[]).includes(item.type))?.accent
    const dist = distanceFor(item)
    return (
      <div key={`${item.type}-${item.id}`} className={styles.card} style={accent ? { borderTop: `3px solid ${accent}` } : undefined}>
        <Link href={item.url} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <div className={styles.cardImage}>
            {item.image ? <Image src={item.image} alt={item.title} width={400} height={96} style={{ objectFit: 'cover' }} loading="lazy" /> : <span>{TYPE_ICONS[item.type] || '📌'}</span>}
          </div>
          <div className={styles.cardInfo}>
            <h3>{item.title}</h3>
            <div className={styles.cardTags}>
              <span className={styles.cardType}>{TYPE_ICONS[item.type]} {item.type}</span>
              {item.category && <span className={styles.cardCategory}>{item.category}</span>}
              {dist != null && (sortBy === 'nearest' || nearMe) && (
                <span className={styles.cardCategory}>📍 {formatDistance(dist)}</span>
              )}
            </div>
            {item.meta && <div className={styles.cardMeta}>{item.meta}</div>}
            {item.extra && <div className={styles.cardExtra}>{item.extra}</div>}
            <HashtagChips tags={item.hashtags} max={3} small />
            {item.owner && (
              <div className={styles.cardOwner}>
                <Avatar src={item.ownerImage} name={item.owner} size={16} />
                {item.owner}
              </div>
            )}
          </div>
        </Link>
        {item.itemType && (
          <div style={{ padding: '0 10px 10px' }}>
            <DirectoryCardActions
              itemType={item.itemType}
              itemId={item.id}
              title={item.title}
              image={item.image}
              detailUrl={item.url}
              startProjectUrl={startProjectUrl(item)}
              location={item.location}
              eventDate={item.type === 'event' ? (item.createdAt || null) : null}
              userId={item.userId}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Directory' },
      ]} />
      <div className={styles.header}>
        <h1>📋 Directory</h1>
        <p>Master list + phonebook pages. {activeSection.blurb}</p>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Phonebook sections" style={{ marginBottom: 6 }}>
        {PHONEBOOK_SECTIONS.map(s => (
          <button
            key={s.key}
            role="tab"
            aria-selected={section === s.key}
            className={`${styles.tab} ${section === s.key ? styles.tabActive : ''}`}
            onClick={() => selectSection(s.key)}
            title={s.blurb}
            style={section === s.key ? { borderColor: s.accent } : undefined}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      <div className={styles.toolbar}>
        <form className={styles.searchWrap} onSubmit={handleSearch}>
          <input aria-label="Search directory" className={styles.searchInput} placeholder={`Search ${activeSection.label.toLowerCase()}...`} value={search} onChange={e => setSearch(e.target.value)} />
        </form>
        {typeCategories.length > 0 && (
          <select aria-label="Filter by category" className={styles.filterSelect} value={activeCategory} onChange={e => setActiveCategory(e.target.value)}>
            <option value="">All categories</option>
            {typeCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <select aria-label="Sort directory" className={styles.filterSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
        {session?.user && (
          <button
            type="button"
            className={styles.filterSelect}
            disabled={!localeReady}
            onClick={() => setNearMe(v => !v)}
            aria-pressed={nearMe}
            title={passportHidden ? 'Passport hidden — locale sort off' : localeReady ? `Within ${passportRadius}km of your passport` : 'Set your passport location to enable locale sort'}
            style={{ opacity: nearMe ? 1 : 0.8 }}
          >
            {nearMe ? '📍 Near Me ✓' : '📍 Near Me'}
          </button>
        )}
        <div role="group" aria-label="Directory view" style={{ display: 'flex', gap: 4 }}>
          {([
            { key: 'list', label: '📋 List', title: 'A-Z list' },
            { key: 'map', label: '🗺️ Map', title: 'See located results on a map' },
            { key: 'calendar', label: '📅 Cal', title: 'Events by date' },
          ] as const).map(v => (
            <button
              key={v.key}
              type="button"
              className={styles.filterSelect}
              onClick={() => setView(v.key)}
              aria-pressed={view === v.key}
              title={v.title}
              style={view === v.key ? { borderColor: 'var(--accent-primary)' } : undefined}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      {session?.user && !localeReady && (
        <div className={styles.metaRow}>
          <span>{passportHidden ? '🔒 Passport hidden — locale sort off. Your private discovery still works.' : 'Set your passport location to sort by locale.'} <Link href="/dashboard/passport">Open passport →</Link></span>
        </div>
      )}

      <div className={styles.tabs} role="tablist" aria-label="Directory types">
        {visibleTypeTabs.map(t => (
          <button
            key={t.key}
            role="tab"
            aria-selected={activeType === t.key}
            className={`${styles.tab} ${activeType === t.key ? styles.tabActive : ''}`}
            onClick={() => { setActiveType(t.key); setActiveCategory('') }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className={styles.metaRow}>
        <span>{sortedItems.length} result{sortedItems.length !== 1 ? 's' : ''} · {activeSection.label}{activeType !== 'all' ? ` · ${activeType}` : ''}{nearMe ? ` · near me` : ''}</span>
        <span className={styles.metaTotal}>{totalCount} listed</span>
      </div>

      {loading ? (
        <div className={styles.results}>
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : sortedItems.length === 0 ? (
        <EmptyState icon="📋" title="No results found" description="Try a different page, filter or search term" />
      ) : view === 'map' ? (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {geoItems.length === 0 ? (
            <EmptyState icon="🗺️" title="Nothing mappable here" description="These results have no locations yet — switch back to the list." />
          ) : (
            <div style={{ height: 440, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <MapContainer
                key={`${mapCenter[0]},${mapCenter[1]},${geoItems.length}`}
                center={mapCenter}
                zoom={passportLat != null || geoItems.length > 0 ? 5 : 2}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {passportLat != null && passportLng != null && !passportHidden && (
                  <EntityMarker type="MEMBER" highlighted position={[passportLat, passportLng]}>
                    <Popup>📍 Your passport</Popup>
                  </EntityMarker>
                )}
                {geoItems.map(item => (
                  <EntityMarker
                    key={`${item.type}-${item.id}`}
                    type={item.itemType === 'PROFILE' ? 'MEMBER' : (item.itemType || item.type.toUpperCase())}
                    position={[item.latitude!, item.longitude!]}
                  >
                    <Popup>
                      <Link href={item.url} style={{ fontWeight: 600 }}>{item.title}</Link>
                      <br />
                      <span style={{ fontSize: '0.75rem' }}>{TYPE_ICONS[item.type]} {item.type}{item.location ? ` · ${item.location}` : ''}</span>
                    </Popup>
                  </EntityMarker>
                ))}
              </MapContainer>
            </div>
          )}
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
            Showing up to {geoItems.length} located result{geoItems.length !== 1 ? 's' : ''} · hidden passports never appear as pins.
          </p>
        </div>
      ) : view === 'calendar' ? (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {calEvents.length === 0 ? (
            <EmptyState icon="📅" title="No dated events here" description="Try another page or search — or switch back to the list." />
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <button type="button" className={styles.filterSelect} onClick={() => { setCalMonth(v => ({ y: v.m === 0 ? v.y - 1 : v.y, m: v.m === 0 ? 11 : v.m - 1 })); setCalDay(null) }} aria-label="Previous month">←</button>
                <strong style={{ fontSize: '0.9rem' }}>{new Date(calMonth.y, calMonth.m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
                <button type="button" className={styles.filterSelect} onClick={() => { setCalMonth(v => ({ y: v.m === 11 ? v.y + 1 : v.y, m: v.m === 11 ? 0 : v.m + 1 })); setCalDay(null) }} aria-label="Next month">→</button>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{calEvents.length} event{calEvents.length !== 1 ? 's' : ''} in results</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>{d}</div>
                ))}
                {calCells.map((day, i) => {
                  const n = day != null ? calDayEvents(day).length : 0
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={day == null}
                      onClick={() => setCalDay(day === calDay ? null : day)}
                      aria-label={day != null ? `${calKey(day)}: ${n} events` : undefined}
                      style={{
                        aspectRatio: '1', borderRadius: 8, cursor: day == null ? 'default' : 'pointer',
                        border: day === calDay ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        background: n > 0 ? 'var(--bg-secondary)' : 'transparent',
                        color: 'var(--text-primary)', fontSize: '0.78rem', opacity: day == null ? 0 : 1,
                      }}
                    >
                      {day}
                      {n > 0 && <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--accent-primary)' }}>•{n}</span>}
                    </button>
                  )
                })}
              </div>
              {calDay != null && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {calSelected.length === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No events on {calKey(calDay)}.</p>}
                  {calSelected.map(e => (
                    <Link key={e.id} href={e.url} style={{ textDecoration: 'none', color: 'inherit', border: '1px solid var(--border-color)', borderRadius: 8, padding: '8px 12px' }}>
                      <strong style={{ fontSize: '0.85rem' }}>📅 {e.title}</strong>
                      {e.extra && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 8 }}>{e.extra}</span>}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <AlphabeticalIndex
          items={indexItems}
          renderCard={(idxItem) => {
            const found = itemById.get(idxItem.id)
            return found ? renderCard(found) : null
          }}
          sidebarTitle="Browse by Letter"
        />
      )}
    </div>
  )
}
