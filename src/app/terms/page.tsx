'use client'

import Link from 'next/link'
import styles from './page.module.css'

export default function Terms() {
  return (
    <div className={styles.page}>
      <section className={styles.content}>
        <h1>Terms of Service</h1>
        <p className={styles.date}>Last updated: January 1, 2025</p>

        <div className={styles.section}>
          <h2>Acceptance of Terms</h2>
          <p>
            By accessing and using XistrYmemZ, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, you may not use the platform.
          </p>
        </div>

        <div className={styles.section}>
          <h2>Use License</h2>
          <p>
            Permission is granted to use XistrYmemZ for personal and commercial purposes in accordance with these terms. You may not redistribute, reverse engineer, or create derivative works from the platform itself.
          </p>
        </div>

        <div className={styles.section}>
          <h2>User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate and complete information when creating your account and to update it as needed. You must be at least 13 years old to use this platform.
          </p>
        </div>

        <div className={styles.section}>
          <h2>User Conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Violate any laws or regulations</li>
            <li>Infringe upon intellectual property rights of others</li>
            <li>Post harmful, offensive, harassing, or illegal content</li>
            <li>Attempt to gain unauthorized access to our systems or other users&apos; accounts</li>
            <li>Use the platform for spam, phishing, or fraudulent activities</li>
            <li>Create multiple accounts for abusive purposes</li>
            <li>Interfere with the proper functioning of the platform</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2>Content</h2>
          <p>
            You retain ownership of content you create on our platform. By posting content, you grant us a non-exclusive, royalty-free license to display, distribute, and promote it within the platform. You are solely responsible for the content you post and must have the rights to share it.
          </p>
        </div>

        <div className={styles.section}>
          <h2>Marketplace &amp; Services</h2>
          <p>
            XistrYmemZ provides tools for users to list products, offer services, arrange rentals, and conduct transactions. The platform is a venue and is not a party to any transaction between users. We do not guarantee the quality, safety, or legality of items or services listed, nor the accuracy of listings.
          </p>
          <ul>
            <li>Sellers and service providers are responsible for accurately describing their offerings, pricing, and availability.</li>
            <li>Buyers are responsible for reviewing listings and communicating with sellers before completing transactions.</li>
            <li>Disputes between users should be resolved directly between the parties involved.</li>
            <li>We reserve the right to remove listings or suspend accounts that violate these terms.</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2>Appointments &amp; Scheduling</h2>
          <p>
            Service providers may offer appointment booking through the platform. Appointments are agreements between the provider and the client. XistrYmemZ is not responsible for cancellations, no-shows, or disputes arising from scheduling. Providers set their own policies regarding cancellations and refunds.
          </p>
        </div>

        <div className={styles.section}>
          <h2>Video Chat</h2>
          <p>
            Video chat rooms are provided for real-time communication between users. You agree not to record, screenshot, or distribute another user&apos;s video or audio without their consent. You are responsible for your conduct in video rooms. XistrYmemZ does not store or monitor video chat content.
          </p>
        </div>

        <div className={styles.section}>
          <h2>Donations &amp; Payments</h2>
          <p>
            Users may provide cryptocurrency wallet addresses for donations. XistrYmemZ does not process, hold, or guarantee such transactions. All donations are voluntary and non-refundable. Users are responsible for verifying wallet addresses before sending funds.
          </p>
        </div>

        <div className={styles.section}>
          <h2>No Advertising</h2>
          <p>
            XistrYmemZ does not serve ads, sponsored content, or promoted posts. We do not sell advertising space or allow third-party advertisers to target users. The platform is funded through voluntary community donations.
          </p>
        </div>

        <div className={styles.section}>
          <h2>No Data Selling</h2>
          <p>
            We do not sell, rent, share, or trade user personal data to third parties for marketing, advertising, or any other purpose. This includes profile information, activity data, messages, and browsing behavior. There are no exceptions to this policy.
          </p>
        </div>

        <div className={styles.section}>
          <h2>No AI Training</h2>
          <p>
            User content on XistrYmemZ is not used to train, fine-tune, or evaluate artificial intelligence models. We do not grant access to our platform data for AI development purposes. Scraping platform content for AI training is strictly prohibited.
          </p>
        </div>

        <div className={styles.section}>
          <h2>Algorithmic Transparency &amp; No Shadowbanning</h2>
          <p>
            XistrYmemZ does not use engagement-maximizing algorithms to manipulate what you see. Content appears chronologically based on your subscriptions and follows. We do not shadowban, throttle, or secretly reduce the reach of any user&apos;s content. If content is removed or restricted, the user will be notified with a clear explanation.
          </p>
        </div>

        <div className={styles.section}>
          <h2>Content Moderation &amp; No Censorship</h2>
          <p>
            We do not censor legal content or suppress viewpoints. Content is removed only when it violates our Terms of Service — specifically illegal material, harassment, spam, and unauthorized private information. The community sets its own norms through groups and forums. Users are free to express lawful opinions without fear of algorithmic suppression or invisible penalties.
          </p>
        </div>

        <div className={styles.section}>
          <h2>Intellectual Property</h2>
          <p>
            The XistrYmemZ name, logo, and platform design are protected intellectual property. User-submitted content remains the property of its respective creators. We respect DMCA takedown requests and will remove infringing content upon valid notice.
          </p>
        </div>

        <div className={styles.section}>
          <h2>Disclaimer</h2>
          <p>
            XistrYmemZ is provided &quot;as is&quot; without warranties of any kind, express or implied. We do not guarantee uninterrupted access, error-free operation, or the accuracy of user-generated content.
          </p>
        </div>

        <div className={styles.section}>
          <h2>Limitation of Liability</h2>
          <p>
            We shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of the platform, including but not limited to losses from transactions between users.
          </p>
        </div>

        <div className={styles.section}>
          <h2>Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Material changes will be communicated through the platform. Continued use after changes constitutes acceptance of the revised terms.
          </p>
        </div>

        <div className={styles.section}>
          <h2>Contact</h2>
          <p>Questions about these terms? Contact us through our <Link href="/contact" style={{ color: 'var(--accent-primary)' }}>contact page</Link>.</p>
        </div>
      </section>
    </div>
  )
}