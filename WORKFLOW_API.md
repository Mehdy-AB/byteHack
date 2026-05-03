# Mythos SOAR — Workflow Ingestion API

External AI tools send a structured JSON workflow to this API. The platform creates an incident, queues the steps, and drives them through the engine — pausing at APPROVAL steps for human action.

---

## Authentication

All external endpoints use a shared secret passed in a request header.

| Header | Value |
|--------|-------|
| `x-workflow-secret` | Value of `WORKFLOW_WEBHOOK_SECRET` env var |

Set the secret in your environment:
```
WORKFLOW_WEBHOOK_SECRET=your-secret-here
```

---

## Endpoints

### `POST /api/workflow/execute`

Submit a new workflow. The platform creates an incident and immediately starts executing steps.

**Returns `202 Accepted` on success.**

#### Request body

```json
{
  "source": "string (required) — system that detected the incident, e.g. 'AI Analyzer'",
  "severity": "LOW | MEDIUM | HIGH | CRITICAL (required)",
  "title": "string (required) — human-readable incident name",
  "playbook_id": "string (optional) — e.g. 'PB-IDOR-001'",
  "playbook_version": "string (optional)",
  "ai_confidence": "number 0–1 (optional)",
  "steps": [ /* array of step objects — see below */ ]
}
```

#### Step object

```json
{
  "type": "APPROVAL | INTEGRATION | WEBHOOK | SCRIPT (required)",
  "assignedRole": "SOC_ANALYST | SOC_LEAD | CISO | IT_ADMIN | LEGAL | EXEC | ADMIN (optional)",
  "assignedUser": "uuid (optional) — targets a specific user instead of a role",
  "message": "string (optional) — instruction shown to the assignee",
  "catalogue": "string (optional) — alternate description field",
  "priorityLevel": "LOW | MEDIUM | HIGH | CRITICAL (optional, default MEDIUM)",
  "scheduledTime": "ISO 8601 datetime (optional) — delay execution until this time",

  "integration": "string — required for INTEGRATION steps, e.g. 'WAF_MGMT'",
  "target": "string — required for INTEGRATION/WEBHOOK steps",
  "params": { "key": "value" }
}
```

#### Step types

| Type | Behaviour |
|------|-----------|
| `APPROVAL` | **Pauses the chain.** Notifies the assigned role/user. Workflow resumes only after a human approves or rejects from the dashboard. |
| `INTEGRATION` | Marks the step executed and notifies the assignee. Wire real integrations (WAF, IAM, SIEM) in `engine.ts`. |
| `WEBHOOK` | Same as INTEGRATION — logs the outbound call and notifies. |
| `SCRIPT` | Same as INTEGRATION — logs and notifies. |

Steps run in array order. A `FAILED` step halts the chain. The incident auto-resolves when all steps reach `SUCCESS` or `SKIPPED`.

#### Response

```json
{ "message": "Workflow Accepted", "incidentId": "uuid" }
```

Save `incidentId` to poll status later.

#### Example — full payload

```json
{
  "source": "AI Analyzer",
  "severity": "CRITICAL",
  "title": "Access Control Violation (IDOR) on User Profile Endpoint",
  "playbook_id": "PB-IDOR-001",
  "playbook_version": "1.0",
  "ai_confidence": 0.95,
  "steps": [
    {
      "type": "INTEGRATION",
      "assignedRole": "SOC_ANALYST",
      "message": "Block the attacking IP in the WAF.",
      "integration": "WAF_MGMT",
      "target": "block_rule",
      "params": { "ip_address": "ALERT_SOURCE_IP", "block_duration_minutes": 60 }
    },
    {
      "type": "APPROVAL",
      "assignedRole": "SOC_LEAD",
      "message": "Approve the temporary mitigation strategy.",
      "priorityLevel": "CRITICAL"
    },
    {
      "type": "SCRIPT",
      "assignedRole": "IT_ADMIN",
      "message": "Deploy the approved code fix.",
      "params": { "deployment_package": "app_access_control_patch_v1.0" }
    }
  ]
}
```

#### cURL

```bash
curl -X POST https://your-domain/api/workflow/execute \
  -H "Content-Type: application/json" \
  -H "x-workflow-secret: your-secret-here" \
  -d @payload.json
```

---

### `GET /api/workflow/status/{incidentId}`

Poll the status of a previously submitted workflow.

```bash
curl https://your-domain/api/workflow/status/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \
  -H "x-workflow-secret: your-secret-here"
```

#### Response

```json
{
  "incidentId": "uuid",
  "title": "Access Control Violation (IDOR)...",
  "status": "OPEN | CONTAINED | RESOLVED | CLOSED | SUSPENDED | ARCHIVED",
  "severity": "CRITICAL",
  "source": "AI Analyzer",
  "createdAt": "2026-05-03T10:00:00Z",
  "resolvedAt": null,
  "mttrMinutes": null,
  "progress": {
    "total": 3,
    "completed": 1,
    "failed": 0,
    "waitingApproval": 1,
    "percentComplete": 33
  },
  "steps": [
    { "order": 1, "type": "INTEGRATION", "status": "SUCCESS",          "assignedRole": "SOC_ANALYST", "startedAt": "...", "completedAt": "...", "error": null },
    { "order": 2, "type": "APPROVAL",    "status": "WAITING_APPROVAL", "assignedRole": "SOC_LEAD",    "startedAt": "...", "completedAt": null,  "error": null },
    { "order": 3, "type": "SCRIPT",      "status": "PENDING",          "assignedRole": "IT_ADMIN",    "startedAt": null,  "completedAt": null,  "error": null }
  ]
}
```

#### Incident status values

| Status | Meaning |
|--------|---------|
| `OPEN` | Active, steps in progress |
| `CONTAINED` | Threat contained, final steps running |
| `RESOLVED` | All steps completed successfully |
| `CLOSED` | Manually closed |
| `SUSPENDED` | Paused by an operator |
| `ARCHIVED` | Historical record only |

---

## Error responses

| Code | Meaning |
|------|---------|
| `400` | Invalid JSON or schema validation failed — check `details` field |
| `401` | Missing or wrong `x-workflow-secret` |
| `404` | Incident not found (status endpoint) |
| `500` | Internal server error |

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `WORKFLOW_WEBHOOK_SECRET` | Yes | Shared secret for the external AI tool |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (bypasses RLS) |

---

## Typical AI tool flow

```
1. AI detects an incident and builds a workflow JSON
2. POST /api/workflow/execute  →  receive incidentId
3. Poll GET /api/workflow/status/{incidentId} every 30s
4. When status === "WAITING_APPROVAL" → a human is reviewing in the dashboard
5. When status === "RESOLVED" → workflow complete, read mttrMinutes for SLA data
6. If any step shows status === "FAILED" → inspect the `error` field for that step
```

---

## Zod schema (lib/workflow/schema.ts)

The API validates every payload against this schema before accepting it:

```ts
WorkflowPayloadSchema = z.object({
  source:           z.string(),
  severity:         z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  title:            z.string(),
  playbook_id:      z.string().optional(),
  playbook_version: z.string().optional(),
  ai_confidence:    z.number().min(0).max(1).optional(),
  steps: z.array(z.object({
    type:          z.enum(['APPROVAL', 'INTEGRATION', 'WEBHOOK', 'SCRIPT']),
    assignedRole:  z.enum(['SOC_ANALYST','SOC_LEAD','CISO','IT_ADMIN','LEGAL','EXEC','ADMIN']).optional(),
    assignedUser:  z.string().uuid().optional(),
    message:       z.string().optional(),
    catalogue:     z.string().optional(),
    priorityLevel: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).optional(),
    scheduledTime: z.string().datetime().optional(),
    integration:   z.string().optional(),
    target:        z.string().optional(),
    params:        z.record(z.any()).optional(),
  }))
})
```
