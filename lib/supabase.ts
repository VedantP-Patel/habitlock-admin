import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          emergency_unlocks_remaining: number
          emergency_unlocks_lifetime: number
          is_admin: boolean
          fcm_token: string | null
          boss_mode_enabled: boolean
          consecutive_missed_days: number
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']>
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      habits: {
        Row: {
          id: string
          user_id: string
          name: string
          category: 'morning' | 'evening' | 'steps' | 'workout' | 'water' | 'sleep' | 'focus' | 'custom'
          icon: string
          color_hex: string
          is_time_locked: boolean
          window_start: string | null
          window_end: string | null
          target_value: number | null
          unit: string | null
          punishment_type: 'block_all_day' | 'reduce_time' | 'block_specific' | 'notification' | 'escalate'
          punishment_apps: string[]
          reduce_minutes: number | null
          escalation_days: number
          is_active: boolean
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['habits']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['habits']['Row']>
      }
      habit_logs: {
        Row: {
          id: string
          habit_id: string
          user_id: string
          date: string
          status: 'pending' | 'in_progress' | 'completed' | 'missed' | 'punished'
          progress_value: number
          completed_at: string | null
          was_within_window: boolean | null
          punishment_applied: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['habit_logs']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['habit_logs']['Row']>
      }
      app_unlock_rules: {
        Row: {
          id: string
          user_id: string
          package_name: string
          app_name: string
          app_icon_url: string | null
          daily_time_limit_minutes: number | null
          requires_habit_ids: string[]
          is_blocked: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['app_unlock_rules']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['app_unlock_rules']['Row']>
      }
      pending_changes: {
        Row: {
          id: string
          user_id: string
          change_type: string
          payload: Record<string, unknown>
          description: string | null
          created_at: string
          applies_at: string
          applied: boolean
          applied_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['pending_changes']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['pending_changes']['Row']>
      }
      streaks: {
        Row: {
          user_id: string
          current_streak: number
          longest_streak: number
          last_completed_date: string | null
          penalty_points: number
          total_habits_done: number
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['streaks']['Row'], 'updated_at'>
        Update: Partial<Database['public']['Tables']['streaks']['Row']>
      }
      screen_time_logs: {
        Row: {
          id: string
          user_id: string
          package_name: string
          app_name: string | null
          date: string
          total_minutes: number
          sessions: Array<{ start: string; end: string; duration_minutes: number }>
          synced_at: string
        }
        Insert: Omit<Database['public']['Tables']['screen_time_logs']['Row'], 'id' | 'synced_at'>
        Update: Partial<Database['public']['Tables']['screen_time_logs']['Row']>
      }
      emergency_unlock_logs: {
        Row: {
          id: string
          user_id: string
          used_at: string
          reason: string | null
          duration_minutes: number
          offline_used: boolean
          synced_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['emergency_unlock_logs']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['emergency_unlock_logs']['Row']>
      }
    }
  }
}
