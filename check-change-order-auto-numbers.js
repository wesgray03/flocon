require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkChangeOrders() {
  console.log('Checking change orders...\n');

  const { data, error } = await supabase
    .from('engagement_change_orders')
    .select('id, engagement_id, auto_number, description, deleted')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Found ${data.length} change orders:\n`);
  data.forEach((co) => {
    console.log(
      `ID: ${co.id.substring(0, 8)}... | auto_number: ${co.auto_number} | deleted: ${co.deleted} | ${co.description}`
    );
  });

  // Group by engagement
  const byEngagement = new Map();
  data.forEach((co) => {
    if (!byEngagement.has(co.engagement_id)) {
      byEngagement.set(co.engagement_id, []);
    }
    byEngagement.get(co.engagement_id).push(co);
  });

  console.log(`\n\nBy Engagement:`);
  byEngagement.forEach((cos, engId) => {
    console.log(
      `\nEngagement ${engId.substring(0, 8)}... (${cos.length} COs):`
    );
    cos.forEach((co) => {
      console.log(`  - auto_number: ${co.auto_number} | ${co.description}`);
    });
  });
}

checkChangeOrders();
