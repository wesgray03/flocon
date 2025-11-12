// backfill-probability-from-csv.js
// Backfill probability_level_id for existing prospects using CSV 'Probability'

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'https://groxqyaoavmfvmaymhbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3ODE1MywiZXhwIjoyMDc3MjU0MTUzfQ.FvweYdJG5d3pDZlU6SF8UEt7midPohX-1gtPyYvPQzw'
);

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else current += char;
  }
  result.push(current.trim());
  return result;
}

function parseCSV(content) {
  const lines = content.split('\n').filter((line) => line.trim());
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || null;
    });
    rows.push(row);
  }
  return rows;
}

async function backfill() {
  const csvPath = path.join(
    __dirname,
    'import-templates',
    'Prospect Import.csv'
  );
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const name = row.Project?.trim();
    const prob = row.Probability?.trim();
    if (!name || !prob) {
      skipped++;
      continue;
    }

    // Resolve probability level id by name
    const { data: level } = await supabase
      .from('probability_levels')
      .select('id, name')
      .ilike('name', prob)
      .maybeSingle();

    if (!level) {
      skipped++;
      continue;
    }

    // Update engagement by exact name and type, only if null to be safe
    const { error } = await supabase
      .from('engagements')
      .update({ probability_level_id: level.id })
      .eq('type', 'prospect')
      .eq('name', name)
      .is('probability_level_id', null);

    if (!error) updated++;
  }

  console.log(`Backfill complete. Updated: ${updated}, Skipped: ${skipped}`);
}

backfill().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
