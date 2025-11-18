require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function backfillAutoNumbers() {
  console.log('Backfilling auto_numbers for change orders...\n');

  // Get all change orders grouped by engagement
  const { data: allCOs, error } = await supabase
    .from('engagement_change_orders')
    .select('id, engagement_id, created_at, deleted')
    .order('engagement_id')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching change orders:', error);
    return;
  }

  // Group by engagement
  const byEngagement = new Map();
  allCOs.forEach((co) => {
    if (!byEngagement.has(co.engagement_id)) {
      byEngagement.set(co.engagement_id, []);
    }
    byEngagement.get(co.engagement_id).push(co);
  });

  let totalUpdated = 0;

  // Assign auto_numbers per engagement
  for (const [engagementId, cos] of byEngagement.entries()) {
    console.log(
      `\nProcessing engagement ${engagementId.substring(0, 8)}... (${cos.length} COs)`
    );

    for (let i = 0; i < cos.length; i++) {
      const co = cos[i];
      const autoNumber = i + 1;

      const { error: updateError } = await supabase
        .from('engagement_change_orders')
        .update({ auto_number: autoNumber })
        .eq('id', co.id);

      if (updateError) {
        console.error(`  ❌ Error updating ${co.id}:`, updateError);
      } else {
        console.log(
          `  ✅ Set CO ${co.id.substring(0, 8)}... to auto_number: ${autoNumber}`
        );
        totalUpdated++;
      }
    }
  }

  console.log(`\n✅ Backfill complete! Updated ${totalUpdated} change orders`);
}

backfillAutoNumbers();
