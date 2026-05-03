require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');

/**
 * Script to run multiple JSON workflow payloads through the workflow engine.
 * Usage: node run-all-json.js [directory_path]
 * Default directory: ./json
 */

const API_URL = 'http://localhost:3000/api/workflow/execute';

async function runWorkflows() {
  // Use the directory provided as an argument, or default to './json'
  const targetDir = process.argv[2] || './json';
  const jsonDir = path.resolve(process.cwd(), targetDir);

  if (!fs.existsSync(jsonDir)) {
    console.error(`❌ ERROR: Directory not found: ${jsonDir}`);
    process.exit(1);
  }

  // Get all .json files, excluding hidden ones (like ._ files)
  const files = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json') && !f.startsWith('._'));

  if (files.length === 0) {
    console.log(`⚠️ No valid .json files found in ${jsonDir}`);
    return;
  }

  console.log("=".repeat(60));
  console.log(`🚀 STARTING WORKFLOW RUNNER`);
  console.log(`📂 Target Directory: ${targetDir}`);
  console.log(`📄 Files Found: ${files.length}`);
  console.log("=".repeat(60) + "\n");

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    const filePath = path.join(jsonDir, file);
    
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const payload = JSON.parse(fileContent);
      
      const title = payload.title || file;
      console.log(`📡 Sending [${file}] - "${title}"...`);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log(`   ✅ Success! Incident ID: ${data.incidentId}`);
        successCount++;
      } else {
        console.error(`   ❌ Failed: ${data.error || JSON.stringify(data)}`);
        failCount++;
      }
    } catch (err) {
      console.error(`   ❌ Error processing ${file}: ${err.message}`);
      failCount++;
    }
    console.log('-'.repeat(40));
  }
  
  console.log("\n" + "=".repeat(60));
  console.log(`🏁 WORKFLOW RUN COMPLETED`);
  console.log(`✅ Success: ${successCount}`);
  console.error(`❌ Failed:  ${failCount}`);
  console.log("=".repeat(60));
  
  if (successCount > 0) {
    console.log(`\n💡 Tip: Check your dashboard at http://localhost:3000 to see the new incidents.`);
  }
}

runWorkflows().catch(err => {
  console.error("💥 Critical script failure:", err);
});
