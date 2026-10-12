import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && anon)

// Only the public anon key is used here. Authorization is enforced by RLS.
export const supabase = createClient(url ?? 'http://localhost', anon ?? 'missing-key')
