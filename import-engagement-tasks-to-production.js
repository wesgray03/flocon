#!/usr/bin/env node
/**
 * Import engagement_tasks to PRODUCTION database
 */

import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PRODUCTION DATABASE
const PRODUCTION_URL = 'https://groxqyaoavmfvmaymhbe.supabase.co';
const PRODUCTION_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3ODE1MywiZXhwIjoyMDc3MjU0MTUzfQ.FvweYdJG5d3pDZlU6SF8UEt7midPohX-1gtPyYvPQzw';

const supabase = createClient(PRODUCTION_URL, PRODUCTION_KEY);

async function importTasks() {
  console.log('🚀 Importing engagement_tasks to PRODUCTION...\n');
  
  // Read CSV file
  const csvPath = path.join(__dirname, 'import-templates', 'parsed', '07-engagement-tasks.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  
  console.log(`📄 Found ${records.length} tasks in CSV`);
  
  // Transform to match database schema
  const tasks = records.map(record => ({
    id: record.id,
    name: record.name,
    stage_id: record.stage_id,
    order_num: parseInt(record.order_num),
    created_at: record.created_at || new Date().toISOString(),
    updated_at: record.updated_at || new Date().toISOString(),
  }));
  
  // Insert to production
  console.log(`\n⬆️  Inserting ${tasks.length} tasks to production...`);
  const { error } = await supabase
    .from('engagement_tasks')
    .insert(tasks);
  
  if (error) {
    console.error('❌ Error inserting tasks:', error.message);
    process.exit(1);
  }
  
  console.log('✅ Tasks imported successfully!');
  
  // Verify
  const { data: verifyData, error: verifyError } = await supabase
    .from('engagement_tasks')
    .select('stage_id', { count: 'exact', head: true });
  
  if (!verifyError) {
    console.log(`\n📊 Verification: ${verifyData} tasks in production`);
  }
  
  console.log('\n✅ Next steps:');
  console.log('   1. Run post-import-autocomplete-tasks.sql in production SQL editor');
  console.log('   2. Verify task completion records are created');
}

importTasks();
