#!/usr/bin/env node
/**
 * Import customer companies into engagement_parties (role='customer')
 * from import-templates/engagement_customers.csv
 */

import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env for production URL/key
const PRODUCTION_URL = 'https://groxqyaoavmfvmaymhbe.supabase.co';
const SERVICE_KEY =
  process.env.PRODUCTION_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error(
    '❌ Missing PRODUCTION service role key. Set PRODUCTION_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY.'
  );
  process.exit(1);
}

const supabase = createClient(PRODUCTION_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function slugifyName(name) {
  return (name || '').trim().toLowerCase();
}

async function main() {
  console.log(
    '📥 Importing engagement customers to engagement_parties (role=customer)\n'
  );
  const csvPath = path.join(
    __dirname,
    'import-templates',
    'engagement_customers.csv'
  );
  const csv = fs.readFileSync(csvPath, 'utf8');
  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  console.log(`➡️  Found ${rows.length} rows in engagement_customers.csv`);

  // Fetch companies once to map by name (case-insensitive)
  const { data: companies, error: compErr } = await supabase
    .from('companies')
    .select('id, name');
  if (compErr) throw compErr;
  const companyByName = new Map(
    companies.map((c) => [slugifyName(c.name), c.id])
  );

  // Fetch engagements to verify IDs
  const engagementIds = [...new Set(rows.map((r) => r.engagement_id))];
  const { data: engagements, error: engErr } = await supabase
    .from('engagements')
    .select('id')
    .in('id', engagementIds);
  if (engErr) throw engErr;
  const validEngIds = new Set(engagements.map((e) => e.id));

  const missingCompanies = new Set();
  const invalidEngagements = [];

  // Build payload
  const inserts = [];
  for (const r of rows) {
    const engId = r.engagement_id?.trim();
    const customerName = (r.Customer || r.customer || '').trim();
    const csvCompanyId = (r.company_id || r.companyId || '').trim();
    if (!engId || (!customerName && !csvCompanyId)) continue;

    if (!validEngIds.has(engId)) {
      invalidEngagements.push(engId);
      continue;
    }

    // Prefer explicit company_id from CSV; fallback to name lookup
    let companyId = csvCompanyId || null;
    if (!companyId && customerName) {
      companyId = companyByName.get(slugifyName(customerName)) || null;
    }
    if (!companyId) {
      if (customerName) missingCompanies.add(customerName);
      continue;
    }

    inserts.push({
      engagement_id: engId,
      party_type: 'company',
      party_id: companyId,
      role: 'customer',
      is_primary: true,
    });
  }

  console.log(`✅ Prepared ${inserts.length} party rows`);
  if (missingCompanies.size > 0) {
    console.warn(
      `⚠️  ${missingCompanies.size} company names not found. They will be skipped:`
    );
    for (const name of missingCompanies) console.warn('   -', name);
  }
  if (invalidEngagements.length > 0) {
    console.warn(
      `⚠️  ${invalidEngagements.length} engagement IDs not found. First few:`,
      invalidEngagements.slice(0, 5)
    );
  }

  // Upsert by unique (engagement_id, role, is_primary) or prevent dupes
  // We'll delete existing customer role rows and reinsert
  console.log('\n🧹 Removing existing primary customer parties...');
  const { error: delErr } = await supabase
    .from('engagement_parties')
    .delete()
    .eq('role', 'customer')
    .eq('is_primary', true);
  if (delErr) throw delErr;

  if (inserts.length > 0) {
    console.log(`⬆️  Inserting ${inserts.length} customer parties...`);
    const { error: insErr } = await supabase
      .from('engagement_parties')
      .insert(inserts);
    if (insErr) throw insErr;
  }

  console.log('\n🎉 Done.');
}

main().catch((e) => {
  console.error('❌ Import failed:', e.message);
  process.exit(1);
});
