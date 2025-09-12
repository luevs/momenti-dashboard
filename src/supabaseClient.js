import { createClient } from '@supabase/supabase-js'

// Cambiamos 'process.env' por 'import.meta.env'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)