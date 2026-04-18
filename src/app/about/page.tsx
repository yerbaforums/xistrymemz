'use client'

import Link from 'next/link'
import styles from './page.module.css'

export default function About() {

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <section className={styles.hero}>
          <div className={styles.logoSection}>
            <img src="/logo.png" alt="XistrYmemZ" className={styles.logoImage} />
          </div>
          <h1>Welcome to XistrYmemZ</h1>
          <p className={styles.heroSubtitle}>
            A community platform for planning, requesting, and completing projects together
          </p>
        </section>

        <section className={styles.section}>
          <h2>What is XistrYmemZ?</h2>
          <p>
            XistrYmemZ is a platform where creators, developers, and community members 
            can collaborate on projects. Create detailed plans, submit requests to help 
            complete them, and track your progress with powerful tools.
          </p>
        </section>

        <section className={styles.section}>
          <h2>🚀 Quick Start Guide</h2>
          
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepContent}>
                <h3>Create an Account</h3>
                <p>Sign up for free using your email. It only takes a minute to get started.</p>
                <Link href="/auth/register" className={styles.stepLink}>Sign Up Now →</Link>
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepContent}>
                <h3>Set Up Your Wallet</h3>
                <p>Add cryptocurrency to your wallet for seamless transactions across the platform.</p>
                <Link href="/wallet" className={styles.stepLink}>Add Funds →</Link>
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepContent}>
                <h3>Explore Projects</h3>
                <p>Browse public plans and find projects matching your skills and interests.</p>
                <Link href="/plans/public" className={styles.stepLink}>Browse Projects →</Link>
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>4</div>
              <div className={styles.stepContent}>
                <h3>Join the Community</h3>
                <p>Connect with members, join groups, and participate in forum discussions.</p>
                <Link href="/community?tab=forum" className={styles.stepLink}>Join Forum →</Link>
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>5</div>
              <div className={styles.stepContent}>
                <h3>Create Your Own Plan</h3>
                <p>Launch your own project by creating a detailed plan with goals and requests.</p>
                <Link href="/plans" className={styles.stepLink}>Create Plan →</Link>
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>6</div>
              <div className={styles.stepContent}>
                <h3>Browse the Marketplace</h3>
                <p>Buy and sell products, or set up your own shop to reach thousands of buyers.</p>
                <Link href="/products" className={styles.stepLink}>Visit Marketplace →</Link>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>🧭 Platform Navigation</h2>
          <p className={styles.sectionIntro}>
            Here&apos;s how to find your way around XistrYmemZ:
          </p>
          
          <div className={styles.navGuide}>
            <div className={styles.navCard}>
              <div className={styles.navIcon}>🚀</div>
              <h3>Projects</h3>
              <p>Create and discover collaborative projects</p>
              <div className={styles.navLinks}>
                <Link href="/plans/public">Browse All</Link>
                <Link href="/plans">My Projects</Link>
              </div>
            </div>

            <div className={styles.navCard}>
              <div className={styles.navIcon}>💬</div>
              <h3>Forum</h3>
              <p>Discussions, tips, and community support</p>
              <div className={styles.navLinks}>
                <Link href="/community?tab=forum">All Posts</Link>
                <Link href="/community">Members</Link>
              </div>
            </div>

            <div className={styles.navCard}>
              <div className={styles.navIcon}>🛒</div>
              <h3>Marketplace</h3>
              <p>Buy and sell products & services</p>
              <div className={styles.navLinks}>
                <Link href="/products">Browse Products</Link>
                <Link href="/shops">Visit Shops</Link>
                <Link href="/shop/setup">Open Shop</Link>
              </div>
            </div>

            <div className={styles.navCard}>
              <div className={styles.navIcon}>💳</div>
              <h3>Wallet</h3>
              <p>Manage your crypto balance</p>
              <div className={styles.navLinks}>
                <Link href="/wallet">View Wallet</Link>
                <Link href="/wallet/deposit">Deposit</Link>
                <Link href="/wallet/withdraw">Withdraw</Link>
              </div>
            </div>

            <div className={styles.navCard}>
              <div className={styles.navIcon}>👥</div>
              <h3>Community</h3>
              <p>Connect with members globally</p>
              <div className={styles.navLinks}>
                <Link href="/community">Members</Link>
                <Link href="/groups">Groups</Link>
                <Link href="/community?tab=connections">Connections</Link>
              </div>
            </div>

            <div className={styles.navCard}>
              <div className={styles.navIcon}>📅</div>
              <h3>Events</h3>
              <p>Host and attend community events</p>
              <div className={styles.navLinks}>
                <Link href="/events">Browse Events</Link>
                <Link href="/plans/public">Find Project Events</Link>
              </div>
            </div>

            <div className={styles.navCard}>
              <div className={styles.navIcon}>🏫</div>
              <h3>Learning</h3>
              <p>Educational content and courses</p>
              <div className={styles.navLinks}>
                <Link href="/schools">Browse Schools</Link>
                <Link href="/school/setup">Create School</Link>
              </div>
            </div>

            <div className={styles.navCard}>
              <div className={styles.navIcon}>📊</div>
              <h3>Dashboard</h3>
              <p>Your personal hub</p>
              <div className={styles.navLinks}>
                <Link href="/dashboard">Overview</Link>
                <Link href="/dashboard?tab=projects">Projects</Link>
                <Link href="/dashboard?tab=market">Market</Link>
                <Link href="/dashboard?tab=messages">Messages</Link>
                <Link href="/dashboard?tab=events">My Events</Link>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>✨ Platform Features</h2>
          <div className={styles.features}>
            <div className={styles.feature}>
              <h3>🚀 Projects</h3>
              <p>Create detailed project plans with goals, milestones, and funding options.</p>
              <Link href="/plans/public" className={styles.featureLink}>Browse Projects →</Link>
            </div>
            <div className={styles.feature}>
              <h3>📝 Requests</h3>
              <p>Submit requests to help complete project tasks and earn rewards.</p>
              <Link href="/community?tab=marketRequests" className={styles.featureLink}>View Requests →</Link>
            </div>
            <div className={styles.feature}>
              <h3>🛒 Marketplace</h3>
              <p>Buy and sell products and services in our secure marketplace.</p>
              <Link href="/products" className={styles.featureLink}>Browse Marketplace →</Link>
            </div>
            <div className={styles.feature}>
              <h3>🔒 Escrow</h3>
              <p>Secure transactions with crypto escrow - funds held safely until delivery.</p>
            </div>
            <div className={styles.feature}>
              <h3>🚚 Courier Services</h3>
              <p>Integrated delivery options for physical goods with tracking.</p>
              <Link href="/courier/setup" className={styles.featureLink}>Become a Courier →</Link>
            </div>
            <div className={styles.feature}>
              <h3>💳 Wallet</h3>
              <p>Fund your account with cryptocurrency for seamless transactions.</p>
              <Link href="/wallet" className={styles.featureLink}>Manage Wallet →</Link>
            </div>
            <div className={styles.feature}>
              <h3>👥 Groups</h3>
              <p>Join or create groups to collaborate with community members.</p>
                <Link href="/community/groups" className={styles.featureLink}>View Groups →</Link>
            </div>
            <div className={styles.feature}>
              <h3>📅 Events</h3>
              <p>Host and attend community events to connect and learn.</p>
              <Link href="/events" className={styles.featureLink}>Browse Events →</Link>
            </div>
            <div className={styles.feature}>
              <h3>🏫 Schools</h3>
              <p>Create educational content and courses for the community.</p>
              <Link href="/schools" className={styles.featureLink}>Explore Schools →</Link>
            </div>
            <div className={styles.feature}>
              <h3>🏪 Shops</h3>
              <p>Set up a shop to sell products and services to the community.</p>
              <Link href="/shops" className={styles.featureLink}>Visit Shops →</Link>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>📞 Get in Touch</h2>
          <p>Have questions or want to connect? We&apos;re here to help!</p>
          
          <div className={styles.contactLinks}>
            <Link href="/contact" className={styles.contactCard}>
              <span className={styles.contactIcon}>💬</span>
              <div>
                <h3>Contact Us</h3>
                <p>Send us a message - we respond to all inquiries</p>
              </div>
            </Link>
            <Link href="/help" className={styles.contactCard}>
              <span className={styles.contactIcon}>❓</span>
              <div>
                <h3>Help Center</h3>
                <p>Find answers to common questions</p>
              </div>
            </Link>
            <Link href="/community" className={styles.contactCard}>
              <span className={styles.contactIcon}>👥</span>
              <div>
                <h3>Community</h3>
                <p>Connect with members worldwide</p>
              </div>
            </Link>
            <Link href="/events" className={styles.contactCard}>
              <span className={styles.contactIcon}>📅</span>
              <div>
                <h3>Events</h3>
                <p>Attend virtual and in-person events</p>
              </div>
            </Link>
            <Link href="/sitemap" className={styles.contactCard}>
              <span className={styles.contactIcon}>🗺️</span>
              <div>
                <h3>Site Map</h3>
                <p>Navigate all pages on the platform</p>
              </div>
            </Link>
          </div>
        </section>

        <section className={styles.section}>
          <h2>💰 Support Us</h2>
          <p className={styles.sectionIntro}>
            If you like what we&apos;re building, you can support XistrYmemZ with cryptocurrency donations.
            Every contribution helps us keep the platform running and free for everyone.
          </p>
          
          <div className={styles.donationSection}>
            <div className={styles.donationCard}>
              <div className={styles.cryptoIcon}>🪙</div>
              <h3>Monero (XMR)</h3>
              <code className={styles.address} onClick={() => navigator.clipboard.writeText('43Zq1pUmvxUCd6bCQmBaH8UQd3DKeVDKmk6Z7D8E8gC6XGaNRLW8R7xVxV4Y9m3KxQ4xF8Y9m3KxQ4xF8Y9m3KxQ4xF')}>43Zq1pUmvxUCd6bCQmBaH8UQd3DKeVDKmk6Z7D8E8gC6XGaNRLW8R7xVxV4Y9m</code>
              <span className={styles.copyHint}>Click to copy</span>
            </div>

            <div className={styles.donationCard}>
              <div className={styles.cryptoIcon}>₿</div>
              <h3>Bitcoin (BTC)</h3>
              <code className={styles.address} onClick={() => navigator.clipboard.writeText('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh')}>bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh</code>
              <span className={styles.copyHint}>Click to copy</span>
            </div>

            <div className={styles.donationCard}>
              <div className={styles.cryptoIcon}>Ξ</div>
              <h3>Ethereum (ETH)</h3>
              <code className={styles.address} onClick={() => navigator.clipboard.writeText('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D')}>0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D</code>
              <span className={styles.copyHint}>Click to copy</span>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>📧 Stay Updated</h2>
          <p className={styles.sectionIntro}>
            Subscribe to our newsletter to get updates on new features, community events, and platform news.
          </p>
          
          <form className={styles.subscribeForm} onSubmit={(e) => { e.preventDefault(); alert('Thanks for subscribing!'); }}>
            <input 
              type="email" 
              placeholder="Enter your email address" 
              required
              className={styles.emailInput}
            />
            <button type="submit" className={styles.subscribeBtn}>Subscribe</button>
          </form>
          <p className={styles.privacyNote}>We respect your privacy. Unsubscribe at any time.</p>
        </section>

        <section className={styles.cta}>
          <div className={styles.betaBadge}>🎉 Early Access</div>
          <h2>Join the Beta</h2>
          <p>Be among the first to experience XistrYmemZ. Sign up now to get early access to all features, influence product development, and help shape the future of collaborative planning.</p>
          <div className={styles.ctaButtons}>
            <Link href="/auth/register" className={styles.btnPrimary}>Create Free Account</Link>
            <Link href="/plans/public" className={styles.btnSecondary}>Preview Projects</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
