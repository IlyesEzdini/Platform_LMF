import { useState, type FormEvent } from 'react'
import { Loader2, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ComplaintForm({ onSent, onError }: { onSent: (id: string) => void | Promise<void>; onError: (t: string) => void }) {
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [touched, setTouched] = useState(false)
  const invalid = touched && content.trim().length === 0

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    const text = content.trim()
    if (!text) return
    if (text.length > 5000) return onError('A complaint can contain at most 5000 characters.')
    setBusy(true)
    // Only the content is sent. Sender, department, role and color are set by a database trigger.
    const { data, error } = await supabase.from('complaints').insert({ content: text }).select('id').single()
    setBusy(false)
    if (error) return onError(error.message)
    setContent(''); setTouched(false)
    await onSent(data.id)
  }

  return (
    <form onSubmit={submit} className="glass rounded-2xl p-4 sm:p-5">
      <label htmlFor="complaint" className="mb-2 block text-sm font-medium">New complaint</label>
      <textarea id="complaint" rows={5} maxLength={5000} value={content} onChange={(e) => setContent(e.target.value)}
        placeholder="Describe the issue as clearly as you can…" aria-invalid={invalid}
        className={`input resize-y ${invalid ? 'border-red-400' : ''}`} />
      {invalid && <p className="mt-1 text-xs text-red-600">Write something before sending.</p>}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-ink-500">{content.length}/5000</span>
        <button className="btn" disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send complaint
        </button>
      </div>
    </form>
  )
}
