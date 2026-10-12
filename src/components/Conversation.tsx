import { useState, type FormEvent } from 'react'
import { Loader2, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Complaint } from '../types'
import { DeptBadge, RoleChip, fmt } from './Badge'
import Notice, { type NoticeData } from './Notice'

interface Props {
  complaint: Complaint
  canReply: boolean
  showSender: boolean
  onReplied: () => void | Promise<void>
}

export default function Conversation({ complaint, canReply, showSender, onReplied }: Props) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<NoticeData | null>(null)

  const send = async (e: FormEvent) => {
    e.preventDefault()
    const content = text.trim()
    if (!content) return setNotice({ type: 'error', text: 'Write a reply first.' })
    setBusy(true); setNotice(null)
    // Responder identity is set by a database trigger; RLS only allows executive HR members.
    const { error } = await supabase.from('complaint_replies').insert({ complaint_id: complaint.id, content })
    setBusy(false)
    if (error) return setNotice({ type: 'error', text: error.message })
    setText('')
    await onReplied()
  }

  return (
    <div className="glass flex flex-col overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 px-4 py-3">
        {showSender && <span className="font-medium">{complaint.sender_username}</span>}
        <DeptBadge department={complaint.department} color={complaint.color_code} />
        {showSender && <RoleChip executive={complaint.sender_role === 'executive_member'} />}
      </div>

      <div className="space-y-4 p-4" aria-live="polite">
        <div className="max-w-[88%]">
          <div className="rounded-2xl rounded-tl-md border-l-4 bg-white px-4 py-3 text-sm shadow-sm" style={{ borderLeftColor: complaint.color_code }}>
            <p className="whitespace-pre-wrap break-words">{complaint.content}</p>
          </div>
          <p className="mt-1 px-1 text-xs text-ink-500">{fmt(complaint.created_at)}</p>
        </div>

        {complaint.complaint_replies.map((r) => (
          <div key={r.id} className="ml-auto max-w-[88%]">
            <div className="rounded-2xl rounded-tr-md bg-ink-900 px-4 py-3 text-sm text-white">
              <p className="whitespace-pre-wrap break-words">{r.content}</p>
            </div>
            <p className="mt-1 px-1 text-right text-xs text-ink-500">HR · {r.responder_username} · {fmt(r.created_at)}</p>
          </div>
        ))}

        {complaint.complaint_replies.length === 0 && (
          <p className="text-center text-xs text-ink-500">No reply yet.</p>
        )}
      </div>

      {canReply && (
        <form onSubmit={send} className="space-y-2 border-t border-ink-100 p-3">
          <label htmlFor="reply" className="sr-only">Reply</label>
          <textarea id="reply" rows={3} maxLength={5000} className="input resize-y" placeholder="Reply as HR…" value={text} onChange={(e) => setText(e.target.value)} />
          <Notice notice={notice} />
          <div className="flex justify-end">
            <button className="btn" disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send reply</button>
          </div>
        </form>
      )}
    </div>
  )
}
