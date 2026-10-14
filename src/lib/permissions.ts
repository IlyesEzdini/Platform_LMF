import type { Item, Kind, Profile } from '../types'

// UI-only helpers. The real enforcement is done by RLS in supabase/schema.sql.
const isExec = (p: Profile) => p.role === 'executive_member'
export const isDean = (p: Profile) => p.role === 'dean'
export const isPresident = (p: Profile) => isExec(p) && p.department === 'president'

export const canSubmit = (p: Profile) => !isDean(p)

/** Does this user see other people's items (beyond their own)? */
export const canViewOthers = (p: Profile, kind: Kind) =>
  kind === 'complaint' ? isExec(p) || isDean(p) : isDean(p) || isPresident(p)

export function canReply(p: Profile, kind: Kind, item: Item) {
  if (kind === 'idea') return isPresident(p)
  return (isExec(p) && p.department === 'hr' && item.sender_role === 'member')
    || (isDean(p) && item.sender_role === 'executive_member')
}
