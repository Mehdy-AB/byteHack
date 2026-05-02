-- Supabase Schema for Silent Fracture SOAR (No Prisma)

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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  mttr_minutes INT
);

CREATE TABLE incident_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  step_type TEXT NOT NULL,
  status step_status DEFAULT 'PENDING',
  assigned_role role_type,
  result JSONB,
  error_detail TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE step_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID REFERENCES incident_steps(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  reason TEXT,
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
