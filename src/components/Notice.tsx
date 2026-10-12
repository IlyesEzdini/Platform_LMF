import { CheckCircle2, XCircle, X } from 'lucide-react'

export interface NoticeData { type: 'success' | 'error'; text: string }

export default function Notice({ notice, onClose }: { notice: NoticeData | null; onClose?: () => void }) {
  if (!notice) return null
  const ok = notice.type === 'success'
  return (
    <div role={ok ? 'status' : 'alert'}
      className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
      {ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
      <span className="flex-1">{notice.text}</span>
      {onClose && <button onClick={onClose} aria-label="Dismiss"><X size={14} /></button>}
    </div>
  )
}
