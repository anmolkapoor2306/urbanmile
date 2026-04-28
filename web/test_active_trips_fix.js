// Quick test script to verify Active Trips filtering
// Read the opsDashboard.ts file and check the activeTrips filter logic

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/opsDashboard.ts');
const content = fs.readFileSync(filePath, 'utf8');

console.log('Checking Active Trips filtering...\n');

// Check if the filter includes ASSIGNED status (the bug)
if (content.includes("booking.status === 'ASSIGNED' || booking.status === 'ACTIVE'")) {
  console.log('❌ FAIL: Active Trips still includes ASSIGNED statuses');
  process.exit(1);
}

// Check if the filter only includes ACTIVE status (the fix)
if (content.includes("booking.status === 'ACTIVE'")) {
  console.log('✅ PASS: Active Trips now only shows ACTIVE statuses');
  console.log('    Filter logic: booking.status === "ACTIVE"');
  process.exit(0);
}

console.log('⚠️  WARNING: Could not find activeTrips filter');
process.exit(1);