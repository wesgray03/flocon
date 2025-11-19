// Merge duplicate companies - keep QB version, delete non-QB version
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const duplicates = [
  { keep: 'ARCO/Murray', delete: 'Arco Murray' },
  { keep: 'Batten & Shaw, Inc.', delete: 'Batten & Shaw' },
  { keep: 'Doster Construction Company, Inc.', delete: 'Doster Construction' },
];

async function mergeDuplicates() {
  for (const dup of duplicates) {
    console.log(`\nMerging: "${dup.delete}" -> "${dup.keep}"`);

    // Get both companies
    const { data: keepCompany } = await supabase
      .from('companies')
      .select('id, name, qbo_id')
      .eq('name', dup.keep)
      .single();

    const { data: deleteCompany } = await supabase
      .from('companies')
      .select('id, name, qbo_id')
      .eq('name', dup.delete)
      .single();

    if (!keepCompany || !deleteCompany) {
      console.log('  ❌ One or both companies not found');
      continue;
    }

    console.log(
      `  Keep: ${keepCompany.name} (QB: ${keepCompany.qbo_id || 'none'})`
    );
    console.log(
      `  Delete: ${deleteCompany.name} (QB: ${deleteCompany.qbo_id || 'none'})`
    );

    // Reassign contacts
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, name')
      .eq('company_id', deleteCompany.id);

    if (contacts && contacts.length > 0) {
      const { error } = await supabase
        .from('contacts')
        .update({ company_id: keepCompany.id })
        .eq('company_id', deleteCompany.id);

      if (error) {
        console.log(`  ❌ Error reassigning contacts:`, error.message);
      } else {
        console.log(`  ✅ Reassigned ${contacts.length} contact(s)`);
      }
    }

    // Reassign engagement parties (with conflict handling)
    const { data: parties } = await supabase
      .from('engagement_parties')
      .select('id, engagement_id, role')
      .eq('party_id', deleteCompany.id)
      .eq('party_type', 'company');

    if (parties && parties.length > 0) {
      let reassigned = 0;
      let skipped = 0;

      for (const party of parties) {
        // Check if engagement already has this company in this role
        const { data: existing } = await supabase
          .from('engagement_parties')
          .select('id')
          .eq('engagement_id', party.engagement_id)
          .eq('party_id', keepCompany.id)
          .eq('role', party.role)
          .maybeSingle();

        if (existing) {
          // Already has keep company in this role, just delete the duplicate party
          await supabase.from('engagement_parties').delete().eq('id', party.id);
          skipped++;
        } else {
          // Update to keep company
          const { error } = await supabase
            .from('engagement_parties')
            .update({ party_id: keepCompany.id })
            .eq('id', party.id);

          if (error) {
            console.log(`    ❌ Error updating party:`, error.message);
          } else {
            reassigned++;
          }
        }
      }
      console.log(
        `  ✅ Reassigned ${reassigned} engagement(s), removed ${skipped} duplicate(s)`
      );
    }

    // Delete the duplicate company
    const { error: deleteError } = await supabase
      .from('companies')
      .delete()
      .eq('id', deleteCompany.id);

    if (deleteError) {
      console.log(`  ❌ Error deleting company:`, deleteError.message);
    } else {
      console.log(`  ✅ Deleted "${dup.delete}"`);
    }
  }

  console.log('\n✅ All duplicates merged!');
}

mergeDuplicates().catch(console.error);
