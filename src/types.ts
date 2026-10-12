export type Role = 'member' | 'executive_member'
export type Department =
  | 'event' | 'communication' | 'hr' | 'partnership'
  | 'general_secretary' | 'president' | 'vice_president' | 'pap'

export interface Profile {
  id: string
  username: string
  role: Role
  department: Department
  created_at: string
}

export interface ComplaintReply {
  id: string
  complaint_id: string
  responder_id: string
  responder_username: string
  content: string
  created_at: string
}

export interface Complaint {
  id: string
  sender_id: string
  sender_username: string
  content: string
  department: Department
  sender_role: Role
  color_code: string
  created_at: string
  complaint_replies: ComplaintReply[]
}

export interface ExecutiveRequest {
  user_id: string
  requested_department: Department
  status: 'pending' | 'approved' | 'rejected'
}
