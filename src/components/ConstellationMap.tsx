'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import styles from './ConstellationMap.module.css'
import StarTooltip from './StarTooltip'
import OrbitPanel from './OrbitPanel'
import ConstellationControls, { type FilterOptions } from './ConstellationControls'
import type { ConstellationStar, ConstellationEdge, ConstellationCluster, EdgeType } from '@/lib/constellation'
import { EDGE_COLORS } from '@/lib/constellation'

interface ConstellationMapProps {
  stars?: ConstellationStar[]
  edges?: ConstellationEdge[]
  clusters?: ConstellationCluster[]
  width?: number
  height?: number
  interactive?: boolean
  onSelectStar?: (star: ConstellationStar) => void
  selectedStarId?: string | null
}

interface ViewState {
  scale: number
  offsetX: number
  offsetY: number
}

const BACKGROUND_STARS = 140

export default function ConstellationMap({
  stars: propStars,
  edges: propEdges,
  clusters: propClusters,
  width: fixedWidth,
  height: fixedHeight,
  interactive = true,
  onSelectStar,
  selectedStarId,
}: ConstellationMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [stars, setStars] = useState<ConstellationStar[]>(propStars || [])
  const [edges, setEdges] = useState<ConstellationEdge[]>(propEdges || [])
  const [clusters, setClusters] = useState<ConstellationCluster[]>(propClusters || [])
  const [hoveredStar, setHoveredStar] = useState<ConstellationStar | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)
  const [selected, setSelected] = useState<ConstellationStar | null>(null)
  const [filters, setFilters] = useState<FilterOptions>({})
  const [view, setView] = useState<ViewState>({ scale: 1, offsetX: 0, offsetY: 0 })
  const [isLoaded, setIsLoaded] = useState(false)
  const imageCache = useRef(new Map<string, HTMLImageElement>())

  const [prevProps, setPrevProps] = useState({ stars: propStars, edges: propEdges, clusters: propClusters })
  if (prevProps.stars !== propStars || prevProps.edges !== propEdges || prevProps.clusters !== propClusters) {
    setPrevProps({ stars: propStars, edges: propEdges, clusters: propClusters })
    if (propStars) setStars(propStars)
    if (propEdges) setEdges(propEdges)
    if (propClusters) setClusters(propClusters)
  }

  const getCachedImage = useCallback((src: string): HTMLImageElement | null => {
    let img = imageCache.current.get(src)
    if (!img) {
      img = new Image()
      img.src = src
      imageCache.current.set(src, img)
    }
    return img.complete && img.naturalWidth > 0 ? img : null
  }, [])

  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsLoaded(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const resetView = useCallback(() => {
    setView({ scale: 1, offsetX: 0, offsetY: 0 })
  }, [])

  const applyTransform = useCallback((point: { x: number; y: number }) => {
    const { scale, offsetX, offsetY } = view
    const canvas = canvasRef.current
    if (!canvas) return point
    const rect = canvas.getBoundingClientRect()
    const cx = rect.width / 2
    const cy = rect.height / 2
    return {
      x: cx + (point.x - 800) * scale + offsetX,
      y: cy + (point.y - 500) * scale + offsetY,
    }
  }, [view])

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = '#070b1a'
    ctx.fillRect(0, 0, w, h)

    const twinkle = (Date.now() / 1500) % (Math.PI * 2)
    for (let i = 0; i < BACKGROUND_STARS; i++) {
      const sx = ((i * 137 + 50) % w + w) % w
      const sy = ((i * 271 + 29) % h + h) % h
      const rng = (i * 0.618 + 0.1) % 1
      const alpha = 0.15 + 0.25 * rng * (0.75 + 0.25 * Math.sin(twinkle + i))
      ctx.beginPath()
      ctx.arc(sx, sy, 0.6 + rng * 1.2, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
      ctx.fill()
    }
  }, [])

  const drawNebula = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const gradient = ctx.createRadialGradient(w * 0.2, h * 0.25, 0, w * 0.2, h * 0.25, Math.max(w, h) * 0.5)
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.04)')
    gradient.addColorStop(0.5, 'rgba(0, 217, 255, 0.02)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)

    const gradient2 = ctx.createRadialGradient(w * 0.85, h * 0.75, 0, w * 0.85, h * 0.75, Math.max(w, h) * 0.45)
    gradient2.addColorStop(0, 'rgba(139, 92, 246, 0.04)')
    gradient2.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = gradient2
    ctx.fillRect(0, 0, w, h)
  }, [])

  const drawClusters = useCallback((ctx: CanvasRenderingContext2D) => {
    for (const cluster of clusters) {
      const pos = applyTransform({ x: cluster.centerX, y: cluster.centerY })
      ctx.save()
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 30 + cluster.memberCount * 3, 0, Math.PI * 2)
      ctx.strokeStyle = cluster.type === 'GROUP' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.12)'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.strokeStyle = cluster.type === 'GROUP' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(245, 158, 11, 0.2)'
      ctx.setLineDash([4, 6])
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()

      const label = cluster.label.length > 26 ? cluster.label.slice(0, 24) + '…' : cluster.label
      const fontSize = 10
      ctx.font = `600 ${fontSize}px system-ui, sans-serif`
      const metrics = ctx.measureText(label)
      const labelW = metrics.width + 14
      const labelY = pos.y + 45
      ctx.fillStyle = cluster.type === 'GROUP' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)'
      ctx.beginPath()
      ctx.roundRect(pos.x - labelW / 2, labelY - 11, labelW, 22, 11)
      ctx.fill()
      ctx.strokeStyle = cluster.type === 'GROUP' ? 'rgba(34, 197, 94, 0.35)' : 'rgba(245, 158, 11, 0.3)'
      ctx.stroke()
      ctx.fillStyle = cluster.type === 'GROUP' ? '#22c55e' : '#f59e0b'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(cluster.type === 'GROUP' ? '👥' : '📍', pos.x - labelW / 2 + 10, labelY)
      ctx.textAlign = 'left'
      ctx.fillText(label, pos.x - labelW / 2 + 18, labelY)

      ctx.font = '600 9px system-ui, sans-serif'
      ctx.fillStyle = 'rgba(203, 213, 225, 0.7)'
      ctx.textAlign = 'center'
      ctx.fillText(` ${cluster.memberCount} ${cluster.memberCount === 1 ? 'member' : 'members'}`, pos.x + labelW / 2 + 30, labelY)
      ctx.textAlign = 'left'
    }
  }, [clusters, applyTransform])

  const drawEdges = useCallback((ctx: CanvasRenderingContext2D) => {
    const connectedIds = new Set<string>()
    for (const edge of edges) {
      connectedIds.add(edge.from)
      connectedIds.add(edge.to)
    }
    const activeIds = hoveredStar
      ? new Set([hoveredStar.id, ...edges.filter(e => e.from === hoveredStar.id || e.to === hoveredStar.id).map(e => e.from === hoveredStar.id ? e.to : e.from)])
      : null

    for (const edge of edges) {
      const a = stars.find(s => s.id === edge.from)
      const b = stars.find(s => s.id === edge.to)
      if (!a || !b) continue

      const pa = applyTransform({ x: a.x, y: a.y })
      const pb = applyTransform({ x: b.x, y: b.y })

      const isDimmed = hoveredStar && activeIds && (!activeIds.has(a.id) || !activeIds.has(b.id))
      const alphaBase = edge.strength * (edge.type === 'CONNECTION' ? 0.55 : edge.type === 'GROUP' ? 0.3 : 0.18)
      const alpha = isDimmed ? alphaBase * 0.15 : alphaBase

      ctx.beginPath()
      ctx.moveTo(pa.x, pa.y)
      ctx.lineTo(pb.x, pb.y)
      ctx.strokeStyle = EDGE_COLORS[edge.type]
      ctx.globalAlpha = alpha
      ctx.lineWidth = 0.5 + edge.strength * 0.7
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }, [edges, stars, hoveredStar, applyTransform])

  const drawStar = useCallback((ctx: CanvasRenderingContext2D, star: ConstellationStar, isHovered: boolean, isHighlighted: boolean) => {
    const pos = applyTransform({ x: star.x, y: star.y })
    const r = star.radius * view.scale + (isHovered ? 4 : 0)
    const pulse = star.active ? 0.10 + 0.05 * Math.sin(Date.now() / 800) : 0

    ctx.save()

    if (isHighlighted) {
      ctx.shadowColor = 'rgba(0, 217, 255, 0.8)'
      ctx.shadowBlur = 16
    } else if (star.active) {
      ctx.shadowColor = 'rgba(0, 217, 255, 0.4)'
      ctx.shadowBlur = 10 + pulse * 20
    } else if (star.lookingForCollaborators) {
      ctx.shadowColor = 'rgba(99, 102, 241, 0.4)'
      ctx.shadowBlur = 8
    }

    if (star.lookingForCollaborators && !isHovered) {
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, (r + 5) * (0.95 + 0.08 * Math.sin(Date.now() / 600)), 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    ctx.beginPath()
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2)

    if (star.image) {
      const img = getCachedImage(star.image)
      if (img) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        const size = r * 2
        ctx.drawImage(img, pos.x - r, pos.y - r, size, size)
        ctx.restore()
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2)
      }
    }

    const grad = ctx.createRadialGradient(pos.x - r * 0.3, pos.y - r * 0.3, r * 0.1, pos.x, pos.y, r)
    grad.addColorStop(0, '#b3ecff')
    grad.addColorStop(0.5, isHighlighted ? '#4dc8ff' : '#00d9ff')
    grad.addColorStop(1, star.active ? 'rgba(0, 217, 255, 0.5)' : 'rgba(100, 150, 200, 0.3)')
    ctx.fillStyle = grad
    ctx.fill()

    ctx.lineWidth = 1.2
    ctx.strokeStyle = star.active ? 'rgba(0, 217, 255, 0.9)' : 'rgba(140, 180, 220, 0.5)'
    ctx.stroke()

    ctx.shadowBlur = 0
    ctx.restore()

    if (view.scale > 0.6) {
      ctx.font = `${isHovered ? 600 : 400} ${isHovered ? 12 : 10}px system-ui, sans-serif`
      ctx.fillStyle = isHovered ? 'rgba(255, 255, 255, 0.95)' : 'rgba(203, 213, 225, 0.7)'
      ctx.textAlign = 'center'
      const name = star.title.length > 16 ? star.title.slice(0, 15) + '…' : star.title
      ctx.fillText(name, pos.x, pos.y + r + 14)
      ctx.textAlign = 'left'
    }
  }, [view, applyTransform, getCachedImage])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)
    drawBackground(ctx, w, h)
    drawNebula(ctx, w, h)
    drawClusters(ctx)
    drawEdges(ctx)

    const activeIds = hoveredStar
      ? new Set([hoveredStar.id, ...edges.filter(e => e.from === hoveredStar.id || e.to === hoveredStar.id).map(e => e.from === hoveredStar.id ? e.to : e.from)])
      : null

    for (const star of stars) {
      const isHovered = hoveredStar?.id === star.id
      const isHighlighted = selectedStarId === star.id
      const isDimmed = hoveredStar && activeIds && !activeIds.has(star.id)
      if (isDimmed) {
        ctx.save()
        ctx.globalAlpha *= 0.2
        drawStar(ctx, star, isHovered, isHighlighted)
        ctx.restore()
      } else {
        drawStar(ctx, star, isHovered, isHighlighted)
      }
    }
  }, [stars, edges, hoveredStar, selectedStarId, drawBackground, drawNebula, drawClusters, drawEdges, drawStar])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const parent = containerRef.current
      if (!parent) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = parent.clientWidth * dpr
      canvas.height = parent.clientHeight * dpr
      canvas.style.width = `${parent.clientWidth}px`
      canvas.style.height = `${parent.clientHeight}px`
      const ctx = canvas.getContext('2d')
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const getStarAt = useCallback((clientX: number, clientY: number): ConstellationStar | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const mx = clientX - rect.left
    const my = clientY - rect.top

    let hit: ConstellationStar | null = null
    let bestDist = Infinity
    for (const star of stars) {
      const pos = applyTransform({ x: star.x, y: star.y })
      const r = star.radius * view.scale + 6
      const dx = pos.x - mx
      const dy = pos.y - my
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < r && dist < bestDist) {
        bestDist = dist
        hit = star
      }
    }
    return hit
  }, [stars, view, applyTransform])

  const lastHover = useRef<ConstellationStar | null>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const star = getStarAt(e.clientX, e.clientY)
    if (star !== lastHover.current) {
      lastHover.current = star
      setHoveredStar(star)
      if (star) {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (rect) {
          setHoverPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          })
        }
      }
    }
  }, [getStarAt])

  const handleMouseLeave = useCallback(() => {
    lastHover.current = null
    setHoveredStar(null)
    setHoverPos(null)
  }, [])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const star = getStarAt(e.clientX, e.clientY)
    if (star) {
      setSelected(star)
      onSelectStar?.(star)
      setHoveredStar(null)
      setHoverPos(null)
    } else if (!e.metaKey) {
      setSelected(null)
      onSelectStar?.(null as unknown as ConstellationStar)
    }
  }, [getStarAt, onSelectStar])

  const filterStars = useCallback((starsToFilter: ConstellationStar[]) => {
    let result = starsToFilter
    if (filters.collaboratorsOnly) {
      result = result.filter(s => s.lookingForCollaborators)
    }
    if (filters.activeOnly) {
      result = result.filter(s => s.active)
    }
    if (filters.sharedInterestOnly) {
      result = result.filter(s => s.sharedInterestCount > 0 || s.connectionStrength > 0)
    }
    return result
  }, [filters])

  const zoomBy = useCallback((factor: number) => {
    setView(prev => {
      const nextScale = Math.max(0.25, Math.min(3, prev.scale * factor))
      return { ...prev, scale: nextScale }
    })
  }, [])

  const handleEdgeFilterChange = useCallback((edgeTypes: EdgeType[]) => {
    if (!propEdges) return
    setEdges(edgeTypes.length === 0 ? propEdges : propEdges.filter(e => edgeTypes.includes(e.type)))
  }, [propEdges])

  const isTouch = useRef(false)
  const lastTouchDist = useRef(0)

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    isTouch.current = true
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy)
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (lastTouchDist.current > 0) {
        const factor = dist / lastTouchDist.current
        setView(prev => ({
          ...prev,
          scale: Math.max(0.25, Math.min(3, prev.scale * factor)),
        }))
      }
      lastTouchDist.current = dist
    } else if (e.touches.length === 1 && lastTouchDist.current === 0) {
      e.preventDefault()
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = 0
  }, [])

  const fullStars = filterStars(stars)

  const containerStyle = fixedWidth && fixedHeight
    ? { width: fixedWidth, height: fixedHeight }
    : { width: '100%', height: '100%' }

  const selectedStar = selected || (selectedStarId ? stars.find(s => s.id === selectedStarId) || null : null)

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${isLoaded ? styles.loaded : ''}`}
      style={containerStyle as React.CSSProperties}
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role={interactive ? 'application' : 'img'}
        aria-label={`Constellation map showing ${fullStars.length} members`}
      />

      {fullStars.length === 0 && (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🌌</span>
          <p>No members match these filters</p>
        </div>
      )}

      {hoveredStar && interactive && hoverPos && (
        <StarTooltip
          star={hoveredStar}
          x={hoverPos.x}
          y={hoverPos.y}
        />
      )}

      {interactive && (
        <ConstellationControls
          onReset={resetView}
          onZoomIn={() => zoomBy(1.25)}
          onZoomOut={() => zoomBy(0.8)}
          onEdgeFilterChange={handleEdgeFilterChange}
          onFilterChange={setFilters}
        />
      )}

      {selectedStar && interactive && (
        <OrbitPanel
          star={selectedStar}
          onClose={() => {
            setSelected(null)
            onSelectStar?.(null as unknown as ConstellationStar)
          }}
        />
      )}
    </div>
  )
}