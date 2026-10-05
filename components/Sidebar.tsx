'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const NAV_ITEMS = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/habits',    icon: '📋', label: 'Habits' },
  { href: '/punishments', icon: '⚡', label: 'Punishments' },
  { href: '/unlocks',   icon: '🔓', label: 'Unlocks' },
  { href: '/screen-time', icon: '📱', label: 'Screen Time' },
  { href: '/settings',  icon: '⚙️',  label: 'Settings' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    async function fetchPending() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { count } = await supabase
        .from('pending_changes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('applied', false)
      setPendingCount(count ?? 0)
    }
    fetchPending()
  }, [])

  return (
    <>
      {/* Mobile toggle */}
      <button
        id="sidebar-toggle"
        className="sidebar-mobile-toggle"
        onClick={() => setMobileOpen(o => !o)}
        aria-label="Toggle sidebar"
        style={{
          display: 'none',
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 200,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 12px',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          fontSize: '18px',
        }}
      >
        ☰
      </button>

      <aside className={`admin-sidebar${mobileOpen ? ' open' : ''}`} id="admin-sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🔐</div>
          <span className="sidebar-logo-text">HabitLock</span>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav" aria-label="Admin navigation">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              id={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
              className={`sidebar-nav-item${pathname.startsWith(item.href) ? ' active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-divider" />

        {/* Pending changes badge */}
        {pendingCount > 0 && (
          <Link href="/habits" className="sidebar-pending-badge" style={{ textDecoration: 'none' }}>
            <span>⏳</span>
            <span>
              <strong>{pendingCount}</strong> pending change{pendingCount > 1 ? 's' : ''}
            </span>
          </Link>
        )}

        {/* User signout */}
        <div style={{ marginTop: 16 }}>
          <button
            id="btn-signout"
            className="btn btn-ghost"
            style={{ width: '100%', fontSize: 13 }}
            onClick={() => supabase.auth.signOut()}
          >
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
