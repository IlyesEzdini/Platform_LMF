import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { DEPARTMENTS } from '../lib/config'
import type { Kind, Profile } from '../types'
import { DeptBadge, RoleChip } from './Badge'
import Home from './Home'
import InboxPage from './InboxPage'
import Logo from './Logo'
import Notice from './Notice'

export default function Shell({ profile }: { profile: Profile }) {
  const { signOut, execRequest } = useAuth()
  const [view, setView] = useState<'home' | Kind>('home')

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6">
      <div className="mb-3 flex justify-center"><Logo className="h-14 sm:h-16" /></div>
      <header className="glass mb-6 flex items-center justify-between rounded-2xl px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate font-semibold">{profile.username}</span>
          <RoleChip role={profile.role} />
          <DeptBadge department={profile.department} />
        </div>
        <button className="btn-ghost" onClick={signOut}><LogOut size={16} /><span className="hidden sm:inline">Sign out</span></button>
      </header>

      {profile.role === 'member' && execRequest?.status === 'pending' && (
        <div className="mb-5"><Notice notice={{ type: 'success', text: `Your request for executive access (${DEPARTMENTS[execRequest.requested_department].label}) is pending administrator approval.` }} /></div>
      )}
      {profile.role === 'member' && execRequest?.status === 'rejected' && (
        <div className="mb-5"><Notice notice={{ type: 'error', text: 'Your executive access request was not approved.' }} /></div>
      )}

      {view === 'home'
        ? <Home username={profile.username} onPick={setView} />
        : <InboxPage key={view} kind={view} profile={profile} onHome={() => setView('home')} />}
    </div>
  )
}
