'use client'

import { useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import styles from './HeroSection.module.css'

export default function HeroSection() {
  const t = useTranslations('home')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let w = canvas.width = canvas.offsetWidth
    let h = canvas.height = canvas.offsetHeight

    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = []
    const count = Math.min(80, Math.floor((w * h) / 12000))

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        a: Math.random() * 0.5 + 0.2,
      })
    }

    const lines: { x1: number; y1: number; x2: number; y2: number; a: number }[] = []

    function draw() {
      if (!ctx) return
      ctx.clearRect(0, 0, w, h)
      lines.length = 0

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h
        if (p.y > h) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0, 217, 255, ${p.a})`
        ctx.fill()
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            const a = (1 - dist / 120) * 0.15
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(0, 217, 255, ${a})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      animId = requestAnimationFrame(draw)
    }

    const onResize = () => {
      w = canvas.width = canvas.offsetWidth
      h = canvas.height = canvas.offsetHeight
    }
    window.addEventListener('resize', onResize)
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <section className={styles.hero}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.heroGradient} />
      <div className={styles.heroContent}>
        <div className={styles.logo}>
          <img src="/logo.png" alt="XistrYmemZ" />
          <span>XistrYmemZ</span>
        </div>
        <h1 className={styles.title}>
          {t('heroTitlePre')}<span className={styles.accent}>{t('heroTitleAccent')}</span>{t('heroTitlePost')}
        </h1>
        <p className={styles.subtitle}>
          {t('heroSubtitle')}
        </p>
        <div className={styles.actions}>
          <Link href="/auth/register" className={styles.btnPrimary}>
            {t('heroCta')} <span className={styles.arrow}>→</span>
          </Link>
          <Link href="/shops" className={styles.btnSecondary}>
            {t('heroBrowseShops')}
          </Link>
          <Link href="/directory" className={styles.btnSecondary}>
            📋 {t('heroBrowseDirectory')}
          </Link>
          <Link href="/dashboard/passport" className={styles.btnSecondary}>
            🌍 Passport
          </Link>
          <Link href="/about" className={styles.btnSecondary}>
            {t('heroLearnMore')}
          </Link>
        </div>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            placeholder={t('heroSearchPlaceholder')}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                window.location.href = `/search?q=${encodeURIComponent((e.target as HTMLInputElement).value.trim())}`
              }
            }}
          />
        </div>
        <div className={styles.heroStats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{t('statOpenSourceValue')}</span>
            <span className={styles.statLabel}>{t('statOpenSourceLabel')}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{t('statFreeForeverValue')}</span>
            <span className={styles.statLabel}>{t('statFreeForeverLabel')}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{t('statAdFreeValue')}</span>
            <span className={styles.statLabel}>{t('statAdFreeLabel')}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{t('statNoDataSoldValue')}</span>
            <span className={styles.statLabel}>{t('statNoDataSoldLabel')}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{t('statAiFreeValue')}</span>
            <span className={styles.statLabel}>{t('statAiFreeLabel')}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
