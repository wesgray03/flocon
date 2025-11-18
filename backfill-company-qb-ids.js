// Backfill QB customer IDs to companies table
// Reads all synced engagements and stores their QB customer IDs on the corresponding companies
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function backfillCompanyQBIds() {
  try {
    console.log('Fetching synced engagements with customer info...\n');

    // Get all engagements with QB customer IDs
    const { data: engagements, error: engError } = await supabase
      .from('engagements')
      .select('id, qbo_customer_id, qbo_last_synced_at')
      .not('qbo_customer_id', 'is', null);

    if (engError) throw engError;

    console.log(`Found ${engagements.length} synced engagements\n`);

    // For each engagement, get the customer company and update it
    let updated = 0;
    let skipped = 0;
    const companyUpdates = new Map(); // Track unique companies

    for (const engagement of engagements) {
      // Get customer party
      const { data: party, error: partyError } = await supabase
        .from('engagement_parties')
        .select('party_id, party_type')
        .eq('engagement_id', engagement.id)
        .eq('role', 'customer')
        .eq('is_primary', true)
        .maybeSingle();

      if (partyError || !party || party.party_type !== 'company') {
        console.log(
          `⚠️  Engagement ${engagement.id}: No company customer found`
        );
        skipped++;
        continue;
      }

      const companyId = party.party_id;

      // Track this company update (use most recent sync date)
      if (!companyUpdates.has(companyId)) {
        companyUpdates.set(companyId, {
          qbo_id: engagement.qbo_customer_id,
          qbo_last_synced_at: engagement.qbo_last_synced_at,
        });
      } else {
        const existing = companyUpdates.get(companyId);
        if (
          new Date(engagement.qbo_last_synced_at) >
          new Date(existing.qbo_last_synced_at)
        ) {
          companyUpdates.set(companyId, {
            qbo_id: engagement.qbo_customer_id,
            qbo_last_synced_at: engagement.qbo_last_synced_at,
          });
        }
      }
    }

    console.log(`\nUpdating ${companyUpdates.size} companies...\n`);

    // Update all companies
    for (const [companyId, updateData] of companyUpdates.entries()) {
      // Get company name first
      const { data: company } = await supabase
        .from('companies')
        .select('name, qbo_id')
        .eq('id', companyId)
        .single();

      if (!company) continue;

      // Check if already has QB ID
      if (company.qbo_id) {
        console.log(`⏩ ${company.name}: Already has QB ID ${company.qbo_id}`);
        continue;
      }

      // Update company
      const { error: updateError } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', companyId);

      if (updateError) {
        console.log(`❌ ${company.name}: Error - ${updateError.message}`);
      } else {
        console.log(
          `✓ ${company.name}: Updated with QB ID ${updateData.qbo_id}`
        );
        updated++;
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`Total Companies: ${companyUpdates.size}`);
    console.log(`Updated: ${updated}`);
    console.log(
      `Skipped (already had QB ID): ${companyUpdates.size - updated}`
    );
    console.log(`${'='.repeat(50)}\n`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

backfillCompanyQBIds();
