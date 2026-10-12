import type { Department, Role } from '../types'

/**
 * UI labels + fallback colors. The authoritative color of a complaint is the
 * `color_code` stored by the database (table `department_colors`, see schema.sql).
 * To change a color: update that table AND the fallback here.
 */
export const DEPARTMENTS: Record<Department, { label: string; color: string }> = {
  event: { label: 'Event', color: '#3B82F6' },
  communication: { label: 'Communication', color: '#8B5CF6' },
  hr: { label: 'HR', color: '#EF4444' },
  partnership: { label: 'Partnership', color: '#22C55E' },
  general_secretary: { label: 'General Secretary', color: '#F97316' },
  president: { label: 'President', color: '#D4A017' },
  vice_president: { label: 'Vice President', color: '#14B8A6' },
  pap: { label: 'PAP', color: '#EC4899' },
}

export const MEMBER_DEPARTMENTS: Department[] = ['event', 'communication', 'hr']
export const EXECUTIVE_DEPARTMENTS: Department[] = [
  'event', 'communication', 'hr', 'partnership', 'general_secretary', 'president', 'vice_president', 'pap',
]
export const ROLE_LABELS: Record<Role, string> = { member: 'Member', executive_member: 'Executive member' }

export const departmentsForRole = (role: Role) =>
  role === 'executive_member' ? EXECUTIVE_DEPARTMENTS : MEMBER_DEPARTMENTS
