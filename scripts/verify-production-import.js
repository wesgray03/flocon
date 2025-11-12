#!/usr/bin/env node
/**
 * Programmatic verification of production import without relying on exec_sql function.
 * Mirrors checks in verify-production-import.sql.
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

function pass(actual, expected) {
  return actual === expected ? '✅ PASS' : `❌ FAIL (expected ${expected})`;
}

async function main() {
  console.log('=== PRODUCTION IMPORT VERIFICATION (API) ===');

  // 1. Record counts
  console.log('\n[1] RECORD COUNTS');
  const tables = [
    { name: 'stages', expected: 12 },
    { name: 'users', expected: 13 },
    { name: 'companies', expected: 14 },
    { name: 'contacts', expected: 31 },
    { name: 'engagements', expected: 54 },
    { name: 'engagement_parties', expected: 50 },
  ];
  for (const t of tables) {
    const { count, error } = await supabase
      .from(t.name)
      .select('id', { count: 'exact', head: true });
    if (error) console.error(`  ${t.name}: error`, error.message);
    else console.log(`  ${t.name}: ${count} -> ${pass(count, t.expected)}`);
  }

  // Preload engagements & parties for later aggregation
  const [{ data: engagements, error: eErr }, { data: parties, error: pErr }] =
    await Promise.all([
      supabase
        .from('engagements')
        .select('id,name,type,project_number,stage_id'),
      supabase
        .from('engagement_parties')
        .select('id,engagement_id,role,party_id'),
    ]);
  if (eErr || pErr) {
    console.error('Failed to load base data', eErr?.message, pErr?.message);
    process.exit(1);
  }

  // 2. Engagement type breakdown
  console.log('\n[2] ENGAGEMENT TYPES BREAKDOWN');
  const typeCounts = engagements.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});
  Object.entries(typeCounts)
    .sort()
    .forEach(([type, cnt]) => console.log(`  ${type}: ${cnt}`));

  // 3. Engagements without customers
  console.log('\n[3] ENGAGEMENTS WITHOUT CUSTOMERS (should be 0)');
  const partiesByEng = parties.reduce((acc, p) => {
    (acc[p.engagement_id] ||= []).push(p);
    return acc;
  }, {});
  const noCustomers = engagements.filter((e) =>
    (partiesByEng[e.id] || []).every((p) => p.role !== 'customer')
  );
  if (!noCustomers.length) console.log('  None ✅');
  else
    noCustomers.forEach((e) =>
      console.log(`  Missing customer: ${e.id} ${e.name}`)
    );
  // 4. Projects without project managers
  console.log('\n[4] PROJECTS WITHOUT PROJECT MANAGERS (should be 0)');
  const noPM = engagements.filter(
    (e) =>
      e.type === 'project' &&
      (partiesByEng[e.id] || []).every((p) => p.role !== 'project_manager')
  );
  if (!noPM.length) console.log('  None ✅');
  else noPM.forEach((e) => console.log(`  Missing PM: ${e.id} ${e.name}`));

  // 5. Project stage distribution
  console.log('\n[5] PROJECT STAGE DISTRIBUTION');
  // Need stages order + name
  const { data: stages, error: sErr } = await supabase
    .from('stages')
    .select('id,name,order');
  if (sErr) console.error('  Error loading stages', sErr.message);
  const stageMap = Object.fromEntries(stages.map((s) => [s.id, s]));
  const stageDist = {};
  engagements
    .filter((e) => e.type === 'project')
    .forEach((e) => {
      const st = stageMap[e.stage_id];
      if (st) stageDist[st.name] = (stageDist[st.name] || 0) + 1;
    });
  stages
    .sort((a, b) => a.order - b.order)
    .forEach((s) =>
      console.log(
        `  ${s.order.toString().padStart(2, '0')} ${s.name}: ${stageDist[s.name] || 0}`
      )
    );

  // 6. Party role distribution
  console.log('\n[6] PARTY ROLE DISTRIBUTION');
  const roleDist = parties.reduce((acc, p) => {
    acc[p.role] = acc[p.role] || { count: 0, engagements: new Set() };
    acc[p.role].count++;
    acc[p.role].engagements.add(p.engagement_id);
    return acc;
  }, {});
  Object.entries(roleDist)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([role, info]) =>
      console.log(
        `  ${role}: count=${info.count} unique_engagements=${info.engagements.size}`
      )
    );

  // 7. Orphaned contacts (contacts with company_id not present)
  console.log('\n[7] ORPHANED CONTACTS (should be 0)');
  const { data: companies, error: cErr } = await supabase
    .from('companies')
    .select('id');
  if (cErr) console.error('  Error loading companies', cErr.message);
  const companySet = new Set((companies || []).map((c) => c.id));
  const { data: contacts, error: ctErr } = await supabase
    .from('contacts')
    .select('id,first_name,last_name,email,company_id');
  if (ctErr) console.error('  Error loading contacts', ctErr.message);
  const contactsSafe = contacts || [];
  const orphans = contactsSafe.filter(
    (c) => c.company_id && !companySet.has(c.company_id)
  );
  if (!orphans.length) console.log('  None ✅');
  else
    orphans.forEach((c) =>
      console.log(
        `  Orphan contact: ${c.id} ${c.first_name} ${c.last_name} company_id=${c.company_id}`
      )
    );

  // 8. User permissions summary
  console.log('\n[8] USER PERMISSIONS SUMMARY');
  const { data: users, error: uErr } = await supabase
    .from('users')
    .select('id,user_type,role,can_manage_projects,can_manage_prospects');
  if (uErr) console.error('  Error loading users', uErr.message);
  const permMap = {};
  users.forEach((u) => {
    const key = `${u.role || u.user_type}|${u.can_manage_projects}|${u.can_manage_prospects}`;
    permMap[key] = permMap[key] || {
      role: u.role || u.user_type,
      can_manage_projects: u.can_manage_projects,
      can_manage_prospects: u.can_manage_prospects,
      count: 0,
    };
    permMap[key].count++;
  });
  Object.values(permMap).forEach((r) =>
    console.log(
      `  ${r.role}: manage_projects=${r.can_manage_projects} manage_prospects=${r.can_manage_prospects} users=${r.count}`
    )
  );

  // 9. Party references (companies vs contacts)
  console.log('\n[9] PARTY REFERENCES');
  const companyIds = new Set(companies.map((c) => c.id));
  const contactIds = new Set(contactsSafe.map((c) => c.id));
  let companyParty = 0,
    contactParty = 0;
  parties.forEach((p) => {
    if (companyIds.has(p.party_id)) companyParty++;
    else if (contactIds.has(p.party_id)) contactParty++;
  });
  console.log(`  Companies: ${companyParty}`);
  console.log(`  Contacts:  ${contactParty}`);

  // 10. Null / critical field checks in engagements
  console.log('\n[10] NULL CRITICAL FIELDS IN ENGAGEMENTS');
  const criticalIssues = engagements.filter(
    (e) =>
      !e.type ||
      (e.type === 'project' && !e.stage_id) ||
      !e.name ||
      e.name === ''
  );
  if (!criticalIssues.length) console.log('  None ✅');
  else
    criticalIssues.forEach((e) =>
      console.log(
        `  Issue: ${e.id} name='${e.name}' type='${e.type}' stage='${e.stage_id}'`
      )
    );

  console.log('\n=== VERIFICATION COMPLETE ===');
}

main().catch((err) => {
  console.error('Fatal error', err);
  process.exit(1);
});
