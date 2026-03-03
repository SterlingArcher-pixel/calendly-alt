// Rename CalendlyAlt -> Scheduling Tool
// Run from ~/Desktop/calendly-alt/ with: node rename-project.js
const fs = require('fs');
const path = require('path');

console.log('Renaming CalendlyAlt -> Scheduling Tool...\n');

// Files to update
const files = [
  'src/app/layout.tsx',
  'src/app/[username]/[slug]/page.tsx',
  'src/app/booking/[id]/page.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/dashboard/availability/page.tsx',
  'src/app/api/send-confirmation/route.ts',
  'src/components/Sidebar.tsx',
  'src/lib/ics.ts',
];

let totalReplacements = 0;

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log('Skipped (not found): ' + filePath);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Replace brand name variations
  content = content.replace(/CalendlyAlt/g, 'Scheduling Tool');
  content = content.replace(/Calendly\s*Alt/g, 'Scheduling Tool');
  content = content.replace(/calendlyalt/gi, 'scheduling-tool');

  // Replace the "CA" logo text with "ST"
  content = content.replace(/>CA<\/span>/g, '>ST</span>');

  // Replace ICS PRODID
  content = content.replace(/\/\/CalendlyAlt\/\//g, '//SchedulingTool//');
  content = content.replace(/@calendlyalt/g, '@schedulingtool');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    const count = (content !== original) ? 1 : 0;
    console.log('Updated: ' + filePath);
    totalReplacements++;
  } else {
    console.log('No changes: ' + filePath);
  }
});

// Also check for any meeting type pages or other files
const additionalPaths = [
  'src/app/page.tsx',
  'src/app/auth/callback/route.ts',
  'src/app/dashboard/meeting-types/page.tsx',
  'src/app/dashboard/bookings/page.tsx',
  'src/app/dashboard/integration/page.tsx',
];

additionalPaths.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  content = content.replace(/CalendlyAlt/g, 'Scheduling Tool');
  content = content.replace(/Calendly\s*Alt/g, 'Scheduling Tool');
  content = content.replace(/calendlyalt/gi, 'scheduling-tool');
  content = content.replace(/>CA<\/span>/g, '>ST</span>');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Updated: ' + filePath);
    totalReplacements++;
  }
});

console.log('\n========================================');
console.log('Renamed ' + totalReplacements + ' files.');
console.log('========================================');
console.log('\nNext: git add . && git commit -m "Rename CalendlyAlt to Scheduling Tool" && git push origin main');
