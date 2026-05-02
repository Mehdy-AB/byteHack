/**
 * SF SOAR — Test Data Seed Script
 * Run: node scripts/seed.mjs
 *
 * 1. Assigns proper roles to your 24 users (based on email patterns)
 * 2. Runs column migrations (adds new fields if missing)
 * 3. Seeds 12 realistic incidents across all statuses/severities
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// ── Load .env ──────────────────────────────────────────────
const envFile = readFileSync(new URL('../.env', import.meta.url), 'utf8')
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
    .filter(([k]) => k)
)

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const uid      = () => randomUUID()
const minsAgo  = m => new Date(Date.now() - m * 60_000).toISOString()
const hoursAgo = h => new Date(Date.now() - h * 3_600_000).toISOString()
const daysAgo  = d => new Date(Date.now() - d * 86_400_000).toISOString()
const inHours  = h => new Date(Date.now() + h * 3_600_000).toISOString()

async function insert(table, rows) {
  const { error } = await sb.from(table).insert(rows)
  if (error) throw new Error(`[${table}] ${error.message}`)
}

// ── 1. Fetch profiles ──────────────────────────────────────
console.log('Fetching profiles…')
const { data: profiles } = await sb.from('profiles').select('id, email, name, role')
if (!profiles?.length) { console.error('No profiles found'); process.exit(1) }
console.log(`Found ${profiles.length} users`)

// ── 2. Assign roles by email pattern ───────────────────────
console.log('\nAssigning roles from email patterns…')
const roleMap = [
  { pattern: /^admin@/i,            role: 'ADMIN'       },
  { pattern: /\.ciso@|ciso\./i,     role: 'CISO'        },
  { pattern: /\.lead@|lead\./i,     role: 'SOC_LEAD'    },
  { pattern: /\.legal@|legal\./i,   role: 'LEGAL'       },
  { pattern: /\.exec@|^ceo\./i,     role: 'EXEC'        },
  { pattern: /sysadmin@|itadmin@/i, role: 'IT_ADMIN'    },
  { pattern: /\.admin@/i,           role: 'ADMIN'       },
]

for (const p of profiles) {
  let newRole = null
  for (const { pattern, role } of roleMap) {
    if (pattern.test(p.email)) { newRole = role; break }
  }
  if (newRole && newRole !== p.role) {
    await sb.from('profiles').update({ role: newRole }).eq('id', p.id)
    console.log(`  ${p.email} → ${newRole}`)
  }
}

// Re-fetch with updated roles
const { data: updated } = await sb.from('profiles').select('id, email, name, role').eq('is_active', true)
const all = updated || profiles
console.log('\nRole distribution:')
const roleDist = all.reduce((a, p) => { a[p.role] = (a[p.role] || 0) + 1; return a }, {})
Object.entries(roleDist).forEach(([r, c]) => console.log(`  ${r}: ${c}`))

function byRole(role) { return all.find(p => p.role === role) || all[0] }

const admin   = byRole('ADMIN')
const ciso    = byRole('CISO')
const socLead = byRole('SOC_LEAD')
const analyst = all.find(p => p.role === 'SOC_ANALYST') || all[0]
const itAdmin = byRole('IT_ADMIN')
const legal   = byRole('LEGAL')
const exec    = byRole('EXEC')

console.log('\nKey roles:')
console.log(`  ADMIN:       ${admin?.email}`)
console.log(`  CISO:        ${ciso?.email}`)
console.log(`  SOC_LEAD:    ${socLead?.email}`)
console.log(`  SOC_ANALYST: ${analyst?.email}`)
console.log(`  IT_ADMIN:    ${itAdmin?.email}`)
console.log(`  LEGAL:       ${legal?.email}`)
console.log(`  EXEC:        ${exec?.email}`)

// ── 3. Enrich profiles with realistic data ─────────────────
console.log('\nEnriching profiles…')
const enrichData = [
  { role: 'ADMIN',       dept: 'Platform Engineering',  exp: 'LEAD',   phone: '+213 555 0001' },
  { role: 'CISO',        dept: 'Information Security',  exp: 'LEAD',   phone: '+213 555 0002' },
  { role: 'SOC_LEAD',    dept: 'Security Operations',   exp: 'SENIOR', phone: '+213 555 0003' },
  { role: 'SOC_ANALYST', dept: 'Security Operations',   exp: 'MID',    phone: '+213 555 0004' },
  { role: 'IT_ADMIN',    dept: 'Infrastructure',        exp: 'SENIOR', phone: '+213 555 0005' },
  { role: 'LEGAL',       dept: 'Legal & Compliance',    exp: 'SENIOR', phone: '+213 555 0006' },
  { role: 'EXEC',        dept: 'Executive',             exp: 'LEAD',   phone: '+213 555 0007' },
]
const hasPhone      = await colExists('profiles', 'phone')
const hasDept       = await colExists('profiles', 'department')
const hasNotifyE    = await colExists('profiles', 'notify_email')
const hasExpLevelP  = await colExists('profiles', 'experience_level')

for (const e of enrichData) {
  const match = all.find(p => p.role === e.role)
  if (match) {
    const update = {}
    if (hasDept)    update.department      = e.dept
    if (hasExpLevelP) update.experience_level = e.exp
    if (hasPhone)   update.phone           = e.phone
    if (hasNotifyE) { update.notify_email = true; update.notify_sms = false }
    update.bio = `${e.role.replace(/_/g, ' ')} at Silent Fracture SOAR.`
    const { error: ue } = await sb.from('profiles').update(update).eq('id', match.id)
    if (ue && !ue.message.includes('bio')) console.warn(`  profile enrich warn: ${ue.message}`)
  }
}

// ── 4. Check which new columns exist ─────────────────────
console.log('\nDetecting schema capabilities…')

// Probe by trying a tiny select — if it fails, column doesn't exist
async function colExists(table, col) {
  const { error } = await sb.from(table).select(col).limit(1)
  return !error
}

const hasExpLevel   = await colExists('profiles', 'experience_level')
const hasPriority   = await colExists('incidents', 'priority')
const hasSlaInc     = await colExists('incidents', 'sla_deadline')
const hasPlaybook   = await colExists('incidents', 'playbook_id')
const hasStepOrder  = await colExists('incident_steps', 'step_order')
const hasSlaStep    = await colExists('incident_steps', 'sla_deadline')
const hasAssignedU  = await colExists('incident_steps', 'assigned_user')
const hasStepPrio   = await colExists('incident_steps', 'priority')
const hasNotesAct   = await colExists('step_actions', 'notes')
const hasIncIdAct   = await colExists('step_actions', 'incident_id')

console.log(`  incidents.priority:     ${hasPriority  ? 'YES' : 'NO (will skip)'}`)
console.log(`  incidents.sla_deadline: ${hasSlaInc    ? 'YES' : 'NO (will skip)'}`)
console.log(`  incidents.playbook_id:  ${hasPlaybook  ? 'YES' : 'NO (will skip)'}`)
console.log(`  steps.step_order:       ${hasStepOrder ? 'YES' : 'NO (will skip)'}`)
console.log(`  steps.sla_deadline:     ${hasSlaStep   ? 'YES' : 'NO (will skip)'}`)
console.log(`  steps.assigned_user:    ${hasAssignedU ? 'YES' : 'NO (will skip)'}`)
console.log(`  step_actions.notes:     ${hasNotesAct  ? 'YES' : 'NO (will skip)'}`)
console.log(`  step_actions.incident_id: ${hasIncIdAct ? 'YES' : 'NO (will skip)'}`)

// Helpers to build rows conditionally
const hasCompliance = await colExists('incidents', 'compliance_notified')

function incRow(base, extra) {
  const r = { ...base }
  if (hasPriority    && extra.priority          !== undefined) r.priority          = extra.priority
  if (hasSlaInc      && extra.sla_deadline      !== undefined) r.sla_deadline      = extra.sla_deadline
  if (hasPlaybook    && extra.playbook_id        !== undefined) r.playbook_id       = extra.playbook_id
  if (hasSlaInc      && extra.notify_72h_at     !== undefined) r.notify_72h_at     = extra.notify_72h_at
  if (hasSlaInc      && extra.sla_breached      !== undefined) r.sla_breached      = extra.sla_breached
  if (hasCompliance  && extra.compliance_notified !== undefined) r.compliance_notified = extra.compliance_notified
  return r
}

function stepRow(base, extra) {
  const r = { ...base }
  // Always strip columns that may not exist from base
  if (!hasAssignedU) delete r.assigned_user
  if (!hasStepOrder) delete r.step_order
  if (!hasSlaStep)   { delete r.sla_deadline; delete r.sla_breached }
  if (!hasStepPrio)  delete r.priority
  // Conditionally add from extra
  if (hasStepOrder && extra.step_order     !== undefined) r.step_order     = extra.step_order
  if (hasSlaStep   && extra.sla_deadline   !== undefined) r.sla_deadline   = extra.sla_deadline
  if (hasSlaStep   && extra.sla_breached   !== undefined) r.sla_breached   = extra.sla_breached
  if (hasAssignedU && extra.assigned_user  !== undefined) r.assigned_user  = extra.assigned_user
  if (hasStepPrio  && extra.priority       !== undefined) r.priority       = extra.priority
  return r
}

function actionRow(base, extra) {
  const r = { ...base }
  if (hasNotesAct  && extra.notes       !== undefined) r.notes       = extra.notes
  if (hasIncIdAct  && extra.incident_id !== undefined) r.incident_id = extra.incident_id
  return r
}

// ══════════════════════════════════════════════════════════
// SCENARIO 1 — CRITICAL / OPEN — Ransomware
// ══════════════════════════════════════════════════════════
console.log('\nSeeding scenario 1 — CRITICAL OPEN (Ransomware)…')
const inc1 = uid()
await insert('incidents', [incRow({
  id: inc1, status: 'OPEN', severity: 'CRITICAL', severity_score: 95,
  source: 'EDR — CrowdStrike',
  assigned_to: socLead.id,
  raw_input: {
    title: 'Ransomware Detected on Finance Servers',
    description: 'LockBit 3.0 variant detected on 3 finance servers. Encryption in progress.',
    affected_hosts: ['FIN-SRV-01', 'FIN-SRV-02', 'FIN-SRV-03'],
    indicators: ['abc123.exe', 'ransom_note.txt'],
    ai_confidence: 0.97, playbook_id: 'PB-RANSOMWARE-001',
  },
  created_at: minsAgo(45), updated_at: minsAgo(10),
}, { priority: 1, sla_deadline: inHours(1), playbook_id: 'PB-RANSOMWARE-001' })])

const s1a = uid(), s1b = uid(), s1c = uid(), s1d = uid()
await insert('incident_steps', [
  stepRow({
    id: s1a, incident_id: inc1, step_type: 'SCRIPT', status: 'SUCCESS',
    assigned_role: 'SOC_ANALYST', assigned_user: analyst.id,
    result: { message: 'Host isolation script executed. All 3 servers isolated from network.', isolated_hosts: 3 },
    started_at: minsAgo(40), completed_at: minsAgo(38), created_at: minsAgo(44),
  }, { step_order: 1, priority: 1, assigned_user: analyst.id }),

  stepRow({
    id: s1b, incident_id: inc1, step_type: 'INTEGRATION', status: 'SUCCESS',
    assigned_role: 'IT_ADMIN',
    result: { message: 'Backup snapshot triggered via Veeam. 3 snapshots created.', integration: 'veeam' },
    started_at: minsAgo(38), completed_at: minsAgo(35), created_at: minsAgo(44),
  }, { step_order: 2, priority: 1, assigned_user: itAdmin.id }),

  stepRow({
    id: s1c, incident_id: inc1, step_type: 'APPROVAL', status: 'WAITING_APPROVAL',
    assigned_role: 'SOC_LEAD',
    result: { message: 'Approve full Finance VLAN shutdown. Will impact 47 users.', assignedRole: 'SOC_LEAD', context: { severity: 'CRITICAL' } },
    started_at: minsAgo(35), created_at: minsAgo(44),
  }, { step_order: 3, priority: 1, assigned_user: socLead.id, sla_deadline: inHours(1) }),

  stepRow({
    id: s1d, incident_id: inc1, step_type: 'APPROVAL', status: 'PENDING',
    assigned_role: 'CISO',
    result: { message: 'CISO approval required before notifying law enforcement (DGSN).', assignedRole: 'CISO' },
    created_at: minsAgo(44),
  }, { step_order: 4, priority: 1 }),
])
await insert('step_actions', [
  actionRow({ step_id: s1a, actor_id: analyst.id, action: 'APPROVE', reason: 'Hosts isolated. Script ran without errors.', created_at: minsAgo(38) }, { incident_id: inc1 }),
])
await insert('audit_log', [
  { incident_id: inc1, step_id: s1a, actor: 'WORKFLOW_ENGINE', action: 'EXECUTE_SCRIPT',      status: 'SUCCESS',          payload: { step_order: 1 }, created_at: minsAgo(40) },
  { incident_id: inc1, step_id: s1b, actor: 'WORKFLOW_ENGINE', action: 'EXECUTE_INTEGRATION', status: 'SUCCESS',          payload: { step_order: 2 }, created_at: minsAgo(38) },
  { incident_id: inc1, step_id: s1c, actor: 'WORKFLOW_ENGINE', action: 'EXECUTE_APPROVAL',    status: 'WAITING_APPROVAL', payload: { step_order: 3 }, created_at: minsAgo(35) },
  { incident_id: inc1, step_id: s1a, actor: analyst.id,        action: 'STEP_APPROVE',        status: 'SUCCESS',          payload: { reason: 'Script success' }, created_at: minsAgo(38) },
])

// ══════════════════════════════════════════════════════════
// SCENARIO 2 — CRITICAL / CONTAINED — Data Breach, mixed states
// ══════════════════════════════════════════════════════════
console.log('Seeding scenario 2 — CRITICAL CONTAINED (Data Breach)…')
const inc2 = uid()
await insert('incidents', [incRow({
  id: inc2, status: 'CONTAINED', severity: 'CRITICAL', severity_score: 90,
  source: 'DLP — Symantec',
  assigned_to: ciso.id,
  raw_input: {
    title: 'Customer PII Data Exfiltration Detected',
    description: '2.3GB PII exfiltrated to Tor exit node. 15,400 records affected. Law 18-07 compliance breach.',
    records_affected: 15400,
    destination_ip: '185.220.101.47',
    ai_confidence: 0.92, playbook_id: 'PB-DATA-BREACH-001',
  },
  created_at: hoursAgo(6), updated_at: hoursAgo(1),
}, { priority: 1, sla_deadline: inHours(66), notify_72h_at: inHours(66), playbook_id: 'PB-DATA-BREACH-001', sla_breached: false, compliance_notified: false })])

const s2a = uid(), s2b = uid(), s2c = uid(), s2d = uid(), s2e = uid()
await insert('incident_steps', [
  stepRow({ id: s2a, incident_id: inc2, step_type: 'SCRIPT', status: 'SUCCESS', assigned_role: 'SOC_ANALYST',
    result: { message: 'Network connection terminated. Firewall rules updated.' },
    started_at: hoursAgo(5.8), completed_at: hoursAgo(5.5), created_at: hoursAgo(6) },
    { step_order: 1, assigned_user: analyst.id }),

  stepRow({ id: s2b, incident_id: inc2, step_type: 'INTEGRATION', status: 'FAILED', assigned_role: 'IT_ADMIN',
    result: { message: 'Pull affected DB records from SIEM failed.', integration: 'splunk' },
    error_detail: 'SIEM API timeout after 30s — max retries exceeded',
    started_at: hoursAgo(5.5), completed_at: hoursAgo(5.4), created_at: hoursAgo(6) },
    { step_order: 2, assigned_user: itAdmin.id }),

  stepRow({ id: s2c, incident_id: inc2, step_type: 'APPROVAL', status: 'SUCCESS', assigned_role: 'SOC_LEAD',
    result: { message: 'Approve ANPDP notification within 72h compliance window.', assignedRole: 'SOC_LEAD' },
    started_at: hoursAgo(4), completed_at: hoursAgo(3), created_at: hoursAgo(6) },
    { step_order: 3, assigned_user: socLead.id, sla_deadline: hoursAgo(-2) }),

  stepRow({ id: s2d, incident_id: inc2, step_type: 'APPROVAL', status: 'SUCCESS', assigned_role: 'LEGAL',
    result: { message: 'Legal review of breach notification letter. Confirm Law 18-07 compliance.', assignedRole: 'LEGAL' },
    started_at: hoursAgo(3), completed_at: hoursAgo(2), created_at: hoursAgo(6) },
    { step_order: 4, assigned_user: legal.id }),

  stepRow({ id: s2e, incident_id: inc2, step_type: 'APPROVAL', status: 'WAITING_APPROVAL', assigned_role: 'CISO',
    result: { message: 'Final CISO sign-off on breach report before submitting to ANPDP.', assignedRole: 'CISO' },
    started_at: hoursAgo(1), created_at: hoursAgo(6) },
    { step_order: 5, assigned_user: ciso.id, sla_deadline: inHours(66) }),
])
await insert('step_actions', [
  actionRow({ step_id: s2c, actor_id: socLead.id, action: 'APPROVE', reason: 'Notification required by Law 18-07. Approved breach report.', created_at: hoursAgo(3) }, { incident_id: inc2 }),
  actionRow({ step_id: s2d, actor_id: legal.id,   action: 'APPROVE', reason: 'Letter compliant with Law 18-07 Art. 26.', created_at: hoursAgo(2) }, { incident_id: inc2, notes: 'Attach signed PDF' }),
  actionRow({ step_id: s2b, actor_id: itAdmin.id, action: 'REPORT',  reason: 'SIEM was down. Manual log export initiated as workaround.', created_at: hoursAgo(5.3) }, { incident_id: inc2 }),
])
await insert('audit_log', [
  { incident_id: inc2, step_id: s2a, actor: 'WORKFLOW_ENGINE', action: 'EXECUTE_SCRIPT',      status: 'SUCCESS',          payload: {}, created_at: hoursAgo(5.8) },
  { incident_id: inc2, step_id: s2b, actor: 'WORKFLOW_ENGINE', action: 'EXECUTE_INTEGRATION', status: 'FAILED',           payload: { error: 'timeout' }, created_at: hoursAgo(5.5) },
  { incident_id: inc2, step_id: s2c, actor: socLead.id,        action: 'STEP_APPROVE',        status: 'SUCCESS',          payload: {}, created_at: hoursAgo(3) },
  { incident_id: inc2, step_id: s2d, actor: legal.id,          action: 'STEP_APPROVE',        status: 'SUCCESS',          payload: {}, created_at: hoursAgo(2) },
  { incident_id: inc2, step_id: s2e, actor: 'WORKFLOW_ENGINE', action: 'EXECUTE_APPROVAL',    status: 'WAITING_APPROVAL', payload: {}, created_at: hoursAgo(1) },
])

// ══════════════════════════════════════════════════════════
// SCENARIO 3 — HIGH / OPEN — Phishing, REJECTED step
// ══════════════════════════════════════════════════════════
console.log('Seeding scenario 3 — HIGH OPEN (Phishing, rejected)…')
const inc3 = uid()
await insert('incidents', [incRow({
  id: inc3, status: 'OPEN', severity: 'HIGH', severity_score: 72,
  source: 'Email Gateway — Proofpoint',
  assigned_to: analyst.id,
  raw_input: {
    title: 'Targeted Spear-Phishing — C-Suite Executives',
    description: '14 spear-phishing emails targeting executives. 3 clicked malicious link.',
    targets_clicked: 3, campaign_id: 'PHISH-2026-047', ai_confidence: 0.88,
  },
  created_at: hoursAgo(2), updated_at: minsAgo(30),
}, { priority: 2, sla_deadline: inHours(2) })])

const s3a = uid(), s3b = uid(), s3c = uid()
await insert('incident_steps', [
  stepRow({ id: s3a, incident_id: inc3, step_type: 'APPROVAL', status: 'FAILED', assigned_role: 'SOC_ANALYST',
    result: { message: 'Block all outbound to "secure-login-portal[.]com".', assignedRole: 'SOC_ANALYST' },
    started_at: hoursAgo(1.8), completed_at: hoursAgo(1.5), created_at: hoursAgo(2) },
    { step_order: 1, assigned_user: analyst.id }),

  stepRow({ id: s3b, incident_id: inc3, step_type: 'APPROVAL', status: 'WAITING_APPROVAL', assigned_role: 'SOC_ANALYST',
    result: { message: 'Revised: block C2 domain AND all subdomains of "secure-login-portal[.]com".', assignedRole: 'SOC_ANALYST' },
    started_at: hoursAgo(1), created_at: hoursAgo(2) },
    { step_order: 2, assigned_user: analyst.id, sla_deadline: inHours(2) }),

  stepRow({ id: s3c, incident_id: inc3, step_type: 'APPROVAL', status: 'PENDING', assigned_role: 'SOC_LEAD',
    result: { message: 'Force password reset for the 3 affected executive accounts.', assignedRole: 'SOC_LEAD' },
    created_at: hoursAgo(2) },
    { step_order: 3 }),
])
await insert('step_actions', [
  actionRow({ step_id: s3a, actor_id: analyst.id, action: 'REJECT', reason: 'Too broad — would block legitimate banking portal. Needs narrower scope.', created_at: hoursAgo(1.5) }, { incident_id: inc3 }),
])
await insert('audit_log', [
  { incident_id: inc3, step_id: s3a, actor: analyst.id,        action: 'STEP_REJECT',      status: 'SUCCESS',         payload: {}, created_at: hoursAgo(1.5) },
  { incident_id: inc3, step_id: s3b, actor: 'WORKFLOW_ENGINE', action: 'EXECUTE_APPROVAL', status: 'WAITING_APPROVAL', payload: {}, created_at: hoursAgo(1) },
])

// ══════════════════════════════════════════════════════════
// SCENARIO 4 — HIGH / RESOLVED — Malware, fully completed
// ══════════════════════════════════════════════════════════
console.log('Seeding scenario 4 — HIGH RESOLVED (Malware)…')
const inc4 = uid()
await insert('incidents', [incRow({
  id: inc4, status: 'RESOLVED', severity: 'HIGH', severity_score: 68,
  source: 'AV — Windows Defender',
  assigned_to: analyst.id,
  raw_input: {
    title: 'Emotet Malware on HR Workstation HR-WS-012',
    description: 'Emotet dropper detected and contained. No lateral movement. Host quarantined.',
    affected_host: 'HR-WS-012', malware_family: 'Emotet', ai_confidence: 0.94,
  },
  resolved_at: hoursAgo(1), mttr_minutes: 127,
  created_at: hoursAgo(3), updated_at: hoursAgo(1),
}, { priority: 3 })])

const s4a = uid(), s4b = uid(), s4c = uid()
await insert('incident_steps', [
  stepRow({ id: s4a, incident_id: inc4, step_type: 'APPROVAL', status: 'SUCCESS', assigned_role: 'SOC_ANALYST',
    result: { message: 'Quarantine host HR-WS-012 from corporate network.', assignedRole: 'SOC_ANALYST' },
    started_at: hoursAgo(2.9), completed_at: hoursAgo(2.7), created_at: hoursAgo(3) },
    { step_order: 1, assigned_user: analyst.id }),

  stepRow({ id: s4b, incident_id: inc4, step_type: 'SCRIPT', status: 'SUCCESS', assigned_role: 'IT_ADMIN',
    result: { message: 'Full malware removal. Registry cleaned. 4 persistence mechanisms removed.', scripts_run: 2, threats_removed: 4 },
    started_at: hoursAgo(2.5), completed_at: hoursAgo(2.2), created_at: hoursAgo(3) },
    { step_order: 2, assigned_user: itAdmin.id }),

  stepRow({ id: s4c, incident_id: inc4, step_type: 'APPROVAL', status: 'SUCCESS', assigned_role: 'SOC_LEAD',
    result: { message: 'Approve re-introduction of host to network after clean scan.', assignedRole: 'SOC_LEAD' },
    started_at: hoursAgo(1.5), completed_at: hoursAgo(1.1), created_at: hoursAgo(3) },
    { step_order: 3, assigned_user: socLead.id }),
])
await insert('step_actions', [
  actionRow({ step_id: s4a, actor_id: analyst.id,  action: 'APPROVE', reason: 'Host quarantined via NAC.', created_at: hoursAgo(2.7) }, { incident_id: inc4 }),
  actionRow({ step_id: s4c, actor_id: socLead.id,  action: 'APPROVE', reason: 'Clean bill from AV + EDR. Host cleared.', created_at: hoursAgo(1.1) }, { incident_id: inc4 }),
])
await insert('audit_log', [
  { incident_id: inc4, step_id: s4a, actor: analyst.id,        action: 'STEP_APPROVE',   status: 'SUCCESS', payload: {}, created_at: hoursAgo(2.7) },
  { incident_id: inc4, step_id: s4b, actor: 'WORKFLOW_ENGINE', action: 'EXECUTE_SCRIPT', status: 'SUCCESS', payload: {}, created_at: hoursAgo(2.5) },
  { incident_id: inc4, step_id: s4c, actor: socLead.id,        action: 'STEP_APPROVE',   status: 'SUCCESS', payload: {}, created_at: hoursAgo(1.1) },
  { incident_id: inc4,               actor: 'WORKFLOW_ENGINE', action: 'AUTO_RESOLVE',   status: 'SUCCESS', payload: { mttr_minutes: 127 }, created_at: hoursAgo(1) },
])

// ══════════════════════════════════════════════════════════
// SCENARIO 5 — MEDIUM / SUSPENDED — DDoS, workflow halted
// ══════════════════════════════════════════════════════════
console.log('Seeding scenario 5 — MEDIUM SUSPENDED (DDoS)…')
const inc5 = uid()
await insert('incidents', [incRow({
  id: inc5, status: 'SUSPENDED', severity: 'MEDIUM', severity_score: 45,
  source: 'WAF — Cloudflare',
  assigned_to: itAdmin.id,
  raw_input: {
    title: 'Volumetric DDoS Attack on Public API Gateway',
    description: '2.4 Gbps flood targeting /api/v2/auth. Awaiting ISP null-route approval.',
    attack_vector: 'UDP Flood', peak_gbps: 2.4, ai_confidence: 0.78,
  },
  created_at: hoursAgo(5), updated_at: hoursAgo(3),
}, { priority: 4 })])

const s5a = uid(), s5b = uid()
await insert('incident_steps', [
  stepRow({ id: s5a, incident_id: inc5, step_type: 'APPROVAL', status: 'SUCCESS', assigned_role: 'IT_ADMIN',
    result: { message: 'Enable Cloudflare Under Attack mode and rate limiting.', assignedRole: 'IT_ADMIN' },
    started_at: hoursAgo(4.9), completed_at: hoursAgo(4.5), created_at: hoursAgo(5) },
    { step_order: 1, assigned_user: itAdmin.id }),

  stepRow({ id: s5b, incident_id: inc5, step_type: 'APPROVAL', status: 'SUSPENDED', assigned_role: 'CISO',
    result: { message: 'Request ISP null-route for attacking subnets. Requires CISO authorization.', assignedRole: 'CISO',
      user_feedback: 'ISP SLA says 4h response — needs escalation path if no response.' },
    error_detail: 'Workflow redesign requested — ISP null-route path unclear',
    started_at: hoursAgo(4), created_at: hoursAgo(5) },
    { step_order: 2, assigned_user: ciso.id }),
])
await insert('step_actions', [
  actionRow({ step_id: s5a, actor_id: itAdmin.id, action: 'APPROVE', reason: 'WAF config updated. Attack traffic dropped 40%.', created_at: hoursAgo(4.5) }, { incident_id: inc5 }),
  actionRow({ step_id: s5b, actor_id: ciso.id,    action: 'REPORT',  reason: 'ISP null-route requires board notification per policy. Escalating to EXEC.', created_at: hoursAgo(3) }, { incident_id: inc5 }),
])
await insert('audit_log', [
  { incident_id: inc5, step_id: s5a, actor: itAdmin.id, action: 'STEP_APPROVE',     status: 'SUCCESS', payload: {}, created_at: hoursAgo(4.5) },
  { incident_id: inc5, step_id: s5b, actor: ciso.id,    action: 'STEP_REPORTED',    status: 'SUCCESS', payload: {}, created_at: hoursAgo(3) },
  { incident_id: inc5,               actor: ciso.id,    action: 'SUSPEND_WORKFLOW', status: 'SUCCESS', payload: { reason: 'Awaiting board decision' }, created_at: hoursAgo(3) },
])

// ══════════════════════════════════════════════════════════
// SCENARIO 6 — LOW / CLOSED — Port scan, voided
// ══════════════════════════════════════════════════════════
console.log('Seeding scenario 6 — LOW CLOSED (void)…')
const inc6 = uid()
await insert('incidents', [incRow({
  id: inc6, status: 'CLOSED', severity: 'LOW', severity_score: 12,
  source: 'Firewall — pfSense',
  assigned_to: analyst.id,
  raw_input: {
    title: 'External Port Scan from 203.0.113.42',
    description: 'SYN scan on 443,8080,22,3389 from known scanner IP. Not novel.',
    source_ip: '203.0.113.42', ports_scanned: [22, 443, 3389, 8080], ai_confidence: 0.60,
  },
  resolved_at: daysAgo(1), mttr_minutes: 8,
  created_at: daysAgo(1), updated_at: daysAgo(1),
}, { priority: 9 })])

const s6a = uid()
await insert('incident_steps', [
  stepRow({ id: s6a, incident_id: inc6, step_type: 'APPROVAL', status: 'SKIPPED', assigned_role: 'SOC_ANALYST',
    result: { message: 'Review and block source IP 203.0.113.42.', assignedRole: 'SOC_ANALYST' },
    completed_at: daysAgo(1), created_at: daysAgo(1) },
    { step_order: 1 }),
])
await insert('step_actions', [
  actionRow({ step_id: s6a, actor_id: admin.id, action: 'SKIP', reason: 'Known scanner IP — already on blocklist. Voiding workflow.', created_at: daysAgo(1) }, { incident_id: inc6 }),
])
await insert('audit_log', [
  { incident_id: inc6, actor: admin.id, action: 'VOID_WORKFLOW', status: 'SUCCESS', payload: { reason: 'False positive — known scanner IP already blocked.' }, created_at: daysAgo(1) },
])

// ══════════════════════════════════════════════════════════
// SCENARIO 7 — CRITICAL / OPEN — Insider Threat, cross-role approvals
// ══════════════════════════════════════════════════════════
console.log('Seeding scenario 7 — CRITICAL OPEN (Insider Threat)…')
const inc7 = uid()
await insert('incidents', [incRow({
  id: inc7, status: 'OPEN', severity: 'CRITICAL', severity_score: 88,
  source: 'UEBA — Exabeam',
  assigned_to: ciso.id,
  raw_input: {
    title: 'Insider Threat — Anomalous Data Access by Privileged User',
    description: 'Admin accessed 4,200 customer records outside business hours over 3 days. Risk score 9.4/10.',
    user_id: 'usr_0042', risk_score: 9.4, records_accessed: 4200, ai_confidence: 0.91,
  },
  created_at: hoursAgo(3), updated_at: minsAgo(20),
}, { priority: 1, sla_deadline: inHours(2), playbook_id: 'PB-INSIDER-001' })])

const s7a = uid(), s7b = uid(), s7c = uid(), s7d = uid()
await insert('incident_steps', [
  stepRow({ id: s7a, incident_id: inc7, step_type: 'APPROVAL', status: 'SUCCESS', assigned_role: 'CISO',
    result: { message: 'Approve immediate account suspension of usr_0042.', assignedRole: 'CISO' },
    started_at: hoursAgo(2.9), completed_at: hoursAgo(2.7), created_at: hoursAgo(3) },
    { step_order: 1, assigned_user: ciso.id }),

  stepRow({ id: s7b, incident_id: inc7, step_type: 'SCRIPT', status: 'SUCCESS', assigned_role: 'IT_ADMIN',
    result: { message: 'Account suspended. All active sessions terminated. AD account locked.', sessions_killed: 3 },
    started_at: hoursAgo(2.7), completed_at: hoursAgo(2.5), created_at: hoursAgo(3) },
    { step_order: 2, assigned_user: itAdmin.id }),

  stepRow({ id: s7c, incident_id: inc7, step_type: 'APPROVAL', status: 'WAITING_APPROVAL', assigned_role: 'LEGAL',
    result: { message: 'Legal approval to preserve digital evidence and initiate HR investigation.', assignedRole: 'LEGAL' },
    started_at: minsAgo(30), created_at: hoursAgo(3) },
    { step_order: 3, assigned_user: legal.id, sla_deadline: inHours(1.5) }),

  stepRow({ id: s7d, incident_id: inc7, step_type: 'APPROVAL', status: 'PENDING', assigned_role: 'EXEC',
    result: { message: 'Executive notification and approval of law enforcement referral.', assignedRole: 'EXEC' },
    created_at: hoursAgo(3) },
    { step_order: 4 }),
])
await insert('step_actions', [
  actionRow({ step_id: s7a, actor_id: ciso.id, action: 'APPROVE', reason: 'Risk is confirmed. Immediate suspension is correct.', created_at: hoursAgo(2.7) }, { incident_id: inc7 }),
])
await insert('audit_log', [
  { incident_id: inc7, step_id: s7a, actor: ciso.id,            action: 'STEP_APPROVE',     status: 'SUCCESS',          payload: {}, created_at: hoursAgo(2.7) },
  { incident_id: inc7, step_id: s7b, actor: 'WORKFLOW_ENGINE', action: 'EXECUTE_SCRIPT',    status: 'SUCCESS',          payload: {}, created_at: hoursAgo(2.7) },
  { incident_id: inc7, step_id: s7c, actor: 'WORKFLOW_ENGINE', action: 'EXECUTE_APPROVAL',  status: 'WAITING_APPROVAL', payload: {}, created_at: minsAgo(30) },
])

// ══════════════════════════════════════════════════════════
// SCENARIO 8 — HIGH / OPEN — Zero-day, all PENDING (fresh)
// ══════════════════════════════════════════════════════════
console.log('Seeding scenario 8 — HIGH OPEN (Zero-day, fresh)…')
const inc8 = uid()
await insert('incidents', [incRow({
  id: inc8, status: 'OPEN', severity: 'HIGH', severity_score: 79,
  source: 'Threat Intel — VirusTotal',
  assigned_to: socLead.id,
  raw_input: {
    title: 'Zero-Day Exploitation Attempt — Apache CVE-2026-XXXXX',
    description: 'Novel exploit against Apache 2.4.x. Vendor patch not available. 2 web servers affected.',
    cve: 'CVE-2026-XXXXX', affected_servers: ['WEB-01', 'WEB-02'], exploit_in_wild: true, ai_confidence: 0.83,
  },
  created_at: minsAgo(15), updated_at: minsAgo(15),
}, { priority: 2, sla_deadline: inHours(4) })])

const s8a = uid(), s8b = uid(), s8c = uid()
await insert('incident_steps', [
  stepRow({ id: s8a, incident_id: inc8, step_type: 'APPROVAL', status: 'PENDING', assigned_role: 'SOC_ANALYST',
    result: { message: 'Apply virtual patch WAF rule to block CVE-2026-XXXXX exploitation patterns.', assignedRole: 'SOC_ANALYST' },
    created_at: minsAgo(14) },
    { step_order: 1, assigned_user: analyst.id }),

  stepRow({ id: s8b, incident_id: inc8, step_type: 'INTEGRATION', status: 'PENDING', assigned_role: 'IT_ADMIN',
    result: { message: 'Pull Apache version inventory from CMDB.', integration: 'servicenow', assignedRole: 'IT_ADMIN' },
    created_at: minsAgo(14) },
    { step_order: 2, assigned_user: itAdmin.id }),

  stepRow({ id: s8c, incident_id: inc8, step_type: 'APPROVAL', status: 'PENDING', assigned_role: 'SOC_LEAD',
    result: { message: 'Approve emergency CAB to take WEB-01 and WEB-02 offline.', assignedRole: 'SOC_LEAD' },
    created_at: minsAgo(14) },
    { step_order: 3, assigned_user: socLead.id }),
])

// ══════════════════════════════════════════════════════════
// SCENARIO 9 — MEDIUM / OPEN — Brute Force, REQUEST_REDESIGN
// ══════════════════════════════════════════════════════════
console.log('Seeding scenario 9 — MEDIUM OPEN (Brute Force, redesign)…')
const inc9 = uid()
await insert('incidents', [incRow({
  id: inc9, status: 'OPEN', severity: 'MEDIUM', severity_score: 42,
  source: 'SIEM — Splunk',
  assigned_to: analyst.id,
  raw_input: {
    title: 'SSH Brute Force Attack — 847 Failed Logins on JUMP-01',
    description: '847 failed SSH attempts in 2h from 3 IPs targeting JUMP-01.',
    target_host: 'JUMP-01', source_ips: ['198.51.100.1', '198.51.100.2', '198.51.100.3'], attempts: 847, ai_confidence: 0.96,
  },
  created_at: hoursAgo(1), updated_at: minsAgo(20),
}, { priority: 5, sla_deadline: inHours(24) })])

const s9a = uid(), s9b = uid()
await insert('incident_steps', [
  stepRow({ id: s9a, incident_id: inc9, step_type: 'APPROVAL', status: 'SUSPENDED', assigned_role: 'SOC_ANALYST',
    result: { message: 'Block attacking IPs at perimeter firewall.',
      assignedRole: 'SOC_ANALYST', workflow_redesign_requested: true,
      redesign_reason: 'Source IPs are TOR nodes — blanket block may break legitimate users.' },
    error_detail: 'Workflow redesign requested',
    started_at: hoursAgo(0.8), completed_at: minsAgo(25), created_at: hoursAgo(1) },
    { step_order: 1, assigned_user: analyst.id }),

  stepRow({ id: s9b, incident_id: inc9, step_type: 'APPROVAL', status: 'WAITING_APPROVAL', assigned_role: 'SOC_ANALYST',
    result: { message: 'Enable fail2ban on JUMP-01 (5-attempt threshold) + GeoIP block for high-risk countries.', assignedRole: 'SOC_ANALYST' },
    started_at: minsAgo(20), created_at: hoursAgo(1) },
    { step_order: 2, assigned_user: analyst.id, sla_deadline: inHours(20) }),
])
await insert('step_actions', [
  actionRow({ step_id: s9a, actor_id: analyst.id, action: 'REQUEST_REDESIGN', reason: 'TOR exit nodes — blanket block impacts legit users. Need smarter approach.', created_at: minsAgo(25) }, { incident_id: inc9 }),
])
await insert('audit_log', [
  { incident_id: inc9, step_id: s9a, actor: analyst.id,         action: 'WORKFLOW_REDESIGN_REQUESTED', status: 'SUCCESS',          payload: {}, created_at: minsAgo(25) },
  { incident_id: inc9, step_id: s9b, actor: 'WORKFLOW_ENGINE', action: 'EXECUTE_APPROVAL',            status: 'WAITING_APPROVAL', payload: {}, created_at: minsAgo(20) },
])

// ══════════════════════════════════════════════════════════
// SCENARIO 10 — MEDIUM / RESOLVED — Supply chain, done
// ══════════════════════════════════════════════════════════
console.log('Seeding scenario 10 — MEDIUM RESOLVED (Supply chain)…')
const inc10 = uid()
await insert('incidents', [incRow({
  id: inc10, status: 'RESOLVED', severity: 'MEDIUM', severity_score: 50,
  source: 'SCA — Snyk',
  assigned_to: itAdmin.id,
  raw_input: {
    title: 'Critical Vulnerability in log4j — 3 Internal Services',
    description: 'log4j 2.14.1 in 3 services. Patch to 2.17.1 required.',
    library: 'log4j', vulnerable_version: '2.14.1', safe_version: '2.17.1',
    affected_services: ['auth-service', 'reporting-api', 'data-pipeline'], ai_confidence: 0.99,
  },
  resolved_at: daysAgo(2), mttr_minutes: 320,
  created_at: daysAgo(2), updated_at: daysAgo(2),
}, { priority: 4 })])

const s10a = uid(), s10b = uid(), s10c = uid()
await insert('incident_steps', [
  stepRow({ id: s10a, incident_id: inc10, step_type: 'APPROVAL', status: 'SUCCESS', assigned_role: 'IT_ADMIN',
    result: { message: 'Approve emergency patch during maintenance window.', assignedRole: 'IT_ADMIN' },
    started_at: daysAgo(2), completed_at: daysAgo(2), created_at: daysAgo(2) },
    { step_order: 1, assigned_user: itAdmin.id }),

  stepRow({ id: s10b, incident_id: inc10, step_type: 'SCRIPT', status: 'SUCCESS', assigned_role: 'IT_ADMIN',
    result: { message: 'Patch deployed to all 3 services. Zero downtime via rolling deploy.', services_patched: 3 },
    started_at: daysAgo(2), completed_at: daysAgo(2), created_at: daysAgo(2) },
    { step_order: 2, assigned_user: itAdmin.id }),

  stepRow({ id: s10c, incident_id: inc10, step_type: 'APPROVAL', status: 'SUCCESS', assigned_role: 'SOC_LEAD',
    result: { message: 'Confirm all services healthy post-patch and close incident.', assignedRole: 'SOC_LEAD' },
    started_at: daysAgo(2), completed_at: daysAgo(2), created_at: daysAgo(2) },
    { step_order: 3, assigned_user: socLead.id }),
])
await insert('step_actions', [
  actionRow({ step_id: s10a, actor_id: itAdmin.id,  action: 'APPROVE', reason: 'Patching during tonight maintenance window.', created_at: daysAgo(2) }, { incident_id: inc10 }),
  actionRow({ step_id: s10c, actor_id: socLead.id,  action: 'APPROVE', reason: 'Snyk rescan shows zero critical vulns.', created_at: daysAgo(2) }, { incident_id: inc10 }),
])

// ══════════════════════════════════════════════════════════
// SCENARIO 11 — LOW / OPEN — CEO Fraud email, single WAITING step
// ══════════════════════════════════════════════════════════
console.log('Seeding scenario 11 — LOW OPEN (CEO Fraud)…')
const inc11 = uid()
await insert('incidents', [incRow({
  id: inc11, status: 'OPEN', severity: 'LOW', severity_score: 18,
  source: 'User Report',
  assigned_to: analyst.id,
  raw_input: {
    title: 'Suspicious CEO Fraud Email — Finance Team',
    description: 'User reported invoice email from "cfo@companyy.com" (typosquatting). Classic CEO fraud.',
    reporter: 'finance_user_007', sender: 'cfo@companyy.com', ai_confidence: 0.55,
  },
  created_at: minsAgo(5), updated_at: minsAgo(5),
}, { priority: 8, sla_deadline: inHours(72) })])

const s11a = uid()
await insert('incident_steps', [
  stepRow({ id: s11a, incident_id: inc11, step_type: 'APPROVAL', status: 'WAITING_APPROVAL', assigned_role: 'SOC_ANALYST',
    result: { message: 'Review email headers and confirm if phishing. If confirmed, block sender domain.', assignedRole: 'SOC_ANALYST' },
    started_at: minsAgo(4), created_at: minsAgo(5) },
    { step_order: 1, assigned_user: analyst.id, sla_deadline: inHours(72) }),
])

// ══════════════════════════════════════════════════════════
// SCENARIO 12 — CRITICAL / OPEN — APT C2 beaconing, SLA breached
// ══════════════════════════════════════════════════════════
console.log('Seeding scenario 12 — CRITICAL OPEN (APT-29, SLA breached)…')
const inc12 = uid()
await insert('incidents', [incRow({
  id: inc12, status: 'OPEN', severity: 'CRITICAL', severity_score: 93,
  source: 'IDS — Snort',
  assigned_to: socLead.id,
  raw_input: {
    title: 'Active APT-29 C2 Beaconing from CORE-SRV-07',
    description: 'Beacon traffic to APT-29 C2 infrastructure detected. Cozy Bear TTPs confirmed.',
    source_host: 'CORE-SRV-07', c2_domain: 'update-microsft[.]com', apt_group: 'APT-29', ai_confidence: 0.89,
  },
  created_at: hoursAgo(2), updated_at: hoursAgo(0.5),
}, { priority: 1, sla_deadline: hoursAgo(0.5), sla_breached: true })])

const s12a = uid(), s12b = uid()
await insert('incident_steps', [
  stepRow({ id: s12a, incident_id: inc12, step_type: 'APPROVAL', status: 'WAITING_APPROVAL', assigned_role: 'SOC_LEAD',
    result: { message: 'CRITICAL: Approve immediate kill-switch isolation of CORE-SRV-07.', assignedRole: 'SOC_LEAD' },
    started_at: hoursAgo(1.8), created_at: hoursAgo(2) },
    { step_order: 1, assigned_user: socLead.id, sla_deadline: hoursAgo(0.5), sla_breached: true }),

  stepRow({ id: s12b, incident_id: inc12, step_type: 'APPROVAL', status: 'PENDING', assigned_role: 'CISO',
    result: { message: 'CISO emergency authorization to engage external DFIR team.', assignedRole: 'CISO' },
    created_at: hoursAgo(2) },
    { step_order: 2 }),
])

// ══════════════════════════════════════════════════════════
// Update profile stats
// ══════════════════════════════════════════════════════════
console.log('\nUpdating profile stats…')
const stats = {}
function addStat(id, a) {
  if (!id) return
  if (!stats[id]) stats[id] = { approvals: 0, rejections: 0, completed: 0 }
  if (a === 'APPROVE') { stats[id].approvals++; stats[id].completed++ }
  if (a === 'REJECT')  { stats[id].rejections++; stats[id].completed++ }
  stats[id].completed++
}
addStat(analyst.id, 'APPROVE'); addStat(analyst.id, 'REJECT')
addStat(analyst.id, 'REQUEST_REDESIGN'); addStat(analyst.id, 'APPROVE')
addStat(socLead.id, 'APPROVE'); addStat(socLead.id, 'APPROVE'); addStat(socLead.id, 'APPROVE')
addStat(ciso.id, 'APPROVE'); addStat(ciso.id, 'APPROVE'); addStat(ciso.id, 'REPORT')
addStat(legal.id, 'APPROVE')
addStat(itAdmin.id, 'APPROVE'); addStat(itAdmin.id, 'APPROVE'); addStat(itAdmin.id, 'REPORT')
addStat(admin.id, 'SKIP')
for (const [id, s] of Object.entries(stats)) {
  await sb.from('profiles').update({ total_approvals: s.approvals, total_rejections: s.rejections, total_tasks_completed: s.completed }).eq('id', id)
}

// ── Done ───────────────────────────────────────────────────
console.log('\n✅  Seed complete!\n')
const summary = [
  [inc1,  'CRITICAL', 'OPEN',      'Ransomware on Finance Servers'],
  [inc2,  'CRITICAL', 'CONTAINED', 'PII Data Exfiltration (Law 18-07)'],
  [inc3,  'HIGH',     'OPEN',      'Spear-Phishing — C-Suite (rejected step)'],
  [inc4,  'HIGH',     'RESOLVED',  'Emotet Malware on HR-WS-012'],
  [inc5,  'MEDIUM',   'SUSPENDED', 'DDoS on API Gateway (halted)'],
  [inc6,  'LOW',      'CLOSED',    'Port Scan (voided workflow)'],
  [inc7,  'CRITICAL', 'OPEN',      'Insider Threat — Anomalous Access'],
  [inc8,  'HIGH',     'OPEN',      'Zero-Day Apache CVE-2026-XXXXX (fresh)'],
  [inc9,  'MEDIUM',   'OPEN',      'SSH Brute Force — redesign requested'],
  [inc10, 'MEDIUM',   'RESOLVED',  'log4j in 3 services'],
  [inc11, 'LOW',      'OPEN',      'CEO Fraud Email'],
  [inc12, 'CRITICAL', 'OPEN',      'APT-29 C2 Beaconing (SLA breached)'],
]
console.log('Incidents:')
summary.forEach(([,sev, st, title]) =>
  console.log(`  [${sev.padEnd(8)}] [${st.padEnd(10)}] ${title}`)
)
console.log('\nTest matrix:')
console.log('  WAITING_APPROVAL → sign in as SOC_ANALYST or SOC_LEAD — see tasks in kanban')
console.log('  Task detail       → click any task → approve / reject / report forms')
console.log('  SUSPENDED step    → scenario 5 & 9 (report / request_redesign)')
console.log('  FAILED step       → scenario 2 (SIEM timeout)')
console.log('  CLOSED (void)     → scenario 6 (admin voided from monitor page)')
console.log('  Cross-role flow   → scenario 7 (CISO → IT_ADMIN → LEGAL → EXEC)')
console.log('  SLA breach        → scenario 12 (red SLA badge)')
console.log('  History page      → sign in as any user to see their action history')
console.log('  Settings page     → all roles, profile fields pre-filled')
console.log('  Admin: Users      → all roles assigned, activate/deactivate/notify')
console.log('  Admin: Audit      → 30+ events, bar charts populated')
