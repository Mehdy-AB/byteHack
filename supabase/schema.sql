-- Supabase Schema for Silent Fracture SOAR

CREATE TYPE role_type AS ENUM ('SOC_ANALYST', 'SOC_LEAD', 'CISO', 'IT_ADMIN', 'LEGAL', 'EXEC', 'ADMIN');
CREATE TYPE incident_status AS ENUM ('OPEN', 'CONTAINED', 'RESOLVED', 'CLOSED', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE severity_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE step_status AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED', 'WAITING_APPROVAL', 'SUSPENDED');

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role role_type DEFAULT 'SOC_ANALYST',
  is_active BOOLEAN DEFAULT true,
  -- Contact & identity
  phone TEXT,
  department TEXT,
  bio TEXT,
  avatar_url TEXT,
  -- Experience
  experience_level TEXT DEFAULT 'JUNIOR', -- JUNIOR | MID | SENIOR | LEAD
  -- Notification preferences
  notify_email BOOLEAN DEFAULT true,
  notify_sms BOOLEAN DEFAULT false,
  -- Locale
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'en',
  -- Computed stats (updated by triggers or app logic)
  total_approvals INT DEFAULT 0,
  total_rejections INT DEFAULT 0,
  total_tasks_completed INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status incident_status DEFAULT 'OPEN',
  severity severity_level NOT NULL,
  severity_score INT DEFAULT 0,
  source TEXT NOT NULL,
  assigned_to UUID REFERENCES profiles(id),
  raw_input JSONB,
  playbook_id TEXT,
  -- SLA & compliance
  priority INT DEFAULT 5,            -- 1 (highest) – 10 (lowest)
  sla_deadline TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT false,
  notify_72h_at TIMESTAMPTZ,
  compliance_notified BOOLEAN DEFAULT false,
  -- Resolution
  resolved_at TIMESTAMPTZ,
  mttr_minutes INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE incident_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  step_type TEXT NOT NULL,
  step_order INT DEFAULT 0,
  status step_status DEFAULT 'PENDING',
  assigned_role role_type,
  assigned_user UUID REFERENCES profiles(id),
  result JSONB,
  error_detail TEXT,
  -- SLA
  sla_deadline TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT false,
  priority INT DEFAULT 5,
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE step_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID REFERENCES incident_steps(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,   -- APPROVE | REJECT | REPORT | REQUEST_REDESIGN | REASSIGN | SKIP
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_log (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  step_id UUID,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB,
  prev_hash TEXT,
  row_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_assigned_to ON incidents(assigned_to);
CREATE INDEX idx_incident_steps_incident_id ON incident_steps(incident_id);
CREATE INDEX idx_incident_steps_status ON incident_steps(status);
CREATE INDEX idx_incident_steps_assigned_role ON incident_steps(assigned_role);
CREATE INDEX idx_step_actions_actor_id ON step_actions(actor_id);
CREATE INDEX idx_audit_log_incident_id ON audit_log(incident_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor);

-- Migration: if upgrading from old schema, run these:
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience_level TEXT DEFAULT 'JUNIOR';
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_email BOOLEAN DEFAULT true;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_sms BOOLEAN DEFAULT false;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_approvals INT DEFAULT 0;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_rejections INT DEFAULT 0;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_tasks_completed INT DEFAULT 0;
-- ALTER TABLE incidents ADD COLUMN IF NOT EXISTS priority INT DEFAULT 5;
-- ALTER TABLE incidents ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ;
-- ALTER TABLE incidents ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT false;
-- ALTER TABLE incidents ADD COLUMN IF NOT EXISTS notify_72h_at TIMESTAMPTZ;
-- ALTER TABLE incidents ADD COLUMN IF NOT EXISTS compliance_notified BOOLEAN DEFAULT false;
-- ALTER TABLE incidents ADD COLUMN IF NOT EXISTS playbook_id TEXT;
-- ALTER TABLE incident_steps ADD COLUMN IF NOT EXISTS step_order INT DEFAULT 0;
-- ALTER TABLE incident_steps ADD COLUMN IF NOT EXISTS assigned_user UUID REFERENCES profiles(id);
-- ALTER TABLE incident_steps ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ;
-- ALTER TABLE incident_steps ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT false;
-- ALTER TABLE incident_steps ADD COLUMN IF NOT EXISTS priority INT DEFAULT 5;
-- ALTER TABLE step_actions ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES incidents(id);
-- ALTER TABLE step_actions ADD COLUMN IF NOT EXISTS notes TEXT;

-- ── AI Assistant tables (used by api.py — run these in Supabase SQL editor) ──

CREATE TABLE IF NOT EXISTS chat_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT,                          -- NextAuth user UUID or anonymous token
  title            TEXT NOT NULL DEFAULT 'New chat',
  suspected_attack TEXT,                          -- e.g. 'xss', 'sql_injection'
  task_context     TEXT,                          -- raw incident log pasted by user
  user_role        TEXT,                          -- e.g. 'SOC analyst'
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_sessions_user_idx    ON chat_sessions (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON chat_messages (session_id, created_at);
