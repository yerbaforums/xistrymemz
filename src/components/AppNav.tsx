'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/plans', label: 'Projects', icon: '🚀' },
  { href: '/requests', label: 'Requests', icon: '🤝' },
  { href: '/events', label: 'Events', icon: '📅' },
  { href: '/products', label: 'Market', icon: '🛒' },
  { href: '/orders', label: 'Orders', icon: '📦' },
  { href: '/connections', label: 'Connections', icon: '🤝' },
  { href: '/groups', label: 'Groups', icon: '👥' },
  { href: '/community', label: 'Community', icon: '🌐' },
  { href: '/schools', label: 'Schools', icon: '📚' },
  { href: '/messages', label: 'Messages', icon: '💬' },
  { href: '/profile', label: 'Profile', icon: '👤' },
  { href: '/wallet', label: 'Wallet', icon: '💳' },
];

export default function AppNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav className="app-nav">
      <div className="nav-brand">
        <Link href="/dashboard" className="brand-link">
          <img src="/logo.png" alt="XistrYmemZ" style={{ height: '32px', marginRight: '8px' }} />
          XistrYmemZ
        </Link>
      </div>
      
      <div className="nav-links">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link ${pathname === link.href || pathname.startsWith(link.href + '/') ? 'active' : ''}`}
          >
            <span className="nav-icon">{link.icon}</span>
            <span className="nav-label">{link.label}</span>
          </Link>
        ))}
      </div>

      <div className="nav-user">
        {session ? (
          <div className="user-menu">
            <span className="user-name">{session.user?.name || session.user?.email?.split('@')[0]}</span>
            <button onClick={() => signOut({ callbackUrl: '/' })} className="logout-btn">
              Logout
            </button>
          </div>
        ) : (
          <Link href="/auth/login" className="login-link">Sign In</Link>
        )}
      </div>

      <style jsx>{`
        .app-nav {
          display: flex;
          align-items: center;
          padding: 0.75rem 1.5rem;
          background: #161616;
          border-bottom: 1px solid #2a2a2a;
          gap: 1rem;
          flex-wrap: wrap;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .nav-brand .brand-link {
          font-size: 1.25rem;
          font-weight: 700;
          text-decoration: none;
          color: #00d9ff;
        }

        .nav-links {
          display: flex;
          gap: 0.25rem;
          flex: 1;
          justify-content: center;
          flex-wrap: wrap;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          color: #888888;
          text-decoration: none;
          border-radius: 8px;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .nav-link:hover {
          background: #1f1f1f;
          color: #ffffff;
        }

        .nav-link.active {
          background: #00d9ff;
          color: #0d0d0d;
        }

        .nav-icon {
          font-size: 1rem;
        }

        .nav-user {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .user-menu {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-name {
          font-size: 0.875rem;
          color: #888888;
        }

        .logout-btn {
          padding: 0.375rem 0.75rem;
          background: transparent;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          color: #888888;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .logout-btn:hover {
          border-color: #ff3366;
          color: #ff3366;
        }

        .login-link {
          padding: 0.5rem 1rem;
          background: #00d9ff;
          color: #0d0d0d;
          border-radius: 8px;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 600;
        }

        @media (max-width: 900px) {
          .nav-label { display: none; }
          .nav-link { padding: 0.5rem; }
        }

        @media (max-width: 600px) {
          .app-nav { padding: 0.5rem; }
          .nav-links { gap: 0; }
          .user-name { display: none; }
        }
      `}</style>
    </nav>
  );
}