'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Badge, EmptyState, Modal, Toast } from '@/components/ui'
import { HABIT_CATEGORY_META, PUNISHMENT_LABELS, formatDate } from '@/lib/utils'
import type { Database } from '@/lib/supabase'
import { format, addHours } from 'date-fns'

type Habit = Database['public']['Tables']['habits']['Row']
type PendingChange = Database['public']['Tables']['pending_changes']['Row']

const CATEGORIES = Object.keys(HABIT_CATEGORY_META) as Array<keyof typeof HABIT_CATEGORY_META>

const EMPTY_FORM = {
  name: '',
  category: 'morning' as Habit['category'],
  icon: '✨',
  color_hex: '#7C3AED',
  is_time_locked: false,
  window_start: '06:00',
  window_end: '09:00',
  target_value: '' as string | number,
  unit: 'minutes',
  punishment_type: 'block_all_day' as Habit['punishment_type'],
  punishment_apps: '',
  reduce_minutes: 0,
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [pending, setPending] = useState<PendingChange[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editHabit, setEditHabit] = useState<Habit | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    const [{ data: h }, { data: p }] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).order('order_index'),
      supabase.from('pending_changes').select('*').eq('user_id', user.id).eq('applied', false).order('created_at', { ascending: false }),
    ])
    setHabits(h || [])
    setPending(p || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function openAdd() {
    setEditHabit(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(h: Habit) {
    setEditHabit(h)
    setForm({
      name: h.name,
      category: h.category,
      icon: h.icon,
      color_hex: h.color_hex,
      is_time_locked: h.is_time_locked,
      window_start: h.window_start || '06:00',
      window_end: h.window_end || '09:00',
      target_value: h.target_value ?? '',
      unit: h.unit || 'minutes',
      punishment_type: h.punishment_type,
      punishment_apps: (h.punishment_apps || []).join(', '),
      reduce_minutes: h.reduce_minutes || 0,
    })
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const payload = {
        name: form.name.trim(),
        category: form.category,
        icon: form.icon,
        color_hex: form.color_hex,
        is_time_locked: form.is_time_locked,
        window_start: form.is_time_locked ? form.window_start : null,
        window_end: form.is_time_locked ? form.window_end : null,
        target_value: form.target_value !== '' ? Number(form.target_value) : null,
        unit: form.unit || null,
        punishment_type: form.punishment_type,
        punishment_apps: form.punishment_apps.split(',').map(s => s.trim()).filter(Boolean),
        reduce_minutes: form.reduce_minutes,
        user_id: user.id,
      }

      if (editHabit) {
        // Queue update with 24hr delay
        await supabase.from('pending_changes').insert({
          user_id: user.id,
          change_type: 'update_habit',
          payload: { habit_id: editHabit.id, ...payload },
          description: `Update habit: ${payload.name}`,
          applies_at: addHours(new Date(), 24).toISOString(),
        })
        setToast({ msg: '⏳ Habit update queued — applies in 24 hours', type: 'info' })
      } else {
        // Add habit immediately (new habits can be added right away, they just won't be enforced until next day)
        await supabase.from('habits').insert({ ...payload, order_index: habits.length })
        setToast({ msg: '✅ Habit added successfully!', type: 'success' })
      }

      setModalOpen(false)
      await fetchData()
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Failed to save', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(habit: Habit) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('pending_changes').insert({
        user_id: user.id,
        change_type: 'delete_habit',
        payload: { habit_id: habit.id, name: habit.name },
        description: `Deactivate habit: ${habit.name}`,
        applies_at: addHours(new Date(), 24).toISOString(),
      })
      setToast({ msg: `⏳ "${habit.name}" will be deactivated in 24 hours`, type: 'info' })
      await fetchData()
    } catch {
      setToast({ msg: 'Failed to queue deactivation', type: 'error' })
    }
  }

  if (loading) return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 Habits</h1>
          <p className="page-subtitle">Loading...</p>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 Habits</h1>
          <p className="page-subtitle">
            {habits.length} active habits · Edits apply after 24-hour delay
          </p>
        </div>
        <button id="btn-add-habit" className="btn btn-primary" onClick={openAdd}>
          + Add Habit
        </button>
      </div>

      {/* 24hr delay notice */}
      <div className="glass-card" style={{
        padding: '14px 20px',
        marginBottom: 20,
        borderLeft: '3px solid var(--warning)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 20 }}>⏳</span>
        <div>
          <strong style={{ color: 'var(--warning)', fontSize: 14 }}>Anti-Cheat: 24-Hour Change Delay</strong>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Edits and deletions are queued and applied 24 hours later. New habits are active immediately but enforcement begins next day. You cannot bypass this.
          </p>
        </div>
      </div>

      {/* Pending changes */}
      {pending.length > 0 && (
        <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--warning)' }}>
            ⏳ Queued Changes ({pending.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map(pc => (
              <div key={pc.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                background: 'var(--warning-dim)',
                border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
              }}>
                <span>⚙️</span>
                <span style={{ flex: 1, color: 'var(--text-secondary)' }}>
                  {pc.description || pc.change_type}
                </span>
                <span style={{ color: 'var(--warning)', fontSize: 12 }}>
                  {formatDate(pc.applies_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Habits table */}
      {habits.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon="📋"
            title="No habits yet"
            description="Add your first habit to start building your discipline system."
            action={<button className="btn btn-primary" onClick={openAdd}>+ Add First Habit</button>}
          />
        </div>
      ) : (
        <div className="glass-card">
          <table className="data-table" id="habits-table">
            <thead>
              <tr>
                <th>Habit</th>
                <th>Category</th>
                <th>Time Lock</th>
                <th>Target</th>
                <th>Punishment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {habits.map(habit => {
                const catMeta = HABIT_CATEGORY_META[habit.category]
                return (
                  <tr key={habit.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36,
                          borderRadius: 8,
                          background: `${catMeta.color}22`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18,
                        }}>
                          {habit.icon}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{habit.name}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge variant="violet">
                        {catMeta.icon} {catMeta.label}
                      </Badge>
                    </td>
                    <td>
                      {habit.is_time_locked ? (
                        <span style={{ color: 'var(--warning)', fontSize: 13 }}>
                          ⏰ {habit.window_start} – {habit.window_end}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>All day</span>
                      )}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {habit.target_value ? `${habit.target_value} ${habit.unit || ''}` : '—'}
                    </td>
                    <td>
                      <Badge variant={
                        habit.punishment_type === 'block_all_day' ? 'danger' :
                        habit.punishment_type === 'escalate' ? 'danger' :
                        habit.punishment_type === 'notification' ? 'muted' : 'warning'
                      }>
                        {PUNISHMENT_LABELS[habit.punishment_type].split(' ')[0]}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={habit.is_active ? 'success' : 'muted'}>
                        {habit.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          id={`btn-edit-habit-${habit.id}`}
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEdit(habit)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          id={`btn-deactivate-habit-${habit.id}`}
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeactivate(habit)}
                          disabled={!habit.is_active}
                        >
                          🚫
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editHabit ? `Edit: ${editHabit.name}` : 'Add New Habit'}
      >
        {editHabit && (
          <div style={{
            padding: '10px 14px', background: 'var(--warning-dim)',
            border: '1px solid rgba(245,158,11,0.25)', borderRadius: 'var(--radius-md)',
            color: 'var(--warning)', fontSize: 13, marginBottom: 20,
          }}>
            ⚠️ This edit will be queued for 24 hours before applying.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="habit-name" className="form-label">Habit Name *</label>
            <input
              id="habit-name"
              className="form-input"
              placeholder="e.g. Morning Exercise"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="habit-category" className="form-label">Category</label>
            <select
              id="habit-category"
              className="form-select"
              value={form.category}
              onChange={e => {
                const cat = e.target.value as Habit['category']
                const meta = HABIT_CATEGORY_META[cat]
                setForm(f => ({ ...f, category: cat, icon: meta.icon }))
              }}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {HABIT_CATEGORY_META[c].icon} {HABIT_CATEGORY_META[c].label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="habit-icon" className="form-label">Icon (emoji)</label>
            <input
              id="habit-icon"
              className="form-input"
              placeholder="e.g. 🏃"
              value={form.icon}
              onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="habit-target" className="form-label">Target Value</label>
            <input
              id="habit-target"
              type="number"
              className="form-input"
              placeholder="e.g. 10000"
              value={form.target_value}
              onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="habit-unit" className="form-label">Unit</label>
            <select
              id="habit-unit"
              className="form-select"
              value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
            >
              <option value="minutes">Minutes</option>
              <option value="steps">Steps</option>
              <option value="ml">Milliliters (ml)</option>
              <option value="sessions">Sessions</option>
              <option value="boolean">Checkbox (done/not done)</option>
            </select>
          </div>
        </div>

        {/* Time lock */}
        <div className="form-group">
          <label className="toggle-wrap form-label">
            <input
              id="habit-time-locked"
              type="checkbox"
              className="toggle-input"
              checked={form.is_time_locked}
              onChange={e => setForm(f => ({ ...f, is_time_locked: e.target.checked }))}
            />
            ⏰ Time-locked (must complete within a window)
          </label>
        </div>

        {form.is_time_locked && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="form-group">
              <label htmlFor="habit-window-start" className="form-label">Window Start</label>
              <input
                id="habit-window-start"
                type="time"
                className="form-input"
                value={form.window_start}
                onChange={e => setForm(f => ({ ...f, window_start: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="habit-window-end" className="form-label">Window End</label>
              <input
                id="habit-window-end"
                type="time"
                className="form-input"
                value={form.window_end}
                onChange={e => setForm(f => ({ ...f, window_end: e.target.value }))}
              />
            </div>
          </div>
        )}

        {/* Punishment */}
        <div className="form-group">
          <label htmlFor="habit-punishment" className="form-label">⚡ Punishment if Missed</label>
          <select
            id="habit-punishment"
            className="form-select"
            value={form.punishment_type}
            onChange={e => setForm(f => ({ ...f, punishment_type: e.target.value as Habit['punishment_type'] }))}
          >
            {Object.entries(PUNISHMENT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {(form.punishment_type === 'block_all_day' || form.punishment_type === 'block_specific') && (
          <div className="form-group">
            <label htmlFor="habit-punishment-apps" className="form-label">
              Apps to block (package names, comma-separated)
            </label>
            <input
              id="habit-punishment-apps"
              className="form-input"
              placeholder="com.instagram.android, com.google.android.youtube"
              value={form.punishment_apps}
              onChange={e => setForm(f => ({ ...f, punishment_apps: e.target.value }))}
            />
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <button id="btn-cancel-habit-modal" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
            Cancel
          </button>
          <button
            id="btn-save-habit"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
          >
            {saving ? '⏳ Saving...' : editHabit ? '⏳ Queue Update' : '✅ Add Habit'}
          </button>
        </div>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
