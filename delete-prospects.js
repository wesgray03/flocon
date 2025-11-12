// delete-prospects.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://groxqyaoavmfvmaymhbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3ODE1MywiZXhwIjoyMDc3MjU0MTUzfQ.FvweYdJG5d3pDZlU6SF8UEt7midPohX-1gtPyYvPQzw'
);

async function deleteProspects() {
  console.log('🗑️  Deleting all prospects and related data...\n');

  try {
    // Get all prospect IDs
    const { data: prospects, error: selectError } = await supabase
      .from('engagements')
      .select('id')
      .eq('type', 'prospect');

    if (selectError) {
      console.error('Error getting prospects:', selectError.message);
      return;
    }

    if (!prospects || prospects.length === 0) {
      console.log('No prospects found to delete.');
      return;
    }

    const prospectIds = prospects.map((p) => p.id);
    console.log(`Found ${prospectIds.length} prospects to delete\n`);

    // Delete related records first
    console.log('Deleting engagement_trades...');
    const { error: tradesError } = await supabase
      .from('engagement_trades')
      .delete()
      .in('engagement_id', prospectIds);
    if (tradesError) console.error('  Error:', tradesError.message);
    else console.log('  ✓ Done');

    console.log('Deleting engagement_user_roles...');
    const { error: rolesError } = await supabase
      .from('engagement_user_roles')
      .delete()
      .in('engagement_id', prospectIds);
    if (rolesError) console.error('  Error:', rolesError.message);
    else console.log('  ✓ Done');

    console.log('Deleting engagement_parties...');
    const { error: partiesError } = await supabase
      .from('engagement_parties')
      .delete()
      .in('engagement_id', prospectIds);
    if (partiesError) console.error('  Error:', partiesError.message);
    else console.log('  ✓ Done');

    // Now delete the engagements
    console.log('Deleting engagements...');
    const { error: engError } = await supabase
      .from('engagements')
      .delete()
      .in('id', prospectIds);
    if (engError) console.error('  Error:', engError.message);
    else console.log('  ✓ Done');

    console.log('\n✅ All prospects and related data deleted successfully!');
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

deleteProspects();
