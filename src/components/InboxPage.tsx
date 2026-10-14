import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Inbox, Loader2, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { DEPARTMENTS, EXECUTIVE_DEPARTMENTS, KINDS } from '../lib/config'
import { canReply, canSubmit, canViewOthers, isDean, isPresident } from '../lib/permissions'
import type { Department, Item, Kind, Profile, Role } from '../types'
import { DeptBadge, RoleChip, StatusPill, fmt } from './Badge'
import ItemForm from './ItemForm'
import Conversation from './Conversation'
import Notice, { type NoticeData } from './Notice'

interface Props { kind: Kind; profile: Profile; onHome: () => void }

function subtitle(p: Profile, kind: Kind): string {
  if (kind === 'complaint') {
    if (isDean(p)) return 'Complaints submitted by executive members. You can reply to each of them.'
    if (p.role === 'executive_member' && p.department === 'hr') return "You can read members' complaints and reply as HR. Your own complaints stay private between you and the dean."
    if (p.role === 'executive_member') return "You can read members' complaints (only HR replies). Your own complaints stay private between you and the dean."
    return 'Share a complaint with the club. Replies from HR appear in the conversation.'
  }
  if (isDean(p)) return 'Ideas shared by members. Only the president can reply.'
  if (isPresident(p)) return 'You can read every idea and reply to it.'
  return 'Only you, the dean and the president can see your ideas. The president can reply.'
}

export default function InboxPage({ kind, profile, onHome }: Props) {
  const cfg = KINDS[kind]
  const viewOthers = canViewOthers(profile, kind)
  const submit = canSubmit(profile)

  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notice, setNotice] = useState<NoticeData | null>(null)
  const [q, setQ] = useState('')
  const [deptFilter, setDeptFilter] = useState<Department | ''>('')
  const [roleFilter, setRoleFilter] = useState<Role | ''>('')

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from(cfg.table)
      .select(`*, ${cfg.repliesTable}(*)`)
      .order('created_at', { ascending: false })
      .order('created_at', { referencedTable: cfg.repliesTable, ascending: true })
    if (error) setError(error.message)
    else {
      setError(null)
      const rows = (data ?? []) as unknown as Array<Record<string, unknown>>
      setItems(rows.map((r) => ({ ...r, replies: (r[cfg.repliesTable] as Item['replies']) ?? [] })) as unknown as Item[])
    }
    setLoading(false)
  }, [cfg])

  useEffect(() => { load() }, [load])

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase()
    return items.filter((c) =>
      (!deptFilter || c.department === deptFilter) &&
      (!roleFilter || c.sender_role === roleFilter) &&
      (!s || c.sender_username.toLowerCase().includes(s) || c.content.toLowerCase().includes(s)))
  }, [items, q, deptFilter, roleFilter])

  const selected = items.find((c) => c.id === selectedId) ?? null
  const replyAs = isDean(profile) ? 'Dean' : isPresident(profile) ? 'President' : 'HR'

  return (
    <div>
      <button className="btn-ghost mb-3 -ml-2" onClick={onHome}><ArrowLeft size={16} /> Back to home</button>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight sm:text-3xl">
        {viewOthers ? `All ${cfg.plural}` : `My ${cfg.plural}`}
      </h1>
      <p className="mb-5 text-sm text-ink-500">{subtitle(profile, kind)}</p>

      {submit && (
        <div className="mb-6">
          <ItemForm kind={kind}
            onSent={async (id) => { await load(); setSelectedId(id); setNotice({ type: 'success', text: `Your ${cfg.singular} was sent.` }) }}
            onError={(t) => setNotice({ type: 'error', text: t })} />
          {notice && <div className="mt-3"><Notice notice={notice} onClose={() => setNotice(null)} /></div>}
        </div>
      )}

      {viewOthers && (
        <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input className="input pl-9" placeholder="Search by username or content" value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Search ${cfg.plural}`} />
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
        <section className={selected ? 'hidden lg:block' : ''} aria-label={cfg.plural}>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ink-500" /></div>
          ) : error ? (
            <Notice notice={{ type: 'error', text: error }} />
          ) : visible.length === 0 ? (
            <div className="glass flex flex-col items-center rounded-2xl px-6 py-12 text-center">
              <Inbox className="mb-3 text-ink-500" />
              <p className="font-medium">{items.length ? `No ${cfg.singular} matches your filters` : `No ${cfg.plural} yet`}</p>
              <p className="mt-1 text-sm text-ink-500">{submit ? `Write your first ${cfg.singular} above.` : `New ${cfg.plural} will show up here.`}</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {visible.map((c) => (
                <li key={c.id}>
                  <button onClick={() => setSelectedId(c.id)} aria-current={c.id === selectedId}
                    className={`glass w-full overflow-hidden rounded-2xl text-left transition hover:bg-white ${c.id === selectedId ? 'ring-2 ring-brand-500/50' : ''}`}>
                    <div className="flex">
                      <span className="w-1.5 shrink-0" style={{ backgroundColor: c.color_code }} />
                      <div className="min-w-0 flex-1 p-3.5">
                        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                          {viewOthers && <span className="text-sm font-medium">{c.sender_id === profile.id ? 'You' : c.sender_username}</span>}
                          <DeptBadge department={c.department} color={c.color_code} />
                          {viewOthers && <RoleChip role={c.sender_role} />}
                        </div>
                        <p className="line-clamp-2 text-sm text-ink-700">{c.content}</p>
                        <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
                          <span>{fmt(c.created_at)}</span>
                          <StatusPill replied={c.replies.length > 0} />
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
              <Conversation key={selected.id} kind={kind} item={selected} canReply={canReply(profile, kind, selected)}
                showSender={viewOthers} replyAs={replyAs} onReplied={load} />
            </>
          ) : (
            <div className="glass hidden items-center justify-center rounded-2xl p-12 text-sm text-ink-500 lg:flex">Select a {cfg.singular} to open the conversation.</div>
          )}
        </section>
      </div>
    </div>
  )
}
