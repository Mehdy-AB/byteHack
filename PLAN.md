# Silent Fracture — SOAR Platform: Implementation Plan

## Project Context

**Project name:** Silent Fracture — SOAR (Security Orchestration, Automation & Response) Platform  
**Framework:** Next.js 16.2.4 (App Router) + React 19.2.4  
**Stack:** Next.js · Prisma · Supabase · TypeScript · Tailwind CSS  
**Date:** May 2026  
**Phase:** Backend-only — API routes, auth/RBAC, database, core logic

---

## Architecture Overview

```
L1  Client Layer     →  Next.js App Router (React Server + Client Components)
L2  Server Layer     →  Next.js API Routes + Server Actions (Node.js, no separate backend)
L3  ORM Layer        →  Prisma Client (type-safe, schema-driven)
L4  Database Layer   →  Supabase PostgreSQL 15 (hosted, with RLS)
L5  Auth & Storage   →  Supabase Auth (JWT, sessions) + Storage (PDF reports)
L6  AI & Vector      →  Claude API (Sonnet 4.6) + pgvector in Supabase (replaces ChromaDB)
```

### Key Decisions
- **Supabase replaces ChromaDB** — pgvector extension stores embeddings directly in PostgreSQL
- **No separate backend service** — everything runs on Vercel via Next.js
- **Realtime via Supabase** — replaces custom WebSocket server entirely
- **Prisma for all DB access** — type-safe, migrations via `prisma migrate`

---

## File Structure to Build

```
bytehack/
├── prisma/
│   └── schema.prisma                  ← Full DB schema (all models + enums)
├── .env.local.example                 ← All required env vars documented
├── middleware.ts                      ← Auth guard + RBAC route protection
├── lib/
│   ├── types.ts                       ← Shared TypeScript types (re-exports + helpers)
│   ├── prisma.ts                      ← Prisma client singleton
│   ├── auth.ts                        ← Auth helper (requireAuth, getSession, role check)
│   ├── supabase/
│   │   ├── server.ts                  ← Server-side Supabase client (SSR cookies)
│   │   └── client.ts                  ← Browser-side Supabase client
│   ├── actions/
│   │   ├── steps.ts                   ← approveStep, rejectStep, retryStep
│   │   ├── incidents.ts               ← reassignIncident, overrideSeverity, closeIncident
│   │   ├── stats.ts                   ← saveCustomWidget
│   │   └── users.ts                   ← createUser, updateUserRole
│   └── workflow/
│       ├── engine.ts                  ← Step executor (PENDING → RUNNING → SUCCESS/FAILED)
│       └── triage.ts                  ← AI classifier dispatch + playbook matching
├── app/
│   └── api/
│       ├── intake/
│       │   ├── route.ts               ← POST — Wazuh webhook (HMAC-SHA256 verification)
│       │   └── slack/
│       │       └── route.ts           ← POST — Slack /report-incident (Slack signature verify)
│       ├── stats/
│       │   ├── [type]/
│       │   │   └── route.ts           ← GET — summary|incidents|sla|mttr|sources|playbooks
│       │   └── custom/
│       │       └── route.ts           ← POST — Custom metric builder (JWT + SOC_LEAD+)
│       ├── compliance/
│       │   ├── report/
│       │   │   └── route.ts           ← GET — Law 18-07 PDF report (JWT + CISO/LEGAL)
│       │   └── chain/
│       │       └── route.ts           ← GET — Audit hash chain verification (JWT + CISO)
│       └── ai/
│           └── classify/
│               └── route.ts           ← POST — Internal AI classification (engine only)
```

---

## Database Schema (Prisma)

### Enums

```prisma
enum Role {
  SOC_ANALYST
  SOC_LEAD
  CISO
  IT_ADMIN
  LEGAL
  EXEC
  ADMIN
}

enum IncidentStatus { OPEN  CONTAINED  RESOLVED  CLOSED  SUSPENDED }
enum Severity       { LOW   MEDIUM     HIGH      CRITICAL }
enum Source         { WAZUH SLACK      EMAIL     WEB_FORM }
enum StepType       { AUTOMATED  MANUAL  APPROVAL  LEGAL  AI_ASSISTED }
enum StepStatus     { PENDING  RUNNING  SUCCESS  FAILED  SKIPPED  WAITING_APPROVAL }
```

### Models

| Model | Key Fields | Relations |
|-------|-----------|-----------|
| `Profile` | id (UUID = auth.users.id), email, name, role, isActive | → Incident (assignee), StepAction (actor) |
| `Incident` | id, status, severity, severityScore, playbookId, source, assignedTo, aiConfidence, incidentType, indicators, rawInput, notify72hAt, complianceNotified, resolvedAt, mttrMinutes | → Profile, IncidentStep[], AuditLog[] |
| `IncidentStep` | id, incidentId, stepId, stepType, status, assignedRole, result, errorDetail, startedAt, completedAt | → Incident, StepAction[] |
| `StepAction` | id, stepId, actorId, action (APPROVE/REJECT/SKIP), reason | → IncidentStep, Profile |
| `AuditLog` | id (BigInt autoincrement), incidentId, stepId, actor, action, status, payload, compliance[], prevHash, rowHash | → Incident |
| `PlaybookEmbedding` | Raw SQL only (vector type not in Prisma) — managed via Supabase SQL editor |

### Row Level Security (Supabase)

```sql
-- incidents: analyst sees only their own; SOC_LEAD+ sees all
CREATE POLICY analyst_own_incidents ON incidents FOR SELECT
  USING (auth.uid() = assigned_to
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SOC_LEAD','CISO','ADMIN'));

-- incidents: only SOC_LEAD+ can update
CREATE POLICY lead_update_incidents ON incidents FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('SOC_LEAD','CISO','ADMIN'));

-- audit_log: SELECT for SOC_LEAD+, NO update/delete for anyone
CREATE POLICY read_audit ON audit_log FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('SOC_LEAD','CISO','ADMIN','LEGAL'));
```

### pgvector (raw SQL — after prisma migrate)

```sql
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE TABLE playbook_embeddings (
  id        TEXT PRIMARY KEY,           -- e.g. "PB-001"
  descriptor TEXT NOT NULL,
  embedding  vector(384)                -- all-MiniLM-L6-v2 dimensions
);
CREATE INDEX ON playbook_embeddings USING ivfflat (embedding vector_cosine_ops);
```

---

## Auth & RBAC Design

### Supabase Auth Config

| Setting | Value |
|---------|-------|
| Email auth | Enabled |
| Magic links | Disabled (password only) |
| Session duration | 8 hours |
| Email confirmation | Disabled (admin creates accounts) |

### Middleware Strategy (`middleware.ts`)

Uses `@supabase/ssr` + `createServerClient` to:
1. Refresh the session cookie on every request
2. Redirect unauthenticated users to `/login` for `/dashboard/*` and `/admin/*`
3. Enforce ADMIN role for `/admin/*` paths

```
Request → middleware → [no session?] → redirect /login
                    → [session, wrong role?] → redirect /dashboard
                    → NextResponse.next() (session cookie refreshed)
```

### API Route Auth Helper (`lib/auth.ts`)

```typescript
// Usage in any API route:
const result = await requireAuth(request, ['SOC_LEAD', 'CISO', 'ADMIN'])
if ('error' in result) return Response.json({ error: result.error }, { status: result.status })
const { user, profile } = result
```

Internally:
1. Creates Supabase client from request cookies
2. Calls `supabase.auth.getUser()` (validates JWT with Supabase, not just decodes)
3. Queries `prisma.profile.findUnique()` to get role + isActive
4. Returns `{ user, profile }` or `{ error, status }`

### Role Hierarchy

```
ADMIN > CISO > SOC_LEAD > SOC_ANALYST
                        > IT_ADMIN
              LEGAL (compliance read-only)
              EXEC  (dashboard read-only)
```

---

## API Routes Detail

### POST `/api/intake` — Wazuh Webhook

- **Auth:** Public endpoint + HMAC-SHA256 signature verification (`X-Hub-Signature-256` header)
- **Body:** Wazuh alert JSON → parsed into `rawInput`
- **Flow:**
  1. Verify HMAC with `WAZUH_WEBHOOK_SECRET`
  2. Create `Incident` (status OPEN, source WAZUH, severity from Wazuh level)
  3. Append to `AuditLog` (actor: SYSTEM)
  4. Dispatch to triage engine (async, non-blocking via `void`)
  5. Return `202 Accepted`

### POST `/api/intake/slack` — Slack Slash Command

- **Auth:** Slack signing secret (`X-Slack-Signature` + `X-Slack-Request-Timestamp`)
- **Body:** `application/x-www-form-urlencoded` Slack payload
- **Flow:**
  1. Verify signature using `SLACK_SIGNING_SECRET` + timestamp (replay attack prevention: reject if timestamp > 5 min old)
  2. Parse `text` field for incident description
  3. Create `Incident` (source SLACK)
  4. Return Slack JSON response (immediate acknowledgement)

### GET `/api/stats/[type]` — Statistics

- **Auth:** JWT required (any authenticated user)
- **Types & Queries:**

| type | Prisma query |
|------|-------------|
| `summary` | Count by status/severity + SLA breaches + Law 18-07 overdue |
| `incidents` | `$queryRaw` GROUP BY DATE_TRUNC, filtered by `range` + `group` param |
| `sla` | Ratio of incidents with no SLA breach in time range |
| `mttr` | `aggregate._avg.mttrMinutes` where resolved in range |
| `sources` | `groupBy(['source'])` with `_count` |
| `playbooks` | `groupBy(['playbookId'])` with `_count` |

- **Query params:** `range` (e.g. `30d`, `7d`), `group` (day/week/month/severity)

### POST `/api/stats/custom` — Custom Metric Builder

- **Auth:** JWT + role `SOC_LEAD` or higher
- **Body:**
  ```json
  {
    "metric": "count|avg_mttr|avg_mttc|sla_rate|avg_confidence",
    "group_by": "day|week|month|severity|playbook_id|source",
    "filters": { "severity": ["HIGH","CRITICAL"], "source": ["WAZUH"] },
    "range": { "from": "ISO date", "to": "ISO date" }
  }
  ```
- **Response:** `{ labels[], values[], total, metric, group_by }`

### GET `/api/compliance/report` — Law 18-07 PDF

- **Auth:** JWT + role `CISO` or `LEGAL`
- **Query param:** `incident=<id>`
- **Flow:** Fetches incident + steps + audit log → returns structured JSON (PDF generation deferred to frontend with `jspdf`)

### GET `/api/compliance/chain` — Audit Hash Chain Verification

- **Auth:** JWT + role `CISO`
- **Query param:** `incident=<id>` (optional; verifies full org log if absent)
- **Flow:**
  1. Fetch all `AuditLog` rows ordered by `id` ASC
  2. Recompute each row's SHA-256 hash from `(incidentId + actor + action + status + prevHash)`
  3. Compare with stored `rowHash`
  4. Return `{ valid: boolean, tampered: number[], total: number }`

### POST `/api/ai/classify` — Internal AI Classification

- **Auth:** Internal only — verified by `X-Internal-Secret` header (shared secret, never public)
- **Body:** `{ incidentId, rawInput, indicators }`
- **Flow:** Calls `lib/workflow/triage.ts` → returns classification result
- **Note:** Not called by clients — only by the workflow engine server-side

---

## Server Actions Detail

All server actions use `'use server'` directive and validate auth/role server-side via `lib/auth.ts`.

### `lib/actions/steps.ts`

| Action | Role Required | What it does |
|--------|--------------|--------------|
| `approveStep(stepId, reason)` | Role matching `assignedRole` on the step | Updates step status → SUCCESS, creates StepAction, appends AuditLog |
| `rejectStep(stepId, reason)` | Same + reason mandatory | Updates step → FAILED, creates StepAction(REJECT) |
| `retryStep(stepId)` | SOC_LEAD+ | Resets step to PENDING, clears errorDetail |

### `lib/actions/incidents.ts`

| Action | Role Required | What it does |
|--------|--------------|--------------|
| `reassignIncident(id, userId)` | SOC_LEAD+ | Updates `assignedTo`, appends AuditLog |
| `overrideSeverity(id, severity)` | SOC_LEAD+ | Updates severity + severityScore, appends AuditLog |
| `closeIncident(id, notes)` | SOC_LEAD+ | Sets status CLOSED, sets resolvedAt, calculates mttrMinutes, appends AuditLog |

### `lib/actions/stats.ts`

| Action | Role Required | What it does |
|--------|--------------|--------------|
| `saveCustomWidget(config)` | Any authenticated | Upserts into `user_widgets` table (raw Prisma) |

### `lib/actions/users.ts`

| Action | Role Required | What it does |
|--------|--------------|--------------|
| `createUser(data)` | ADMIN | Creates Supabase Auth user (admin client) + `Profile` row |
| `updateUserRole(id, role)` | ADMIN | Updates `Profile.role`, appends AuditLog |

---

## Workflow Engine

### `lib/workflow/engine.ts`

Executes playbook steps one by one. Each step type has a handler:

```
AUTOMATED   → external API call (MDM, firewall, etc.) → mark SUCCESS/FAILED
MANUAL      → create step in DB with PENDING, notify via Realtime → wait for human action
APPROVAL    → create step WAITING_APPROVAL → wait for StepAction (APPROVE/REJECT)
LEGAL       → create step with 72h SLA timer, set notify72hAt on Incident
AI_ASSISTED → call /api/ai/classify internally → use result to continue
```

### `lib/workflow/triage.ts`

1. Calls pgvector similarity search on `playbook_embeddings` to find best-matching playbook
2. Calls Claude API for structured JSON classification
3. Returns `{ playbookId, incidentType, severity, aiConfidence, indicators }`

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # server-only

# Prisma
DATABASE_URL=postgresql://...pooler...?pgbouncer=true   # pooler for runtime
DIRECT_URL=postgresql://...direct...                    # direct for migrations

# Claude AI
ANTHROPIC_API_KEY=sk-ant-...

# Webhook secrets
WAZUH_WEBHOOK_SECRET=...
INTERNAL_API_SECRET=...                    # for /api/ai/classify internal calls

# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
```

---

## Next.js 16 Breaking Changes Applied

| Change | How handled |
|--------|-------------|
| `params` is a Promise | `const { type } = await params` in all dynamic routes |
| `cookies()` is async | `const cookieStore = await cookies()` |
| `headers()` is async | `const headersList = await headers()` |
| GET handlers no longer cached by default | Explicit `export const dynamic = 'force-dynamic'` where needed |
| `@supabase/auth-helpers-nextjs` deprecated | Using `@supabase/ssr` with `createServerClient` |

---

## Packages to Install

```bash
# Runtime
npm install @prisma/client @supabase/supabase-js @supabase/ssr zod

# Dev
npm install -D prisma
```

---

## Implementation Order

1. **Packages** — install runtime + dev deps
2. **Prisma schema** — `prisma/schema.prisma` with all models/enums
3. **Env example** — `.env.local.example`
4. **Lib foundation**:
   - `lib/prisma.ts` (singleton)
   - `lib/supabase/server.ts` + `lib/supabase/client.ts`
   - `lib/types.ts` (re-exports + helpers)
   - `lib/auth.ts` (requireAuth, getSession)
5. **Middleware** — `middleware.ts`
6. **API Routes** (all 7 endpoints)
7. **Server Actions** (steps, incidents, stats, users)
8. **Workflow engine** — `lib/workflow/engine.ts` + `lib/workflow/triage.ts`
9. **AI layer** — `lib/ai/classify.ts` + `lib/ai/embeddings.ts` (deferred)

---

## Supabase Setup Checklist

Before running `prisma migrate dev`, execute in Supabase SQL editor:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Enable Realtime on these tables:
ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE incident_steps;

-- RLS policies (see section above)
-- pgvector table (after migration)
```

---

## Status

| Item | Status |
|------|--------|
| Architecture doc extracted | ✅ Done |
| Next.js 16 docs read | ✅ Done |
| Package list defined | ✅ Ready |
| Prisma schema | ✅ Done |
| Env example | ✅ Done |
| Lib foundation | ✅ Done |
| Middleware | ✅ Done |
| API routes | ✅ Done |
| Server actions | ✅ Done |
| Workflow engine | ✅ Done |
| AI layer | ✅ Done |
| Frontend pages | 🔲 Out of current scope |
