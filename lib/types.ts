export type RoleType = 'SOC_ANALYST' | 'SOC_LEAD' | 'CISO' | 'IT_ADMIN' | 'LEGAL' | 'EXEC' | 'ADMIN'
export type IncidentStatus = 'OPEN' | 'CONTAINED' | 'RESOLVED' | 'CLOSED' | 'SUSPENDED' | 'ARCHIVED'
export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type StepStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'WAITING_APPROVAL' | 'SUSPENDED'
export type ExperienceLevel = 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD'

export interface AuthUser {
  id: string
  email: string
}

export interface Profile {
  id: string
  email: string
  name: string | null
  role: RoleType
  is_active: boolean
  phone: string | null
  department: string | null
  bio: string | null
  avatar_url: string | null
  experience_level: ExperienceLevel
  notify_email: boolean
  notify_sms: boolean
  timezone: string
  language: string
  total_approvals: number
  total_rejections: number
  total_tasks_completed: number
  created_at: string
  updated_at: string
}

export interface Incident {
  id: string
  status: IncidentStatus
  severity: SeverityLevel
  severity_score: number
  source: string
  assigned_to: string | null
  raw_input: any
  playbook_id: string | null
  priority: number
  sla_deadline: string | null
  sla_breached: boolean
  notify_72h_at: string | null
  compliance_notified: boolean
  created_at: string
  updated_at: string
  resolved_at: string | null
  mttr_minutes: number | null
}

export interface IncidentStep {
  id: string
  incident_id: string
  step_type: string
  step_order: number
  status: StepStatus
  assigned_role: RoleType | null
  assigned_user: string | null
  result: any
  error_detail: string | null
  sla_deadline: string | null
  sla_breached: boolean
  priority: number
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type AuthResult =
  | { user: AuthUser; profile: Profile }
  | { error: string; status: number }
