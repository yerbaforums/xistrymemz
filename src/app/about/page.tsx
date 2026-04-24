'use client'

import Link from 'next/link'
import styles from './page.module.css'

export default function About() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <img src="/logo.png" alt="XistrYmemZ" className={styles.logo} />
        <h1>XistrYmemZ</h1>
        <p>A community platform for planning, requesting, and completing projects together.</p>
      </section>

      <section className={styles.content}>
        <div className={styles.block}>
          <h2>What we do</h2>
          <p>
            We connect creators, developers, and community members to collaborate on projects.
            Create plans, submit requests, and track progress — together.
          </p>
        </div>

        <div className={styles.block}>
          <h2>Get started</h2>
          <div className={styles.links}>
            <Link href="/auth/register">Create account</Link>
            <Link href="/plans/public">Browse projects</Link>
            <Link href="/community">Join community</Link>
          </div>
        </div>

        <div className={styles.block}>
          <h2>Support</h2>
          <p>Open source. Built with Next.js.</p>
          <div className={styles.links}>
            <Link href="/help">Help center</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
      </section>
    </div>
  )
}