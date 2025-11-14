#!/usr/bin/env node
// Import change orders from CSV to production database
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { createClient } = require('@supabase/supabase-js');

// Load production credentials
const PROD_URL = 'https://groxqyaoavmfvmaymhbe.supabase.co';
const PROD_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3ODE1MywiZXhwIjoyMDc3MjU0MTUzfQ.FvweYdJG5d3pDZlU6SF8UEt7midPohX-1gtPyYvPQzw';

const SUPABASE_URL = PROD_URL;
const SUPABASE_SERVICE_KEY = PROD_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Parse date from M/D/YYYY format to YYYY-MM-DD
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  try {
    const parts = dateStr.trim().split('/');
    if (parts.length !== 3) return null;
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.warn('Failed to parse date:', dateStr);
    return null;
  }
}

async function importChangeOrders() {
  const csvPath = path.join(
    __dirname,
    'import-templates',
    'change_order_import.csv'
  );

  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found:', csvPath);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`Found ${records.length} change orders to import\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const row of records) {
    const engagementId = row.engagement_uuid?.trim();
    const projectNumber = row.project_number?.trim();
    const description =
      row['Change Request\nDescription']?.trim() || row.description?.trim();
    const status = row.current_status?.trim() || 'Open';
    const autoNumber = parseInt(row.ID) || null;

    if (!engagementId) {
      console.warn('⚠️  Skipping row with missing engagement_uuid');
      skipCount++;
      continue;
    }

    if (!description) {
      console.warn(
        `⚠️  Skipping CO for project ${projectNumber} - missing description`
      );
      skipCount++;
      continue;
    }

    // Verify engagement exists using UUID
    const { data: engagement, error: engError } = await supabase
      .from('engagements')
      .select('id, name')
      .eq('id', engagementId)
      .maybeSingle();

    if (engError || !engagement) {
      console.warn(
        `⚠️  Engagement ${engagementId} (project ${projectNumber}) not found - skipping`
      );
      skipCount++;
      continue;
    }

    // Parse amounts
    const amount = parseFloat(row.amount) || 0;
    const budgetAmount = parseFloat(row.budget_amount) || 0;
    const customerCoNumber = row.customer_co_number?.trim() || null;
    const notes = row.notes?.trim() || null;

    // Parse dates
    const dateRequested =
      parseDate(row.date_requested) || new Date().toISOString().split('T')[0];
    const dateAuthorized = parseDate(row.date_authorized);
    const dateIssued = parseDate(row.date_issued);

    const payload = {
      engagement_id: engagement.id,
      current_status: status,
      description,
      amount,
      budget_amount: budgetAmount,
      customer_co_number: customerCoNumber,
      notes,
      date_requested: dateRequested,
      date_authorized: dateAuthorized,
      date_issued: dateIssued,
      auto_number: autoNumber,
      deleted: false,
    };

    // Insert change order
    const { data, error } = await supabase
      .from('engagement_change_orders')
      .insert([payload])
      .select();

    if (error) {
      console.error(
        `❌ Error inserting CO for ${engagement.name}:`,
        error.message
      );
      errorCount++;
    } else {
      console.log(
        `✅ Imported: ${engagement.name} - ${description} ($${amount.toLocaleString()})`
      );
      successCount++;
    }
  }

  console.log('\n─────────────────────────────────');
  console.log(`✅ Success: ${successCount}`);
  console.log(`⚠️  Skipped: ${skipCount}`);
  console.log(`❌ Errors:  ${errorCount}`);
  console.log(`📊 Total:   ${records.length}`);
}

importChangeOrders().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
