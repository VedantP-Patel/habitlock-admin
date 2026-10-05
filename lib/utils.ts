import { format, formatDistanceToNow, isToday, parseISO } from 'date-fns'

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d, yyyy')
}

export function formatTime(dateStr: string): string {
  return format(parseISO(dateStr), 'h:mm a')
}

export function timeUntil(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: false })
}

export function isDateToday(dateStr: string): boolean {
  return isToday(parseISO(dateStr))
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function minutesToHoursLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export const HABIT_CATEGORY_META: Record<string, { icon: string; label: string; color: string }> = {
  morning:  { icon: '☀️',  label: 'Morning',   color: '#F59E0B' },
  evening:  { icon: '🌙',  label: 'Evening',   color: '#8B5CF6' },
  steps:    { icon: '👟',  label: 'Steps',     color: '#10B981' },
  workout:  { icon: '💪',  label: 'Workout',   color: '#EF4444' },
  water:    { icon: '💧',  label: 'Water',     color: '#06B6D4' },
  sleep:    { icon: '😴',  label: 'Sleep',     color: '#6366F1' },
  focus:    { icon: '🎯',  label: 'Focus',     color: '#EC4899' },
  custom:   { icon: '✨',  label: 'Custom',    color: '#7C3AED' },
}

export const PUNISHMENT_LABELS: Record<string, string> = {
  block_all_day:   'Block selected apps all day',
  reduce_time:     'Reduce daily time limits',
  block_specific:  'Block specific apps',
  notification:    'Notification warning only',
  escalate:        'Escalating punishment',
}
