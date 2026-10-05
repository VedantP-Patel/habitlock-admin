'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { StatCard, Badge, Toast, Modal } from '@/components/ui'
import { formatDate, minutesToHoursLabel } from '@/lib/utils'
import { addHours } from 'date-fns'
import type { Database } from '@/lib/supabase'

type UnlockLog = Database['public']['Tables']['emergency_unlock_logs']['Row']

export default function UnlocksPage() {
  const [remaining, setRemaining] = useState(0)
  const [lifetime, setLifetime] = useState(5)
  const [logs, setLogs] = useState<UnlockLog[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [newLimit, setNewLimit] = useState(5)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: profile }, { data: unlockLogs }] = await Promise.all([
      supabase.from('profiles').select('emergency_unlocks_remaining, emergency_unlocks_lifetime').eq('id', user.id).single(),
      supabase.from('emergency_unlock_logs').select('*').eq('user_id', user.id).order('used_at', { ascending: false }).limit(50),
    ])
    setRemaining(profile?.emergency_unlocks_remaining ?? 0)
    setLifetime(profile?.emergency_unlocks_lifetime ?? 5)
    setNewLimit(profile?.emergency_unlocks_lifetime ?? 5)
    setLogs(unlockLogs || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleUpdateLimit() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      await supabase.from('pending_changes').insert({
        user_id: user.id,
        change_type: 'update_emergency_limit',
        payload: { new_lifetime_limit: newLimit },
        description: `Change emergency unlock limit to ${newLimit}`,
        applies_at: addHours(new Date(), 24).toISOString(),
      })
      setModalOpen(false)
      setToast({ msg: `⏳ Unlock limit change queued for 24 hours`, type: 'info' })
      await fetchData()
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Failed', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const used = lifetime - remaining

  if (loading) return <div><h1 className="page-title">🔓 Unlocks</h1></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🔓 Emergency Unlocks</h1>
          <p className="page-subtitle">Lifetime-limited · Biometric-gated on device</p>
        </div>
        <button id="btn-edit-unlock-limit" className="btn btn-ghost" onClick={() => setModalOpen(true)}>
          ⚙️ Change Limit
        </button>
      </div>

      {/* Stats */}
      <div className="stat-cards-grid stagger-children">
        <StatCard
          icon="⚡"
          label="Remaining Unlocks"
          value={remaining}
          sub={`of ${lifetime} lifetime`}
          variant={remaining === 0 ? 'danger' : remaining <= 2 ? 'warning' : 'success'}
          animDelay={0}
        />
        <StatCard
          icon="🔓"
          label="Used So Far"
          value={used}
          sub="Total used lifetime"
          variant={used > 0 ? 'danger' : 'default'}
          animDelay={80}
        />
        <StatCard
          icon="🔒"
          label="Lifetime Limit"
          value={lifetime}
          sub="Admin-configurable"
          animDelay={160}
        />
        <StatCard
          icon="⏱️"
          label="Avg Unlock Duration"
          value={logs.length > 0
            ? minutesToHoursLabel(Math.round(logs.reduce((a, l) => a + l.duration_minutes, 0) / logs.length))
            : '—'}
          sub="Per emergency use"
          animDelay={240}
        />
      </div>

      {/* Usage bar */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Lifetime Usage</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${lifetime > 0 ? (used / lifetime) * 100 : 0}%`,
                background: used >= lifetime ? 'var(--gradient-danger)' : 'var(--gradient-warning)',
                borderRadius: 999,
                transition: 'width 1s ease',
              }} />
            </div>
          </div>
          <span style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
            {used} / {lifetime} used
          </span>
        </div>
        {remaining === 0 && (
          <div style={{
            padding: '12px 16px',
            background: 'var(--danger-dim)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--danger)',
            fontSize: 14,
          }}>
            ❌ <strong>No emergency unlocks remaining.</strong> Click 'Change Limit' to queue an increase (takes 24 hours).
          </div>
        )}
      </div>

      {/* History */}
      <div className="glass-card">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>📋 Usage History</h2>
        </div>
        {logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No emergency unlocks used yet 🎉
          </div>
        ) : (
          <table className="data-table" id="unlock-history-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Duration</th>
                <th>Reason</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td>{formatDate(log.used_at)} at {new Date(log.used_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{minutesToHoursLabel(log.duration_minutes)}</td>
                  <td style={{ color: 'var(--text-primary)' }}>{log.reason || <span style={{ color: 'var(--text-muted)' }}>No reason given</span>}</td>
                  <td>
                    <Badge variant={log.offline_used ? 'warning' : 'muted'}>
                      {log.offline_used ? '📡 Offline' : '🌐 Online'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Change limit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="⚡ Change Emergency Unlock Limit">
        <div style={{
          padding: '12px 16px', marginBottom: 20,
          background: 'var(--warning-dim)', borderLeft: '3px solid var(--warning)',
          borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--warning)',
        }}>
          ⚠️ This change is queued for 24 hours — you cannot access more unlocks immediately.
        </div>
        <div className="form-group">
          <label htmlFor="new-unlock-limit" className="form-label">
            New Lifetime Limit (current: {lifetime})
          </label>
          <input
            id="new-unlock-limit"
            type="number"
            className="form-input"
            min={used}
            max={50}
            value={newLimit}
            onChange={e => setNewLimit(Number(e.target.value))}
          />
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Cannot be set lower than {used} (already used).
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
          <button
            id="btn-save-unlock-limit"
            className="btn btn-primary"
            onClick={handleUpdateLimit}
            disabled={saving || newLimit < used || newLimit === lifetime}
          >
            {saving ? '⏳ Queueing...' : '⏳ Queue Change (24hr)'}
          </button>
        </div>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
