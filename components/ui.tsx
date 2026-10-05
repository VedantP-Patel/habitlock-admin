'use client'

import { useEffect, useState, useCallback } from 'react'
import { parseISO, differenceInSeconds } from 'date-fns'

interface CountdownProps {
  targetTime: string
  className?: string
}

export function Countdown({ targetTime, className = '' }: CountdownProps) {
  const calcRemaining = useCallback(() => {
    const diff = differenceInSeconds(parseISO(targetTime), new Date())
    return Math.max(0, diff)
  }, [targetTime])

  const [secs, setSecs] = useState(calcRemaining)

  useEffect(() => {
    const id = setInterval(() => setSecs(calcRemaining()), 1000)
    return () => clearInterval(id)
  }, [calcRemaining])

  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <span className={`pending-countdown ${className}`}>
      {h > 0 && `${pad(h)}:`}{pad(m)}:{pad(s)}
    </span>
  )
}

interface StatCardProps {
  icon: string
  label: string
  value: string | number
  sub?: string
  variant?: 'default' | 'success' | 'danger' | 'warning'
  animDelay?: number
}

export function StatCard({ icon, label, value, sub, variant = 'default', animDelay = 0 }: StatCardProps) {
  return (
    <div
      className="glass-card stat-card animate-fade-in-up"
      style={{ animationDelay: `${animDelay}ms` }}
    >
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-label">{label}</div>
      <div className={`stat-card-value ${variant !== 'default' ? variant : ''}`}>{value}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  )
}

interface ProgressBarProps {
  value: number   // 0–100
  variant?: 'brand' | 'success' | 'danger' | 'warning'
  height?: number
}

export function ProgressBar({ value, variant = 'brand', height = 6 }: ProgressBarProps) {
  const gradients = {
    brand:   'var(--gradient-brand)',
    success: 'var(--gradient-success)',
    danger:  'var(--gradient-danger)',
    warning: 'var(--gradient-warning)',
  }
  return (
    <div className="progress-bar-wrap" style={{ height }}>
      <div
        className="progress-bar-fill"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: gradients[variant],
        }}
      />
    </div>
  )
}

interface BadgeProps {
  children: React.ReactNode
  variant?: 'violet' | 'success' | 'warning' | 'danger' | 'muted' | 'cyan'
}

export function Badge({ children, variant = 'violet' }: BadgeProps) {
  return <span className={`badge badge-${variant}`}>{children}</span>
}

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-title">{title}</div>
      {description && <p className="empty-state-text">{description}</p>}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  )
}

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-panel animate-scale-in" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">{title}</h2>
          <button
            id="modal-close-btn"
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onDismiss: () => void
}

export function Toast({ message, type = 'info', onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  const colors: Record<string, string> = {
    success: 'var(--success)',
    error:   'var(--danger)',
    info:    'var(--violet)',
  }

  return (
    <div
      className="animate-fade-in-up"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 999,
        background: 'var(--bg-surface-2)',
        border: `1px solid ${colors[type]}40`,
        borderLeft: `3px solid ${colors[type]}`,
        borderRadius: 'var(--radius-md)',
        padding: '12px 20px',
        fontSize: 14,
        color: 'var(--text-primary)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        cursor: 'pointer',
        maxWidth: 340,
      }}
      onClick={onDismiss}
      role="alert"
    >
      {message}
    </div>
  )
}
