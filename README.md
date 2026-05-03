# Silent Fracture SOAR

A serverless Security Orchestration, Automation, and Response (SOAR) platform built on **Next.js 16 (App Router)** and **Supabase**. An external AI tool sends a structured JSON workflow; the platform ingests it, stages the steps in the database, and drives sequential human-approved execution — pausing at each step until the assigned user signs off.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ |
| Supabase account | [supabase.com](https://supabase.com) |
| Resend account (email) | [resend.com](https://resend.com) — optional in dev |
| Twilio account (SMS) | [twilio.com](https://twilio.com) — optional in dev |

---

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url>
cd bytehack-new
npm install
```

### 2. Configure environment variables

Copy the example file and fill in each value:

```bash
cp .env.local.example .env.local
```

Open `.env.local` and set:

```env
# NextAuth — generate the secret with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<your-random-secret>

# Supabase (from Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # server-only, never expose to browser

# Workflow ingestion secret — any long random string
WORKFLOW_WEBHOOK_SECRET=change-me

# Resend (email notifications) — skip in dev to use console mock
RESEND_API_KEY=re_...

# Twilio (SMS notifications) — skip in dev to use console mock
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```

> **Tip:** If `RESEND_API_KEY` or Twilio credentials are absent, the notification functions fall back to `console.log` mock messages — no errors thrown in development.

### 3. Set up Supabase

#### a. Create a new Supabase project

Go to [supabase.com](https://supabase.com), create a project, and copy the API credentials into `.env.local`.

#### b. Run the schema

In the Supabase Dashboard → **SQL Editor**, paste and run the full contents of [`supabase/schema.sql`](supabase/schema.sql). This creates all tables, enums, and indexes.

#### c. Enable Supabase Auth

In **Authentication → Providers**, make sure the **Email** provider is enabled. Disable email confirmation for development:

- Authentication → Settings → **Disable email confirmations** (dev only)

### 4. Create your first user

Use the Supabase Dashboard → **Authentication → Users → Invite user** to create the first account, then:

1. Open **Table Editor → profiles**
2. Find the row for your user
3. Set `role` to `ADMIN` and `is_active` to `true`

All subsequent users can be managed through the platform's admin panel at `/admin/users`.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the credentials you created.

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint check |

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXTAUTH_URL` | Yes | Full URL of the app (`http://localhost:3000` in dev) |
| `NEXTAUTH_SECRET` | Yes | Random secret for JWT signing — `openssl rand -base64 32` |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only, bypasses RLS) |
| `WORKFLOW_WEBHOOK_SECRET` | Yes | Shared secret sent by the external AI tool in `x-workflow-secret` header |
| `RESEND_API_KEY` | No | Resend API key for email notifications |
| `TWILIO_ACCOUNT_SID` | No | Twilio Account SID for SMS |
| `TWILIO_AUTH_TOKEN` | No | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | No | Twilio sender phone number (E.164 format, e.g. `+12297851959`) |
| `NEXT_PUBLIC_APP_URL` | No | Public URL used in notification links (falls back to `http://localhost:3000`) |

---

## Sending a Test Workflow

Once running, submit a test workflow from the terminal:

```bash
curl -X POST http://localhost:3000/api/workflow/execute \
  -H "Content-Type: application/json" \
  -H "x-workflow-secret: change-me" \
  -d '{
    "source": "Test",
    "severity": "HIGH",
    "title": "Test Incident",
    "steps": [
      {
        "type": "APPROVAL",
        "assignedRole": "SOC_ANALYST",
        "message": "Please review and approve this test step."
      }
    ]
  }'
```

Log in as a `SOC_ANALYST` user, go to **My Tasks**, and you will see the step waiting for approval.

For the full external API reference see [`WORKFLOW_API.md`](WORKFLOW_API.md).

---

## Upgrading an Existing Database

If you already have an older schema, run the migration statements at the bottom of [`supabase/schema.sql`](supabase/schema.sql) (they are commented as `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).

---

## Project Structure

```
app/              Next.js App Router — pages and API routes
components/       React UI components
lib/
  actions/        Next.js Server Actions (approve, reject, reassign…)
  supabase/       Supabase client factories (server + browser)
  workflow/       Engine, initializer, Zod schema
  auth.ts         requireAuth() RBAC guard
  notifications.ts  Resend + Twilio wrappers
  types.ts        Shared TypeScript types
supabase/
  schema.sql      Full PostgreSQL schema
```

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full system design.
