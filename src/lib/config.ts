import type { Department, Kind, Role } from '../types'

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
  dean: { label: 'Dean', color: '#6366F1' },
}

export const MEMBER_DEPARTMENTS: Department[] = ['event', 'communication', 'hr']
export const EXECUTIVE_DEPARTMENTS: Department[] = [
  'event', 'communication', 'hr', 'partnership', 'general_secretary', 'president', 'vice_president', 'pap',
]
export const ROLE_LABELS: Record<Role, string> = { member: 'Member', executive_member: 'Executive member', dean: 'Dean' }

// The dean is never selectable in the UI (assigned manually in the database).
export const departmentsForRole = (role: Role) =>
  role === 'executive_member' ? EXECUTIVE_DEPARTMENTS : role === 'member' ? MEMBER_DEPARTMENTS : []

export const KINDS: Record<Kind, {
  table: string; repliesTable: string; fk: string
  singular: string; plural: string; formTitle: string; placeholder: string; sendLabel: string
}> = {
  complaint: {
    table: 'complaints', repliesTable: 'complaint_replies', fk: 'complaint_id',
    singular: 'complaint', plural: 'complaints', formTitle: 'New complaint',
    placeholder: 'Describe the issue as clearly as you can…', sendLabel: 'Send complaint',
  },
  idea: {
    table: 'ideas', repliesTable: 'idea_replies', fk: 'idea_id',
    singular: 'idea', plural: 'ideas', formTitle: 'Share an idea',
    placeholder: 'What would you like to propose to the club?', sendLabel: 'Send idea',
  },
}
