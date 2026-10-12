import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { ExecutiveRequest, Profile } from '../types'

interface AuthState {
  session: Session | null
  profile: Profile | null
  execRequest: ExecutiveRequest | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [execRequest, setExecRequest] = useState<ExecutiveRequest | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (!s) {
        setProfile(null)
        setExecRequest(null)
        setLoading(false)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      const { data: r } = await supabase.from('executive_requests').select('*').eq('user_id', userId).maybeSingle()
      if (cancelled) return
      setProfile((p as Profile) ?? null)
      setExecRequest((r as ExecutiveRequest) ?? null)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [userId])

  const signOut = async () => { await supabase.auth.signOut() }

  return (
    <AuthContext.Provider value={{ session, profile, execRequest, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
