require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runTest() {
  // 1. Read the JSON file
  let rawPayload;
  try {
    const fileContent = fs.readFileSync('access_control (1).json', 'utf8');
    rawPayload = JSON.parse(fileContent);
  } catch (err) {
    console.error("❌ Failed to read or parse access_control (1).json", err.message);
    process.exit(1);
  }

  // 2. Look up all users to dynamically assign roles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, name, role')
    .eq('is_active', true);

  if (error || !profiles || profiles.length === 0) {
    console.error("❌ No active users found in the database.", error?.message);
    process.exit(1);
  }

  // Helper to find a user for a role
  const getUserByRole = (role) => {
    return profiles.find(p => p.role === role) || profiles[0];
  };

  // 3. Map the steps to real users based on their roles in the JSON
  const updatedSteps = rawPayload.steps.map(step => {
    const assignedUser = getUserByRole(step.assignedRole || 'SOC_ANALYST');
    return {
      ...step,
      assignedUser: assignedUser.id,
      assignedRole: assignedUser.role
    };
  });

  const payload = {
    ...rawPayload,
    steps: updatedSteps
  };

  console.log("\n🎯 Execution Plan:");
  payload.steps.forEach((s, i) => {
    const user = profiles.find(p => p.id === s.assignedUser);
    console.log(`   Step ${i + 1} (${s.type}) -> Assigned to ${user.name} [${user.role}]`);
  });

  // 4. Send to the workflow execute endpoint
  console.log("\n📡 Sending workflow payload to /api/workflow/execute...\n");

  try {
    const response = await fetch('http://localhost:3000/api/workflow/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      console.log("✅ Workflow accepted! Access Control Incident created.");
      console.log("   Incident ID:", data.incidentId);
      console.log("\nTrack progress in System Monitor: http://localhost:3000/admin");
    } else {
      console.error("❌ Failed:", data);
    }
  } catch (err) {
    console.error("❌ Request failed. Is your Next.js dev server running?", err.message);
  }
}

runTest();
