'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import Breadcrumbs from '@/components/Breadcrumbs'

export default function Help() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  const faqs = [
    {
      question: 'What is XistrYmemZ?',
      answer: 'XistrYmemZ is a cooperative community platform where you can create projects, offer services, buy and sell in the marketplace, teach skills, host events, and connect with others — all in one place.'
    },
    {
      question: 'How do I get started?',
      answer: 'Sign up for a free account, complete your profile during onboarding, and start exploring. Browse public projects, discover services, join groups, or create your own content.'
    },
    {
      question: 'Is XistrYmemZ free?',
      answer: 'Yes, all core features are free — project planning, service listings, events, community groups, messaging, video chat, and more. Some creators may charge for services or products, but the platform itself is free to use.'
    },
    {
      question: 'How do I create a project plan?',
      answer: 'Go to your Dashboard, then Projects, and click "New Project". Add goals, milestones, and resources. Share your project publicly to attract collaborators and supporters.'
    },
    {
      question: 'How do services work?',
      answer: 'List your skills as a service — guitar lessons, web design, tutoring, anything. Set your rates, availability, and appointment settings. Others can book appointments with you directly through the platform.'
    },
    {
      question: 'How do appointments work?',
      answer: 'When a service provider enables appointments, you can book a time slot directly from their service page. The planner in your dashboard tracks all your upcoming appointments and events.'
    },
    {
      question: 'What is Video Chat?',
      answer: 'Video Chat lets you create or join video rooms for face-to-face collaboration, remote lessons, consultations, or social calls. Share your screen, mute your mic, or turn off your camera as needed.'
    },
    {
      question: 'How do I sell products?',
      answer: 'Set up your shop from the Dashboard to list products. Add images, pricing, and descriptions. Buyers can make offers through the barter system or purchase directly when checkout is enabled.'
    },
    {
      question: 'What is the barter/offer system?',
      answer: 'Instead of fixed pricing, you can accept offers on requests and products. Other members can propose trades, counter-offers, or monetary bids. Both parties agree before completing the transaction.'
    },
    {
      question: 'How do hashtags work?',
      answer: 'Use hashtags (#example) in your project descriptions, service listings, and posts. Follow hashtags to see related content in your feed. Trending hashtags help you discover popular topics.'
    },
    {
      question: 'How do I share content?',
      answer: 'Every project, service, product, event, and request has a Share section. Copy the link, share natively on your device, post to social media, or share directly to your XistrYmemZ feed.'
    },
    {
      question: 'What are schools?',
      answer: 'Schools let you create educational content — articles, tutorials, courses, and video lessons. Set up your school, organize content, and grow a following of students.'
    },
    {
      question: 'How do rentals work?',
      answer: 'List items for rent with daily, weekly, or monthly pricing, security deposits, and availability settings. Renters can browse available items and send booking requests.'
    },
    {
      question: 'How do I join a group?',
      answer: 'Visit the Community section, browse Groups, and request to join any that interest you. Group admins approve requests. Groups have their own forums and shared content.'
    },
    {
      question: 'How do I report content?',
      answer: 'If you see content that violates our community guidelines, use the contact page to report it. Include the link and a description of the issue.'
    },
    {
      question: 'Is XistrYmemZ ad-free?',
      answer: 'Yes, completely. We never show ads, sponsored content, or promoted posts. The platform is funded through optional community donations, not by selling your attention to advertisers.'
    },
    {
      question: 'Does XistrYmemZ sell my data?',
      answer: 'Never. Your personal data, content, messages, and activity are never sold, shared, or traded to third parties. We do not have data brokers, advertising partnerships, or third-party analytics that profile you. Read our full Privacy Policy for details.'
    },
    {
      question: 'Is my content used to train AI?',
      answer: 'No. XistrYmemZ is an AI-free platform. We do not scrape, train AI models on, or feed your content into any machine learning system. Everything on the platform is created by real people and stays under your control.'
    },
    {
      question: 'Does XistrYmemZ use algorithms to manipulate my feed?',
      answer: 'No. We don\'t use algorithms to favor or suppress content. Your feed shows posts from people and hashtags you actually follow, in chronological order. What you see is determined by your choices, not by engagement-maximizing algorithms.'
    },
    {
      question: 'Does XistrYmemZ shadowban users?',
      answer: 'Absolutely not. We don\'t shadowban, throttle, or secretly reduce anyone\'s reach. If your content violates our terms, you\'ll be notified directly. Full transparency — always.'
    },
    {
      question: 'Does XistrYmemZ censor content?',
      answer: 'We don\'t censor legal content or suppress viewpoints. Content is only removed if it violates our Terms of Service (illegal material, harassment, spam, etc.). The community sets its own norms through groups and forums. Your voice matters.'
    },
    {
      question: 'How do I reset my password?',
      answer: 'Go to the Login page and click "Forgot Password". Enter your email address and follow the instructions sent to your inbox.'
    }
  ]

  const guides = [
    { title: 'Getting Started', description: 'Set up your profile and explore the platform', link: '/onboarding' },
    { title: 'Creating Projects', description: 'Plan, organize, and track projects', link: '/projects/new' },
    { title: 'Offering Services', description: 'List your skills and accept appointments', link: '/dashboard/services' },
    { title: 'Using Video Chat', description: 'Set up and join video rooms', link: '/dashboard/video' },
    { title: 'Managing Appointments', description: 'Track bookings and availability', link: '/dashboard/appointments' },
    { title: 'Setting Up Shop', description: 'Create and manage your storefront', link: '/shop/setup' },
    { title: 'Hosting Events', description: 'Plan and host community events', link: '/events' },
    { title: 'Creating Requests', description: 'Ask for help and accept offers', link: '/requests' },
    { title: 'Hashtags & Discovery', description: 'Follow hashtags and find trending topics', link: '/hashtags' },
    { title: 'Schools & Teaching', description: 'Create educational content', link: '/schools' },
  ]

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Help' },
      ]} />
      <div className={styles.container}>
        <section className={styles.hero}>
          <h1>Help Center</h1>
          <p className={styles.heroSubtitle}>
            Find answers to common questions and learn how to make the most of XistrYmemZ
          </p>
        </section>

        <section className={styles.section}>
          <h2>Quick Guides</h2>
          <div className={styles.guides}>
            {guides.map((guide, index) => (
              <Link key={index} href={guide.link} className={styles.guideCard}>
                <h3>{guide.title}</h3>
                <p>{guide.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2>Frequently Asked Questions</h2>
          <div className={styles.faqList}>
            {faqs.map((faq, index) => (
              <div key={index} className={styles.faqItem}>
                <button
                  className={styles.faqQuestion}
                  onClick={() => toggleFaq(index)}
                  aria-expanded={openFaq === index}
                >
                  <span>{faq.question}</span>
                  <span className={styles.faqIcon}>{openFaq === index ? '−' : '+'}</span>
                </button>
                {openFaq === index && (
                  <div className={styles.faqAnswer}>
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2>Can&apos;t Find What You&apos;re Looking For?</h2>
          <p className={styles.contactText}>
            If you need more help, feel free to reach out to our support team.
          </p>
          <div className={styles.contactLinks}>
            <Link href="/contact" className={styles.contactBtn}>Contact Us</Link>
            <Link href="/about" className={styles.aboutBtn}>About & Getting Started</Link>
          </div>
        </section>
      </div>
    </div>
  )
}