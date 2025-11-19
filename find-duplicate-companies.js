// Find duplicate or similar company names
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[,.\s-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function findDuplicates() {
  console.log('Finding duplicate companies...\n');

  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, qbo_id, company_type')
    .order('name');

  if (error) {
    console.error('Error fetching companies:', error);
    return;
  }

  if (!companies || companies.length === 0) {
    console.log('No companies found');
    return;
  }

  console.log(`Total companies: ${companies.length}\n`);

  // Group by normalized name
  const groups = new Map();
  for (const company of companies) {
    const norm = normalize(company.name);
    if (!groups.has(norm)) {
      groups.set(norm, []);
    }
    groups.get(norm).push(company);
  }

  // Find groups with multiple entries
  const duplicates = [];
  for (const [norm, group] of groups.entries()) {
    if (group.length > 1) {
      duplicates.push(group);
    }
  }

  if (duplicates.length === 0) {
    console.log('No duplicate companies found');
    return;
  }

  console.log(`Found ${duplicates.length} duplicate group(s):\n`);

  for (const group of duplicates) {
    console.log(`Group: ${group[0].name} (${group.length} variations)`);
    for (const company of group) {
      // Count projects
      const { data: parties } = await supabase
        .from('engagement_parties')
        .select('engagement_id')
        .eq('party_id', company.id)
        .eq('party_type', 'company');

      console.log(`  ${company.name}`);
      console.log(`    ID: ${company.id}`);
      console.log(`    QB ID: ${company.qbo_id || 'none'}`);
      console.log(`    Type: ${company.company_type}`);
      console.log(`    Projects: ${parties?.length || 0}`);
    }
    console.log('');
  }
}

findDuplicates().catch(console.error);
