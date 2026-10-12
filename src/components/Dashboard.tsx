import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Inbox, Loader2, LogOut, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { DEPARTMENTS, EXECUTIVE_DEPARTMENTS } from '../lib/config'
import type { Complaint, Department, Profile, Role } from '../types'
import { DeptBadge, RoleChip, StatusPill, fmt } from './Badge'
import ComplaintForm from './ComplaintForm'
import Conversation from './Conversation'
import Notice, { type NoticeData } from './Notice'

export default function Dashboard({ profile }: { profile: Profile }) {
  const { signOut, execRequest } = useAuth()
  const isExec = profile.role === 'executive_member'
  const canReply = isExec && profile.department === 'hr' // UI only — enforced by RLS

  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notice, setNotice] = useState<NoticeData | null>(null)

  const [q, setQ] = useState('')
  const [deptFilter, setDeptFilter] = useState<Department | ''>('')
  const [roleFilter, setRoleFilter] = useState<Role | ''>('')

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('complaints')
      .select('*, complaint_replies(*)')
      .order('created_at', { ascending: false })
      .order('created_at', { referencedTable: 'complaint_replies', ascending: true })
    if (error) setError(error.message)
    else { setError(null); setComplaints((data ?? []) as Complaint[]) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase()
    return complaints.filter((c) =>
      (!deptFilter || c.department === deptFilter) &&
      (!roleFilter || c.sender_role === roleFilter) &&
      (!s || c.sender_username.toLowerCase().includes(s) || c.content.toLowerCase().includes(s)))
  }, [complaints, q, deptFilter, roleFilter])

  const selected = complaints.find((c) => c.id === selectedId) ?? null

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6">
      <header className="glass mb-6 flex items-center justify-between rounded-2xl px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate font-semibold">{profile.username}</span>
          <RoleChip executive={isExec} />
          <DeptBadge department={profile.department} />
        </div>
        <button className="btn-ghost" onClick={signOut}><LogOut size={16} /><span className="hidden sm:inline">Sign out</span></button>
      </header>

      <h1 className="mb-1 text-2xl font-semibold tracking-tight sm:text-3xl">
        {isExec ? 'All complaints' : `Welcome, ${profile.username}`}
      </h1>
      <p className="mb-5 text-sm text-ink-500">
        {isExec
          ? canReply ? 'You can reply to any complaint as HR.' : 'You can read every complaint. Only HR executives can reply.'
          : 'Share a complaint with the club. Replies from HR appear in the conversation.'}
      </p>

      {!isExec && execRequest?.status === 'pending' && (
        <div className="mb-5"><Notice notice={{ type: 'success', text: `Your request for executive access (${DEPARTMENTS[execRequest.requested_department].label}) is pending administrator approval.` }} /></div>
      )}
      {!isExec && execRequest?.status === 'rejected' && (
        <div className="mb-5"><Notice notice={{ type: 'error', text: 'Your executive access request was not approved.' }} /></div>
      )}

      {!isExec && (
        <div className="mb-6">
          <ComplaintForm onSent={async (c) => { await load(); setSelectedId(c); setNotice({ type: 'success', text: 'Complaint sent.' }) }}
            onError={(t) => setNotice({ type: 'error', text: t })} />
          {notice && <div className="mt-3"><Notice notice={notice} onClose={() => setNotice(null)} /></div>}
        </div>
      )}

      {isExec && (
        <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input className="input pl-9" placeholder="Search by username or content" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search complaints" />
          </div>
          <select className="input" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value as Department | '')} aria-label="Filter by department">
            <option value="">All departments</option>
            {EXECUTIVE_DEPARTMENTS.map((d) => <option key={d} value={d}>{DEPARTMENTS[d].label}</option>)}
          </select>
          <select className="input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | '')} aria-label="Filter by member type">
            <option value="">All member types</option>
            <option value="member">Member</option>
            <option value="executive_member">Executive member</option>
          </select>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        <section className={selected ? 'hidden lg:block' : ''} aria-label="Complaints">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ink-500" /></div>
          ) : error ? (
            <Notice notice={{ type: 'error', text: error }} />
          ) : visible.length === 0 ? (
            <div className="glass flex flex-col items-center rounded-2xl px-6 py-12 text-center">
              <Inbox className="mb-3 text-ink-500" />
              <p className="font-medium">{complaints.length ? 'No complaint matches your filters' : 'No complaints yet'}</p>
              <p className="mt-1 text-sm text-ink-500">{isExec ? 'New complaints will show up here.' : 'Write your first complaint above.'}</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {visible.map((c) => (
                <li key={c.id}>
                  <button onClick={() => setSelectedId(c.id)} aria-current={c.id === selectedId}
                    className={`glass w-full overflow-hidden rounded-2xl text-left transition hover:bg-white ${c.id === selectedId ? 'ring-2 ring-ink-900/20' : ''}`}>
                    <div className="flex">
                      <span className="w-1.5 shrink-0" style={{ backgroundColor: c.color_code }} />
                      <div className="min-w-0 flex-1 p-3.5">
                        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                          {isExec && <span className="text-sm font-medium">{c.sender_username}</span>}
                          <DeptBadge department={c.department} color={c.color_code} />
                          {isExec && <RoleChip executive={c.sender_role === 'executive_member'} />}
                        </div>
                        <p className="line-clamp-2 text-sm text-ink-700">{c.content}</p>
                        <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
                          <span>{fmt(c.created_at)}</span>
                          <StatusPill replied={c.complaint_replies.length > 0} />
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Conversation" className={selected ? '' : 'hidden lg:block'}>
          {selected ? (
            <>
              <button className="btn-ghost mb-2 lg:hidden" onClick={() => setSelectedId(null)}><ArrowLeft size={16} /> Back</button>
              <Conversation key={selected.id} complaint={selected} canReply={canReply} showSender={isExec} onReplied={load} />
            </>
          ) : (
            <div className="glass hidden items-center justify-center rounded-2xl p-12 text-sm text-ink-500 lg:flex">Select a complaint to open the conversation.</div>
          )}
        </section>
      </div>
    </div>
  )
}
