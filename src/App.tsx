import { Loader2, AlertTriangle } from 'lucide-react'
import { useAuth } from './context/AuthContext'
import { isConfigured } from './lib/supabase'
import AuthPage from './components/AuthPage'
import Shell from './components/Shell'

export default function App() {
  const { session, profile, loading, signOut } = useAuth()

  if (!isConfigured) {
    return (
      <Centered>
        <AlertTriangle className="mb-3 text-amber-500" />
        <p className="font-medium">Supabase is not configured.</p>
        <p className="mt-1 text-sm text-ink-500">Copy <code>.env.example</code> to <code>.env</code> and set your project URL and anon key.</p>
      </Centered>
    )
  }
  if (loading) return <Centered><Loader2 className="animate-spin text-ink-500" aria-label="Loading" /></Centered>
  if (!session) return <AuthPage />
  if (!profile) {
    return (
      <Centered>
        <p className="font-medium">Your profile could not be loaded.</p>
        <p className="mt-1 text-sm text-ink-500">Check that schema.sql was executed, then sign in again.</p>
        <button className="btn mt-4" onClick={signOut}>Sign out</button>
      </Centered>
    )
  }
  return <Shell profile={profile} />
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">{children}</div>
}
