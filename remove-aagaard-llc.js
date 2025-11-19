// Delete LLC party entries from engagements
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function removeLLCParties() {
  // Get LLC company
  const { data: llcCompany } = await supabase
    .from('companies')
    .select('id, name')
    .eq('name', 'Aagaard-Juergensen, LLC')
    .single();

  console.log(`Removing ${llcCompany.name} from all projects...\n`);

  // Delete all engagement_parties for LLC as customer
  const { data: deleted, error } = await supabase
    .from('engagement_parties')
    .delete()
    .eq('party_id', llcCompany.id)
    .eq('party_type', 'company')
    .eq('role', 'customer')
    .select('engagement_id');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`✅ Removed LLC from ${deleted.length} project(s)`);
  console.log(`\nYou can now delete Aagaard-Juergensen, LLC from FloCon`);
}

removeLLCParties().catch(console.error);
