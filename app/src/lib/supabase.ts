import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Types for our SearchSession realtime updates
export interface SearchSessionUpdate {
  id: string
  userId: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: {
    current: number
    total: number
    message: string
  }
  jobTitle: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}