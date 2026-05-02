require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const secret = process.env.WORKFLOW_WEBHOOK_SECRET;
if (!secret) {
  console.error("❌ WORKFLOW_WEBHOOK_SECRET is missing from .env.local");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runTest() {
  // 1. Look up all users so we can assign tasks to real people
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, name, role')
    .eq('is_active', true);

  if (error || !profiles || profiles.length === 0) {
    console.error("❌ No active users found in the database.", error?.message);
    process.exit(1);
  }

  // Find users for specific roles to simulate a real chain
  const adminUser = profiles.find(p => p.role === 'ADMIN') || profiles[0];
  const analystUser = profiles.find(p => p.role === 'SOC_ANALYST') || profiles[0];
  const leadUser = profiles.find(p => p.role === 'SOC_LEAD') || profiles[0];
  const cisoUser = profiles.find(p => p.role === 'CISO') || profiles[0];

  console.log("\n🎯 Assigning tasks across different users:");
  console.log(`   Step 1 (IT/Admin)  -> ${adminUser.email}`);
  console.log(`   Step 2 (Analyst)   -> ${analystUser.email}`);
  console.log(`   Step 3 (Lead)      -> ${leadUser.email}`);
  console.log(`   Step 4 (CISO)      -> ${cisoUser.email}\n`);

  // 2. Build a realistic workflow payload that exercises ALL step types
  const payload = {
    source: "Test Script — Full Workflow",
    severity: "CRITICAL",
    title: "🔴 Simulated APT Intrusion — Chain Test",
    playbook_id: "PB-APT-RESPONSE-001",
    playbook_version: "1.0",
    ai_confidence: 0.92,
    steps: [
      {
        type: "INTEGRATION",
        integration: "CrowdStrike EDR",
        target: "CORE-SRV-07",
        params: { action: "ISOLATE_HOST", reason: "APT C2 beacon detected" },
        assignedRole: adminUser.role,
        assignedUser: adminUser.id,
        message: "Isolate CORE-SRV-07 from the network immediately.",
        priorityLevel: "CRITICAL"
      },
      {
        type: "SCRIPT",
        message: "Execute memory forensics collection on CORE-SRV-07",
        assignedRole: analystUser.role,
        assignedUser: analystUser.id,
        priorityLevel: "HIGH"
      },
      {
        type: "APPROVAL",
        assignedRole: leadUser.role,
        assignedUser: leadUser.id,
        message: "Review forensic findings and approve escalation to CISO.",
        priorityLevel: "CRITICAL"
      },
      {
        type: "WEBHOOK",
        target: "https://hooks.slack.com/example",
        params: { channel: "#incident-response", text: "APT intrusion confirmed on CORE-SRV-07" },
        assignedRole: cisoUser.role,
        assignedUser: cisoUser.id,
        message: "Notify the SOC Slack channel about the confirmed intrusion.",
        priorityLevel: "HIGH"
      }
    ]
  };

  // 3. Send to the workflow execute endpoint
  console.log("📡 Sending workflow payload to /api/workflow/execute...\n");

  try {
    const response = await fetch('http://localhost:3000/api/workflow/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-workflow-secret': secret
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      console.log("✅ Workflow accepted! Incident created.");
      console.log("   Incident ID:", data.incidentId);
      console.log("\n" + "=".repeat(60));
      console.log("  WHERE TO FIND IT IN THE UI:");
      console.log("=".repeat(60));
      console.log(`\n  1. 🏠 Dashboard (/) -> New CRITICAL incident appears in "Recent Incidents".
  2. 🚨 Incidents (/dashboard/incidents) -> Click incident to see ALL 4 steps.
  3. ✅ My Tasks (/dashboard/tasks) -> Each user will see their specific step when it's their turn.
  4. 🛡️  System Monitor (/admin) -> Track live workflow progress.\n`);
    } else {
      console.error("❌ Failed:", data);
    }
  } catch (err) {
    console.error("❌ Request failed. Is your Next.js dev server running on port 3000?", err.message);
  }
}

runTest();
