# Silent Fracture SOAR: Technical Documentation

A strictly serverless, high-performance Security Orchestration, Automation, and Response (SOAR) platform built on **Next.js 16 (App Router)** and powered by **Supabase**.

---

## 1. Deep Architecture & System Logic

Unlike traditional Node.js/Express backends with long-running daemons, Silent Fracture is entirely **serverless**. Execution happens on-demand via Vercel Edge/Node functions and Supabase's high-speed Postgres instance.

### The Lifecycle of an Incident

1. **Intake & Validation**: 
   - An external service sends a JSON payload to `POST /api/workflow/execute`.
   - The route verifies the `X-Workflow-Secret` cryptographic header.
   - The payload is passed through a strict **Zod Schema** (`lib/workflow/schema.ts`). It explicitly validates compliance metadata like `playbook_id` and checks the exact `step_type`.
2. **Database Staging**:
   - The verified payload creates a parent row in the `incidents` table. The raw payload (including AI confidence scores) is permanently stored here.
   - The array of `steps` from the payload is bulk-inserted into `incident_steps` with a status of `PENDING`.
3. **Engine Dispatch**:
   - The `processWorkflowSteps(incident_id)` function is fired asynchronously.
   - **Critical Execution Safety**: The engine is wrapped in Vercel's `waitUntil()` function. This prevents the serverless environment from killing the asynchronous workflow midway through execution after the API has already returned a `202 Accepted` response.
4. **Sequential Execution (`lib/workflow/engine.ts`)**:
   - **Suspension Check:** The engine first queries the incident. If the status is `SUSPENDED`, the engine immediately halts.
   - **Scheduling Check:** For each step, it checks the `scheduledTime` field. If the timestamp is in the future, the engine skips the step (leaving it `PENDING`).
   - **Processing:** 
     - Updates the step status to `RUNNING`.
     - Switches logic based on `step_type`:
       - `EMAIL` / `SMS`: Calls the **Resend** or **Twilio** APIs.
       - `INTEGRATION` / `WEBHOOK` / `SCRIPT`: Executes external integrations (e.g., locking an MDM profile) using the provided `target` and `params`.
       - `APPROVAL`: Queries the `profiles` table to resolve the email address of the `assignedUser` (or role) and sends an automated notification email, then halts.
   - **State Resolution**: Updates the step to `SUCCESS` (or `WAITING_APPROVAL`).
   - **Audit Hashing**: Writes the action to the `audit_log` table to establish the compliance chain.

---

## 2. End-to-End Execution Scenario

**Scenario: Ransomware Playbook (PB-003)**
1. **Detection**: The Wazuh SIEM detects a ransomware IOC on a finance laptop. It forwards the logs to the Python AI Analysis service.
2. **Analysis**: The AI identifies this as a `CRITICAL` threat, matches it to playbook `PB-003`, and generates a response plan. It POSTs the JSON payload to our Next.js `/api/workflow/execute` endpoint.
3. **Ingestion**: Next.js validates the JSON. It creates Incident `#992`, logs the `playbook_id` as compliance evidence, and stages three steps: 
   - `INTEGRATION` (Isolate Endpoint via CrowdStrike)
   - `SMS` (Alert the CISO immediately)
   - `APPROVAL` (Wait for SOC Lead to authorize a full domain-password reset).
4. **Execution**: The `waitUntil()` wrapper triggers the engine. The engine fires off the `INTEGRATION` API call to isolate the laptop. It sends the `SMS`. It then sees the `APPROVAL` step, emails the `SOC_LEAD`, sets the step to `WAITING_APPROVAL`, and goes to sleep.
5. **Human Intervention**: The SOC Lead logs into the dashboard. They read the incident details and click "Approve" on the pending task.
6. **Resolution**: The Next.js Server Action `approveStep()` executes. It updates the step to `SUCCESS`, cryptographically hashes the SOC Lead's User ID into the `audit_log` to prove they authorized it, and calls `waitUntil(processWorkflowSteps)` to wake the engine back up and finish the remaining workflow.

---

## 3. Detailed Data Models

The database utilizes highly relational Supabase SQL. 

### `incidents`
The root entity representing a security event.
- **`status` (Enum):** `OPEN`, `CONTAINED`, `RESOLVED`, `CLOSED`, `SUSPENDED`, `ARCHIVED`. *(Note: Law 18-07 requires 7-year retention. Deleting incidents is strictly forbidden. Instead, they are moved to the `ARCHIVED` status)*.
- **`severity` (Enum):** `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- **`raw_input` (JSONB):** Stores the exact immutable JSON payload.

### `incident_steps`
The individual execution blocks tied to an incident.
- **`step_type` (String):** Maps to `EMAIL`, `SMS`, `APPROVAL`, `INTEGRATION`, `WEBHOOK`, `SCRIPT`.

### `audit_log`
A mathematically immutable ledger required for Law 18-07 compliance.
- Supabase Row Level Security ensures **NO USER**, not even an `ADMIN`, has `UPDATE` or `DELETE` permissions on this table. It is strictly `INSERT` only.
- **The Cryptographic Chain:** Every row calculates a `row_hash` using: `SHA256(incident_id + actor + action + status + prev_hash + payload)`. 

---

## 4. Workflow JSON Payload Schema

The external analysis service **must** post this exact structure to `/api/workflow/execute`.

```json
{
  "playbook_id": "PB-003",
  "playbook_version": "1.2",
  "ai_confidence": 0.98,
  "source": "WAZUH",
  "severity": "CRITICAL",
  "title": "Ransomware detection on Host XYZ",
  "steps": [
    {
      "type": "INTEGRATION",
      "integration": "crowdstrike_isolate",
      "target": "DESKTOP-Finance-03",
      "params": { "aggressive": true }
    },
    {
      "type": "APPROVAL",
      "assignedRole": "SOC_LEAD",
      "message": "Do you authorize forcing a global password reset?",
      "notifyOnAssign": true
    }
  ]
}
```

---

## 5. REST API Endpoint Reference

### Intake & User Endpoints
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/workflow/execute` | `POST` | `X-Workflow-Secret` | Ingests JSON payload, creates DB rows, triggers engine via `waitUntil`. |
| `/api/user/tasks` | `GET` | Authenticated JWT | Returns `PENDING` / `WAITING_APPROVAL` steps assigned to the caller. |

### Admin Monitoring APIs
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/admin/incidents` | `GET` | `SOC_LEAD+` | Supports URL queries: `?status=OPEN`, `?severity=CRITICAL`, `?sortBy=severity_score`, `?page=1` |
| `/api/admin/steps` | `GET` | `SOC_LEAD+` | Supports URL queries: `?status=FAILED`, `?type=INTEGRATION`, `?incident_id=<uuid>` |

### Compliance APIs
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/compliance/chain` | `GET` | `CISO+` | Requires `?incident=<uuid>`. Server re-calculates all SHA-256 hashes to prove no database tampering has occurred. |

---

## 6. Admin Server Actions (Compliance Guarded)

Server Actions (`lib/actions/*.ts`) handle state mutation directly from the frontend, bypassing REST routes for speed.

### Standard Operations
- **`approveStep(stepId, reason)`**: Analyst authorizes an `APPROVAL` step.
- **`rejectStep(stepId, reason)`**: Analyst denies an `APPROVAL` step. Changes status to `FAILED`.

### Deep Administration (Overrides)
- **`archiveIncident(incidentId)`**: Gracefully archives an incident. Hard-deletes are forbidden to preserve the audit trail.
- **`correctStepPayload(stepId, correctedPayload, reason)`**: Replaces a malformed payload on a `PENDING` step. To maintain audit integrity, it inserts *both* the original and corrected payloads into the `audit_log` so auditors know exactly why the data was altered.
- **`suspendWorkflow(incidentId)`** / **`resumeWorkflow(incidentId)`**: Halts or restarts the engine mid-execution.
- **`rollbackStep(stepId)`**: Resets a `FAILED` or completed step back to `PENDING` to re-run it.
- **`skipStep(stepId)`**: Forces the engine to abandon a step, marking it `SKIPPED`.
