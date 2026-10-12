import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, Loader2, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { DEPARTMENTS, departmentsForRole } from '../lib/config'
import type { Department, Role } from '../types'
import Notice, { type NoticeData } from './Notice'
import Logo from './logo'

type Tab = 'login' | 'register'

export default function AuthPage() {
  const [tab, setTab] = useState<Tab>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('member')
  const [department, setDepartment] = useState<Department | ''>('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<NoticeData | null>(null)

  const changeRole = (r: Role) => {
    setRole(r)
    // Clear the selection if it is no longer valid for the new member type.
    if (department && !departmentsForRole(r).includes(department)) setDepartment('')
  }
  const switchTab = (t: Tab) => { setTab(t); setNotice(null) }

  const validate = (): string | null => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'Enter a valid email address.'
    if (password.length < 8) return 'Password must be at least 8 characters.'
    if (tab === 'register') {
      if (!/^[A-Za-z0-9_.-]{3,30}$/.test(username)) return 'Username: 3–30 characters (letters, numbers, . _ -).'
      if (!department || !departmentsForRole(role).includes(department)) return 'Choose a department or position.'
    }
    return null
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem = validate()
    if (problem) return setNotice({ type: 'error', text: problem })
    setBusy(true); setNotice(null)

    if (tab === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setNotice({ type: 'error', text: error.message === 'Email not confirmed' ? 'Confirm your email first — check your inbox.' : error.message })
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin, data: { username, requested_role: role, department } },
      })
      if (error) {
        const dup = /database error|username/i.test(error.message)
        setNotice({ type: 'error', text: dup ? 'This username may already be taken. Try another one.' : error.message })
      } else if (data.user && data.user.identities?.length === 0) {
        setNotice({ type: 'error', text: 'An account already exists for this email. Sign in instead.' })
      } else if (!data.session) {
        setNotice({ type: 'success', text: 'Account created. Check your inbox and click the confirmation link, then sign in.' })
        setTab('login')
      }
    }
    setBusy(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
<div className="mb-6 flex justify-center"><Logo className="h-16 sm:h-20" /></div>

        <div className="glass rounded-3xl p-6 sm:p-8">
          <div role="tablist" className="mb-6 grid grid-cols-2 rounded-xl bg-ink-100 p-1 text-sm font-medium">
            {(['login', 'register'] as Tab[]).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => switchTab(t)}
                className={`rounded-lg py-2 transition ${tab === t ? 'bg-white shadow-sm' : 'text-ink-500'}`}>
                {t === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4" noValidate>
            {tab === 'register' && (
              <Field label="Username">
                <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
              </Field>
            )}
            <Field label="Email">
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input className="input pr-10" type={show ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {tab === 'register' && (
              <>
                <Field label="Member type">
                  <select className="input" value={role} onChange={(e) => changeRole(e.target.value as Role)}>
                    <option value="member">Member</option>
                    <option value="executive_member">Executive member</option>
                  </select>
                </Field>
                <Field label={role === 'member' ? 'Department' : 'Department or position'}>
                  <select className="input" value={department} onChange={(e) => setDepartment(e.target.value as Department)}>
                    <option value="">Select…</option>
                    {departmentsForRole(role).map((d) => <option key={d} value={d}>{DEPARTMENTS[d].label}</option>)}
                  </select>
                </Field>
                {role === 'executive_member' && (
                  <p className="rounded-xl bg-ink-100 px-3.5 py-2.5 text-xs text-ink-700">
                    Executive access needs approval by a club administrator. Until then your account works as a regular member account.
                  </p>
                )}
              </>
            )}

            <Notice notice={notice} />
            <button className="btn w-full" disabled={busy}>
              {busy && <Loader2 size={16} className="animate-spin" />}
              {tab === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>
      {children}
    </label>
  )
}
