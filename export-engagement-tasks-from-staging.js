#!/usr/bin/env node
/**
 * Export engagement_tasks from staging to CSV
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// STAGING DATABASE
const STAGING_URL = 'https://hieokzpxehyelhbubbpb.supabase.co';
const STAGING_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ1NTU4NCwiZXhwIjoyMDc4MDMxNTg0fQ.rTYiHoUTgQrhRORf65Yfaf_ifb8nRdaMAQI-hcfHmIQ';

const supabase = createClient(STAGING_URL, STAGING_KEY);

async function exportTasks() {
  console.log('📥 Exporting engagement_tasks from staging...\n');
  
  const { data: tasks, error } = await supabase
    .from('engagement_tasks')
    .select('*')
    .order('stage_id')
    .order('order_num');
  
  if (error) {
    console.error('❌ Error fetching tasks:', error.message);
    process.exit(1);
  }
  
  console.log(`✅ Found ${tasks.length} tasks in staging`);
  
  // Create CSV content
  const headers = ['id', 'name', 'stage_id', 'order_num', 'created_at', 'updated_at'];
  const csvLines = [headers.join(',')];
  
  tasks.forEach(task => {
    const row = [
      task.id,
      `"${task.name.replace(/"/g, '""')}"`, // Escape quotes
      task.stage_id,
      task.order_num,
      task.created_at,
      task.updated_at
    ];
    csvLines.push(row.join(','));
  });
  
  const csvContent = csvLines.join('\n');
  
  // Write to file
  const outputPath = path.join(__dirname, 'import-templates', 'parsed', '07-engagement-tasks.csv');
  fs.writeFileSync(outputPath, csvContent, 'utf8');
  
  console.log(`📄 Exported to: ${outputPath}`);
  console.log('\n✅ Next step: Run import-engagement-tasks-to-production.js');
}

exportTasks();
