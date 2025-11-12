#!/usr/bin/env node
/**
 * Drop unnecessary views from staging database
 * Uses service role key to execute SQL
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function dropViews() {
  console.log(`=== DROPPING UNNECESSARY VIEWS FROM ${url} ===\n`);

  const views = [
    'engagement_dashboard',
    'engagement_parties_detailed',
    'engagement_user_roles_detailed',
  ];

  // First verify views exist
  for (const viewName of views) {
    const { error } = await supabase.from(viewName).select('*').limit(1);
    if (error) {
      console.log(`⚠️  ${viewName}: Not found (${error.code})`);
    } else {
      console.log(`✅ ${viewName}: Exists`);
    }
  }

  console.log('\n⚠️  Views cannot be dropped via PostgREST API.');
  console.log(
    'Please run drop-unnecessary-views.sql manually in Supabase SQL Editor:'
  );
  console.log(
    `\n   ${url.replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new\n`
  );
  console.log('SQL to run:');
  console.log('━'.repeat(60));
  console.log(
    `
DROP VIEW IF EXISTS engagement_dashboard CASCADE;
DROP VIEW IF EXISTS engagement_parties_detailed CASCADE;
DROP VIEW IF EXISTS engagement_user_roles_detailed CASCADE;
DROP FUNCTION IF EXISTS get_engagement_primary_party(UUID, TEXT) CASCADE;
  `.trim()
  );
  console.log('━'.repeat(60));
}

dropViews().catch(console.error);
