export type RoleType = 'SOC_ANALYST' | 'SOC_LEAD' | 'CISO' | 'IT_ADMIN' | 'LEGAL' | 'EXEC' | 'ADMIN'
export type IncidentStatus = 'OPEN' | 'CONTAINED' | 'RESOLVED' | 'CLOSED' | 'SUSPENDED' | 'ARCHIVED'
export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type StepStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'WAITING_APPROVAL'

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
  created_at: string
  updated_at: string
  resolved_at: string | null
  mttr_minutes: number | null
}

export interface IncidentStep {
  id: string
  incident_id: string
  step_type: string
  status: StepStatus
  assigned_role: RoleType | null
  result: any
  error_detail: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type AuthResult =
  | { user: AuthUser; profile: Profile }
  | { error: string; status: number }
