'use client'

import { useState, useEffect } from 'react'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import styles from './TestimonialsSection.module.css'

const TESTIMONIALS = [
  {
    quote: 'This platform completely changed how I collaborate. The ability to create plans, track milestones, and rally support all in one place is incredible.',
    author: 'Alex Chen',
    role: 'Project Lead',
  },
  {
    quote: 'The cooperative model is exactly what the internet needs. Everyone contributes, everyone benefits. It feels like building something meaningful together.',
    author: 'Sarah Mitchell',
    role: 'Community Organizer',
  },
  {
    quote: 'I started my shop here and within weeks had my first international customer. The crypto payment system makes cross-border transactions seamless.',
    author: 'Marcus Johnson',
    role: 'Shop Owner',
  },
  {
    quote: 'The Earth Passport system gives me confidence when working with new collaborators. Verified identities and reputation scores make trust built-in.',
    author: 'Yuki Tanaka',
    role: 'Freelance Developer',
  },
]

export default function TestimonialsSection() {
  const { ref, visible } = useScrollReveal()
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % TESTIMONIALS.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const t = TESTIMONIALS[current]

  return (
    <section ref={ref} className={`${styles.section} ${visible ? styles.visible : ''}`}>
      <h2 className={styles.sectionTitle}>Community Voices</h2>
      <p className={styles.sectionSubtitle}>What our members are saying</p>
      <div className={styles.carousel}>
        <div key={current} className={styles.card}>
          <span className={styles.quoteIcon}>&ldquo;</span>
          <p className={styles.quote}>{t.quote}</p>
          <div className={styles.author}>
            <strong>{t.author}</strong>
            <span className={styles.role}>{t.role}</span>
          </div>
        </div>
        <div className={styles.dots}>
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
              onClick={() => setCurrent(i)}
              aria-label={`Testimonial ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
