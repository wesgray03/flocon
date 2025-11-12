#!/usr/bin/env node
/**
 * Check what data already exists in production
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function checkTable(tableName) {
  const { count, error } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error(`❌ ${tableName}: Error - ${error.message}`);
  } else {
    console.log(`   ${tableName.padEnd(25)} ${count} records`);
  }

  return count;
}

async function main() {
  console.log('📊 Checking production database...\n');

  const stages = await checkTable('stages');
  const users = await checkTable('users');
  const companies = await checkTable('companies');
  const contacts = await checkTable('contacts');
  const engagements = await checkTable('engagements');
  const engagementParties = await checkTable('engagement_parties');

  console.log('\n📊 Summary:');
  const total =
    (stages || 0) +
    (users || 0) +
    (companies || 0) +
    (contacts || 0) +
    (engagements || 0) +
    (engagementParties || 0);

  if (total === 0) {
    console.log('✅ Database is empty - ready for import');
  } else {
    console.log(`⚠️  Database contains ${total} total records`);
    console.log('\n🔄 Options:');
    console.log(
      '   1. Clear database first (run wipe-production-database-safe.sql)'
    );
    console.log('   2. Skip import (data already exists)');
    console.log('   3. Update script to use UPSERT instead of INSERT');
  }
}

main().catch(console.error);
