import { DEPARTMENTS, ROLE_LABELS } from '../lib/config'
import type { Department, Role } from '../types'

export function DeptBadge({ department, color }: { department: Department; color?: string }) {
  const c = color ?? DEPARTMENTS[department].color
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${c}1f`, color: c, boxShadow: `inset 0 0 0 1px ${c}40` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
      {DEPARTMENTS[department].label}
    </span>
  )
}

export function RoleChip({ role }: { role: Role }) {
  const cls = role === 'dean' ? 'bg-indigo-600 text-white' : role === 'executive_member' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-700'
  return <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>{role === 'executive_member' ? 'Executive' : ROLE_LABELS[role]}</span>
}

export function StatusPill({ replied }: { replied: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${replied ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
      {replied ? 'Replied' : 'Awaiting reply'}
    </span>
  )
}

export const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
