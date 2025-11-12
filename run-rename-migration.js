#!/usr/bin/env node

/**
 * Run the migration to rename manager->owner, owner->sales, pipeline_status->probability
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Running column rename migration...\n');

  const migrationFile = path.join(__dirname, 'db', 'migrations', '2025-11-09-rename-manager-to-owner-sales.sql');
  const sql = fs.readFileSync(migrationFile, 'utf8');

  // Split by semicolon and filter out comments and empty lines
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  console.log(`📝 Found ${statements.length} SQL statements\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`[${i + 1}/${statements.length}] Executing:`);
    console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));

    const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
    
    if (error) {
      // Try direct execution if RPC fails
      const { error: directError } = await supabase.from('_sql').select('*').limit(0);
      
      if (error.message.includes('does not exist') || error.message.includes('already exists')) {
        console.log(`⚠️  Skipped (already applied or doesn't exist): ${error.message}\n`);
      } else {
        console.error(`❌ Error: ${error.message}\n`);
      }
    } else {
      console.log(`✅ Success\n`);
    }
  }

  console.log('🎉 Migration complete!');
  
  // Verify the changes
  console.log('\n🔍 Verifying column names...');
  const { data, error } = await supabase
    .from('engagements')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Verification error:', error.message);
  } else {
    const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
    console.log('📋 Current columns:', columns.sort().join(', '));
    
    const hasOwner = columns.includes('owner');
    const hasSales = columns.includes('sales');
    const hasProbability = columns.includes('probability');
    const hasProbabilityPercent = columns.includes('probability_percent');
    
    console.log('\n✅ Verification:');
    console.log(`  owner column: ${hasOwner ? '✓' : '✗'}`);
    console.log(`  sales column: ${hasSales ? '✓' : '✗'}`);
    console.log(`  probability column: ${hasProbability ? '✓' : '✗'}`);
    console.log(`  probability_percent column: ${hasProbabilityPercent ? '✓' : '✗'}`);
  }
}

runMigration().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
