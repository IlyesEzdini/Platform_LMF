export type Role = 'member' | 'executive_member' | 'dean'
export type Department =
  | 'event' | 'communication' | 'hr' | 'partnership'
  | 'general_secretary' | 'president' | 'vice_president' | 'pap' | 'dean'

export type Kind = 'complaint' | 'idea'

export interface Profile {
  id: string
  username: string
  role: Role
  department: Department
  created_at: string
}

export interface Reply {
  id: string
  responder_id: string
  responder_username: string
  responder_title: string
  content: string
  created_at: string
}

/** A complaint or an idea (same shape; replies are normalized into `replies`). */
export interface Item {
  id: string
  sender_id: string
  sender_username: string
  content: string
  department: Department
  sender_role: Role
  color_code: string
  created_at: string
  replies: Reply[]
}

export interface ExecutiveRequest {
  user_id: string
  requested_department: Department
  status: 'pending' | 'approved' | 'rejected'
}
