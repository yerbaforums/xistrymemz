'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

export default function Help() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  const faqs = [
    {
      question: 'What is XistrYmemZ?',
      answer: 'XistrYmemZ is a community platform where creators, developers, and community members can collaborate on projects. Create detailed plans, submit requests to help complete them, and track your progress with powerful tools.'
    },
    {
      question: 'How do I get started?',
      answer: 'Sign up for a free account, complete your profile, and start exploring projects. You can browse public plans, join groups, or create your own project plan.'
    },
    {
      question: 'Is it free to use?',
      answer: 'Yes, XistrYmemZ is free to use. We offer optional premium memberships for additional features, but all core functionality is available at no cost.'
    },
    {
      question: 'How do I create a plan?',
      answer: 'After logging in, navigate to the Plans section and click "New Plan". Fill in the details including title, description, goals, milestones, and funding options if needed.'
    },
    {
      question: 'How do requests work?',
      answer: 'Requests are tasks that need to be completed within a project. You can browse public requests, submit your work, and earn recognition for helping complete projects.'
    },
    {
      question: 'How do I join a group?',
      answer: 'Visit the Groups section to browse available groups. Click on any group to view its details and request to join. Group admins will approve your request.'
    },
    {
      question: 'Can I sell products or services?',
      answer: 'Yes! You can set up a shop to sell products and services to the community. Visit the Shop section after logging in to get started.'
    },
    {
      question: 'How do events work?',
      answer: 'Community members can create and host events. Visit the Events section to see upcoming events or create your own.'
    },
    {
      question: 'What are schools?',
      answer: 'Schools allow you to create educational content and courses for the community. Share your knowledge and help others learn new skills.'
    },
    {
      question: 'How do I report inappropriate content?',
      answer: 'If you see content that violates our community guidelines, please contact us through the Contact page or use the reporting feature available on each piece of content.'
    },
    {
      question: 'How can I contact support?',
      answer: 'You can reach our support team through the Contact page. We aim to respond within 24-48 hours.'
    },
    {
      question: 'How do I reset my password?',
      answer: 'Go to the Login page and click "Forgot Password". Enter your email address and follow the instructions sent to your inbox.'
    }
  ]

  const guides = [
    { title: 'Getting Started', description: 'Learn the basics of using XistrYmemZ', link: '/about' },
    { title: 'Creating Plans', description: 'How to create and manage project plans', link: '/plans' },
    { title: 'Submitting Requests', description: 'Guide to requesting help on projects', link: '/requests' },
    { title: 'Joining Groups', description: 'Find and join community groups', link: '/groups' },
    { title: 'Setting Up Shop', description: 'Create your own store', link: '/shop/setup' },
    { title: 'Hosting Events', description: 'Create and manage community events', link: '/events' }
  ]

  return (
    <div className={styles.page}>
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
