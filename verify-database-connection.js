#!/usr/bin/env node
/**
 * Verify which Supabase database we're connected to
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Checking Supabase Connection...\n');
console.log('Environment Variables:');
console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}`);
console.log(
  `   SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? supabaseServiceKey.substring(0, 20) + '...' : 'NOT SET'}`
);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n❌ Missing credentials!');
  process.exit(1);
}

// Parse the URL to get project info
try {
  const url = new URL(supabaseUrl);
  console.log(`\n📊 Database Info:`);
  console.log(`   Host: ${url.hostname}`);
  console.log(`   Project ID: ${url.hostname.split('.')[0]}`);
} catch (e) {
  console.error('❌ Invalid URL:', e.message);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkDatabase() {
  console.log(`\n🔍 Checking database contents...\n`);

  const tables = [
    'stages',
    'users',
    'companies',
    'contacts',
    'engagements',
    'engagement_parties',
  ];

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`   ${table.padEnd(25)} ${count} records`);
    }
  }

  // Try to get a sample engagement to see the data
  console.log(`\n📋 Sample data check...`);
  const { data: sampleEngagements, error: sampleError } = await supabase
    .from('engagements')
    .select('id, name, type, project_number')
    .limit(3);

  if (!sampleError && sampleEngagements && sampleEngagements.length > 0) {
    console.log(`\nFound ${sampleEngagements.length} sample engagements:`);
    sampleEngagements.forEach((e) => {
      console.log(
        `   - ${e.name} (${e.type}${e.project_number ? ', #' + e.project_number : ''})`
      );
    });
  }
}

await checkDatabase();

console.log('\n❓ Is this the correct database?');
console.log('   If NO, please provide the correct connection details');
console.log('   If YES, we can proceed with UPSERT to update existing data');
