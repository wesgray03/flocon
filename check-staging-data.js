#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  console.log('=== STAGING DATA CHECK ===\n');

  // Check engagement_parties
  const { data: parties, error: pErr } = await supabase
    .from('engagement_parties')
    .select('id,engagement_id,role')
    .limit(5);

  console.log('engagement_parties sample:', parties);
  if (pErr) console.error('Error:', pErr.message);

  const { count: partiesCount } = await supabase
    .from('engagement_parties')
    .select('id', { count: 'exact', head: true });
  console.log('Total engagement_parties:', partiesCount);

  // Check engagement_user_roles
  const { count: rolesCount } = await supabase
    .from('engagement_user_roles')
    .select('id', { count: 'exact', head: true });
  console.log('Total engagement_user_roles:', rolesCount);

  // Check engagements
  const { count: engCount } = await supabase
    .from('engagements')
    .select('id', { count: 'exact', head: true });
  console.log('Total engagements:', engCount);

  // Check projects vs prospects
  const { count: projectsCount } = await supabase
    .from('engagements')
    .select('id', { count: 'exact', head: true })
    .eq('type', 'project');
  const { count: prospectsCount } = await supabase
    .from('engagements')
    .select('id', { count: 'exact', head: true })
    .eq('type', 'prospect');

  console.log('Projects:', projectsCount);
  console.log('Prospects:', prospectsCount);
}

main().catch(console.error);
