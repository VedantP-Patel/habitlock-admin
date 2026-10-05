'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { StatCard, Countdown, ProgressBar, Badge, EmptyState } from '@/components/ui'
import { minutesToHoursLabel, getGreeting, HABIT_CATEGORY_META, formatDate } from '@/lib/utils'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { format, subDays } from 'date-fns'

interface DashboardData {
  displayName: string
  todayCompletion: number
  completedToday: number
  totalToday: number
  currentStreak: number
  longestStreak: number
  emergencyUnlocksLeft: number
  emergencyUnlocksLifetime: number
  penaltyPoints: number
  screenTimeToday: number
  pendingChanges: PendingChange[]
  weeklyData: WeeklyPoint[]
  topApps: AppTime[]
  habits: HabitRow[]
}

interface PendingChange {
  id: string
  change_type: string
  description: string | null
  applies_at: string
}

interface WeeklyPoint {
  day: string
  completion: number
  screenTime: number
}

interface AppTime {
  app_name: string
  total_minutes: number
}

interface HabitRow {
  id: string
  name: string
  icon: string
  category: string
  color_hex: string
  status?: 'pending' | 'in_progress' | 'completed' | 'missed' | 'punished'
  progress_value?: number
  target_value?: number | null
  unit?: string | null
}

const STATUS_META = {
  completed:   { label: 'Done',       color: 'success' as const, emoji: '✅' },
  in_progress: { label: 'In Progress', color: 'warning' as const, emoji: '⏳' },
  pending:     { label: 'Pending',    color: 'muted' as const,   emoji: '⭕' },
  missed:      { label: 'Missed',     color: 'danger' as const,  emoji: '❌' },
  punished:    { label: 'Punished',   color: 'danger' as const,  emoji: '🚫' },
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = format(new Date(), 'yyyy-MM-dd')

    const [
      { data: profile },
      { data: streak },
      { data: habits },
      { data: logs },
      { data: pending },
      { data: screenTime },
    ] = await Promise.all([
      supabase.from('profiles').select('display_name, emergency_unlocks_remaining, emergency_unlocks_lifetime').eq('id', user.id).single(),
      supabase.from('streaks').select('*').eq('user_id', user.id).single(),
      supabase.from('habits').select('*').eq('user_id', user.id).eq('is_active', true).order('order_index'),
      supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('date', today),
      supabase.from('pending_changes').select('*').eq('user_id', user.id).eq('applied', false).order('applies_at'),
      supabase.from('screen_time_logs').select('app_name, total_minutes').eq('user_id', user.id).eq('date', today).order('total_minutes', { ascending: false }).limit(6),
    ])

    // Merge logs into habits
    const mergedHabits: HabitRow[] = (habits || []).map(h => {
      const log = logs?.find(l => l.habit_id === h.id)
      return {
        ...h,
        status: log?.status,
        progress_value: log?.progress_value,
      }
    })

    const completed = mergedHabits.filter(h => h.status === 'completed').length
    const total = mergedHabits.length
    const completion = total > 0 ? Math.round((completed / total) * 100) : 0

    const totalScreenTime = (screenTime || []).reduce((a, b) => a + b.total_minutes, 0)

    // Weekly data: last 7 days habit completion + screen time
    const weeklyData: WeeklyPoint[] = []
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
      const dayLabel = format(subDays(new Date(), i), 'EEE')
      const { data: dayLogs } = await supabase
        .from('habit_logs').select('status').eq('user_id', user.id).eq('date', d)
      const { data: dayScreen } = await supabase
        .from('screen_time_logs').select('total_minutes').eq('user_id', user.id).eq('date', d)
      const dayCompleted = dayLogs?.filter(l => l.status === 'completed').length ?? 0
      const dayTotal = dayLogs?.length ?? 0
      weeklyData.push({
        day: dayLabel,
        completion: dayTotal > 0 ? Math.round((dayCompleted / dayTotal) * 100) : 0,
        screenTime: dayScreen?.reduce((a, b) => a + b.total_minutes, 0) ?? 0,
      })
    }

    setData({
      displayName: profile?.display_name || 'Admin',
      todayCompletion: completion,
      completedToday: completed,
      totalToday: total,
      currentStreak: streak?.current_streak ?? 0,
      longestStreak: streak?.longest_streak ?? 0,
      emergencyUnlocksLeft: profile?.emergency_unlocks_remaining ?? 0,
      emergencyUnlocksLifetime: profile?.emergency_unlocks_lifetime ?? 5,
      penaltyPoints: streak?.penalty_points ?? 0,
      screenTimeToday: totalScreenTime,
      pendingChanges: pending || [],
      weeklyData,
      topApps: (screenTime || []) as AppTime[],
      habits: mergedHabits,
    })
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Realtime refresh
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-refresh')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_logs' }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData])

  if (loading) return <DashboardSkeleton />

  if (!data) return (
    <EmptyState
      icon="⚠️"
      title="Could not load dashboard"
      description="Make sure you're signed in and Supabase is configured."
    />
  )

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {getGreeting()}, <span className="gradient-text">{data.displayName}</span> 👋
          </h1>
          <p className="page-subtitle">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} · {data.completedToday}/{data.totalToday} habits done today
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {data.currentStreak > 0 && (
            <div className="badge badge-warning animate-pulse-glow">
              🔥 {data.currentStreak} day streak
            </div>
          )}
          {data.penaltyPoints > 0 && (
            <div className="badge badge-danger">
              ⚡ {data.penaltyPoints} penalty pts
            </div>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards-grid stagger-children">
        <StatCard
          icon="📊"
          label="Today's Completion"
          value={`${data.todayCompletion}%`}
          sub={`${data.completedToday} of ${data.totalToday} habits`}
          variant={data.todayCompletion >= 80 ? 'success' : data.todayCompletion >= 50 ? 'default' : 'danger'}
          animDelay={0}
        />
        <StatCard
          icon="🔥"
          label="Current Streak"
          value={`${data.currentStreak}d`}
          sub={`Best: ${data.longestStreak} days`}
          variant="warning"
          animDelay={80}
        />
        <StatCard
          icon="⚡"
          label="Emergency Unlocks"
          value={`${data.emergencyUnlocksLeft}/${data.emergencyUnlocksLifetime}`}
          sub="Remaining lifetime"
          variant={data.emergencyUnlocksLeft === 0 ? 'danger' : 'default'}
          animDelay={160}
        />
        <StatCard
          icon="📱"
          label="Screen Time Today"
          value={minutesToHoursLabel(data.screenTimeToday)}
          sub="All tracked apps"
          variant="default"
          animDelay={240}
        />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Weekly completion chart */}
        <div className="glass-card animate-fade-in-up" style={{ padding: 24, animationDelay: '300ms' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' }}>
            📈 Weekly Completion
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data.weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-completion" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
              <Tooltip
                contentStyle={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-glass)', borderRadius: 10, color: 'var(--text-primary)' }}
                formatter={(v: any) => [`${v}%`, 'Completion']}
              />
              <Area type="monotone" dataKey="completion" stroke="#7C3AED" strokeWidth={2} fill="url(#grad-completion)" dot={{ fill: '#7C3AED', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Screen time bar chart */}
        <div className="glass-card animate-fade-in-up" style={{ padding: 24, animationDelay: '380ms' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' }}>
            📱 Top Apps Today
          </h2>
          {data.topApps.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.topApps} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                <defs>
                  <linearGradient id="grad-apps" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#7C3AED" />
                    <stop offset="100%" stopColor="#06B6D4" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit="m" />
                <YAxis type="category" dataKey="app_name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-glass)', borderRadius: 10, color: 'var(--text-primary)' }}
                  formatter={(v: any) => [minutesToHoursLabel(v), 'Screen time']}
                />
                <Bar dataKey="total_minutes" fill="url(#grad-apps)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="📊" title="No screen time data yet" description="Sync from your Android app to see usage." />
          )}
        </div>
      </div>

      {/* Today's Habits + Pending Changes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
        {/* Today's habits */}
        <div className="glass-card animate-fade-in-up" style={{ padding: 24, animationDelay: '460ms' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
            📋 Today&apos;s Habits
          </h2>
          {data.habits.length === 0 ? (
            <EmptyState icon="➕" title="No habits yet" description="Add your first habit in the Habits section." />
          ) : (
            <div>
              {data.habits.map((habit, i) => {
                const st = STATUS_META[habit.status || 'pending']
                const catMeta = HABIT_CATEGORY_META[habit.category]
                const pct = habit.target_value && habit.progress_value
                  ? Math.min(100, (habit.progress_value / habit.target_value) * 100)
                  : (habit.status === 'completed' ? 100 : 0)

                return (
                  <div
                    key={habit.id}
                    className="animate-fade-in-up"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '12px 0',
                      borderBottom: i < data.habits.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      animationDelay: `${500 + i * 60}ms`,
                    }}
                  >
                    <div style={{
                      width: 40, height: 40,
                      borderRadius: 'var(--radius-sm)',
                      background: `${catMeta.color}22`,
                      border: `1px solid ${catMeta.color}44`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, flexShrink: 0,
                    }}>
                      {habit.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{habit.name}</span>
                        <Badge variant={st.color}>{st.emoji} {st.label}</Badge>
                      </div>
                      {habit.target_value && (
                        <>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                            {habit.progress_value ?? 0} / {habit.target_value} {habit.unit}
                          </div>
                          <ProgressBar
                            value={pct}
                            variant={habit.status === 'completed' ? 'success' : habit.status === 'punished' || habit.status === 'missed' ? 'danger' : 'brand'}
                          />
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pending changes */}
        <div style={{ width: 300 }}>
          <div className="glass-card animate-fade-in-up" style={{ padding: 24, animationDelay: '500ms' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
              ⏳ Pending Changes
            </h2>
            {data.pendingChanges.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                ✅ No pending changes
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.pendingChanges.map(pc => (
                  <div key={pc.id} className="pending-card glass-card">
                    <span className="pending-card-icon">⏳</span>
                    <div className="pending-card-content">
                      <div className="pending-card-title">
                        {pc.description || pc.change_type.replace(/_/g, ' ')}
                      </div>
                      <div className="pending-card-time">
                        Applies {formatDate(pc.applies_at)}
                      </div>
                    </div>
                    <Countdown targetTime={pc.applies_at} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Streak info */}
          {data.longestStreak > 0 && (
            <div className="glass-card animate-fade-in-up" style={{ padding: 20, marginTop: 16, animationDelay: '560ms', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Best Streak</div>
              <div className="gradient-text" style={{ fontSize: 28, fontWeight: 800 }}>{data.longestStreak} days</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ height: 32, width: 280, background: 'var(--bg-glass)', borderRadius: 8, marginBottom: 8 }} />
        <div style={{ height: 16, width: 200, background: 'var(--bg-glass)', borderRadius: 8 }} />
      </div>
      <div className="stat-cards-grid">
        {[1,2,3,4].map(i => (
          <div key={i} className="glass-card stat-card" style={{ height: 120 }}>
            <div style={{ height: 14, width: 80, background: 'var(--bg-glass-hover)', borderRadius: 4, marginBottom: 8 }} />
            <div style={{ height: 36, width: 100, background: 'var(--bg-glass-hover)', borderRadius: 4 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
