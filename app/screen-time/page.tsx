'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Badge, EmptyState, StatCard } from '@/components/ui'
import { minutesToHoursLabel } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from 'recharts'
import { format, subDays } from 'date-fns'

interface AppUsage {
  package_name: string
  app_name: string | null
  total_minutes: number
}

interface AppRule {
  id: string
  package_name: string
  app_name: string
  daily_time_limit_minutes: number | null
  requires_habit_ids: string[]
  is_blocked: boolean
}

const APP_COLORS = ['#7C3AED', '#06B6D4', '#EC4899', '#10B981', '#F59E0B', '#EF4444']

export default function ScreenTimePage() {
  const [todayUsage, setTodayUsage] = useState<AppUsage[]>([])
  const [appRules, setAppRules] = useState<AppRule[]>([])
  const [weeklyTotal, setWeeklyTotal] = useState<{ day: string; total: number }[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = format(new Date(), 'yyyy-MM-dd')

    const [{ data: todayData }, { data: rules }] = await Promise.all([
      supabase.from('screen_time_logs')
        .select('package_name, app_name, total_minutes')
        .eq('user_id', user.id)
        .eq('date', today)
        .order('total_minutes', { ascending: false }),
      supabase.from('app_unlock_rules')
        .select('*')
        .eq('user_id', user.id),
    ])

    // Weekly totals
    const weekly = []
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
      const { data } = await supabase
        .from('screen_time_logs')
        .select('total_minutes')
        .eq('user_id', user.id)
        .eq('date', d)
      weekly.push({
        day: format(subDays(new Date(), i), 'EEE'),
        total: data?.reduce((a, b) => a + b.total_minutes, 0) ?? 0,
      })
    }

    setTodayUsage(todayData || [])
    setAppRules(rules || [])
    setWeeklyTotal(weekly)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const totalToday = todayUsage.reduce((a, b) => a + b.total_minutes, 0)
  const blockedCount = appRules.filter(r => r.is_blocked).length

  if (loading) return <div><h1 className="page-title">📱 Screen Time</h1></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📱 Screen Time</h1>
          <p className="page-subtitle">Synced from your Android device · Today&apos;s usage</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-cards-grid stagger-children">
        <StatCard icon="⏱️" label="Total Today" value={minutesToHoursLabel(totalToday)} sub="All apps combined" animDelay={0} />
        <StatCard icon="🔒" label="Blocked Apps" value={blockedCount} sub="Requiring habit completion" variant="danger" animDelay={80} />
        <StatCard icon="📱" label="Tracked Apps" value={appRules.length} sub="Under monitoring" animDelay={160} />
        <StatCard
          icon="📅"
          label="Weekly Average"
          value={minutesToHoursLabel(Math.round(weeklyTotal.reduce((a, b) => a + b.total, 0) / 7))}
          sub="Per day"
          animDelay={240}
        />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Today breakdown */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Today&apos;s Breakdown</h2>
          {todayUsage.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={todayUsage} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit="m" />
                <YAxis type="category" dataKey="app_name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-glass)', borderRadius: 10, color: 'var(--text-primary)' }}
                  formatter={(v: any) => [minutesToHoursLabel(v), 'Screen time']}
                />
                <Bar dataKey="total_minutes" radius={[0, 6, 6, 0]}>
                  {todayUsage.map((_, i) => (
                    <Cell key={i} fill={APP_COLORS[i % APP_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="📊" title="No data yet" description="Sync from your Android device to see app usage." />
          )}
        </div>

        {/* Weekly totals */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Weekly Screen Time</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyTotal} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-screentime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06B6D4" stopOpacity={1} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} unit="m" />
              <Tooltip
                contentStyle={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-glass)', borderRadius: 10, color: 'var(--text-primary)' }}
                formatter={(v: any) => [minutesToHoursLabel(v), 'Screen time']}
              />
              <Bar dataKey="total" fill="url(#grad-screentime)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* App rules table */}
      <div className="glass-card">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>🔒 App Lock Rules</h2>
        </div>
        {appRules.length === 0 ? (
          <EmptyState
            icon="📱"
            title="No apps configured"
            description="Add apps to track and lock from your Android device's app list."
          />
        ) : (
          <table className="data-table" id="app-rules-table">
            <thead>
              <tr>
                <th>App</th>
                <th>Package</th>
                <th>Daily Limit</th>
                <th>Requires Habits</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {appRules.map(rule => (
                <tr key={rule.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rule.app_name}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                    {rule.package_name}
                  </td>
                  <td>
                    {rule.daily_time_limit_minutes
                      ? minutesToHoursLabel(rule.daily_time_limit_minutes)
                      : <span style={{ color: 'var(--text-muted)' }}>Unlimited</span>}
                  </td>
                  <td>
                    <Badge variant="violet">{rule.requires_habit_ids.length} habits</Badge>
                  </td>
                  <td>
                    <Badge variant={rule.is_blocked ? 'danger' : 'success'}>
                      {rule.is_blocked ? '🔒 Locked' : '🔓 Unlocked'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
