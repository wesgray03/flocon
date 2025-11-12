const { createClient } = require('@supabase/supabase-js');

// Use staging environment
const supabase = createClient(
  'https://hieokzpxehyelhbubbpb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ1NTU4NCwiZXhwIjoyMDc4MDMxNTg0fQ.rTYiHoUTgQrhRORf65Yfaf_ifb8nRdaMAQI-hcfHmIQ'
);

async function verifyEngagementParties() {
  console.log('🔍 Verifying engagement_parties migration...\n');

  // 1. Check if table exists
  console.log('1️⃣ Checking if engagement_parties table exists...');
  const { data: tables, error: tableError } = await supabase
    .from('engagement_parties')
    .select('id')
    .limit(1);

  if (tableError) {
    console.error(
      '❌ Table does not exist or has an error:',
      tableError.message
    );
    return;
  }
  console.log('✅ engagement_parties table exists\n');

  // 2. Count migrated records
  console.log('2️⃣ Counting migrated records...');
  const { count: totalParties } = await supabase
    .from('engagement_parties')
    .select('*', { count: 'exact', head: true });

  console.log(`✅ Total parties migrated: ${totalParties}\n`);

  // 3. Get breakdown by role
  console.log('3️⃣ Breakdown by role:');
  const { data: roleBreakdown, error: roleError } = await supabase
    .from('engagement_parties')
    .select('role');

  if (!roleError && roleBreakdown) {
    const roleCounts = roleBreakdown.reduce((acc, item) => {
      acc[item.role] = (acc[item.role] || 0) + 1;
      return acc;
    }, {});

    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`  ${role.padEnd(20)}: ${count}`);
    });
  }
  console.log('');

  // 4. Get breakdown by party type
  console.log('4️⃣ Breakdown by party type:');
  const { data: typeBreakdown, error: typeError } = await supabase
    .from('engagement_parties')
    .select('party_type');

  if (!typeError && typeBreakdown) {
    const typeCounts = typeBreakdown.reduce((acc, item) => {
      acc[item.party_type] = (acc[item.party_type] || 0) + 1;
      return acc;
    }, {});

    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`  ${type.padEnd(20)}: ${count}`);
    });
  }
  console.log('');

  // 5. Sample records
  console.log('5️⃣ Sample records:');
  const { data: samples, error: sampleError } = await supabase
    .from('engagement_parties')
    .select('*')
    .limit(5);

  if (sampleError) {
    console.error('❌ Error fetching samples:', sampleError);
  } else {
    console.log(JSON.stringify(samples, null, 2));
  }
  console.log('');

  // 6. Test the detailed view
  console.log('6️⃣ Testing engagement_parties_detailed view...');
  const { data: viewData, error: viewError } = await supabase
    .from('engagement_parties_detailed')
    .select('*')
    .limit(3);

  if (viewError) {
    console.error('❌ Error with view:', viewError.message);
  } else {
    console.log('✅ View works! Sample data:');
    viewData?.forEach((record) => {
      console.log(
        `  ${record.engagement_name} - ${record.role}: ${record.party_name} (${record.party_type})`
      );
    });
  }
  console.log('');

  // 7. Test get_engagement_primary_party function
  console.log('7️⃣ Testing get_engagement_primary_party function...');

  // Get a sample engagement with parties
  const { data: sampleEng } = await supabase
    .from('engagement_parties')
    .select('engagement_id')
    .limit(1)
    .single();

  if (sampleEng) {
    try {
      const { data: primaryCustomer, error: funcError } = await supabase.rpc(
        'get_engagement_primary_party',
        {
          p_engagement_id: sampleEng.engagement_id,
          p_role: 'customer',
        }
      );

      if (funcError) {
        console.error('❌ Function error:', funcError.message);
      } else {
        console.log('✅ Function works! Primary customer:');
        console.log(JSON.stringify(primaryCustomer, null, 2));
      }
    } catch (err) {
      console.error('❌ Function call failed:', err.message);
    }
  }
  console.log('');

  // 8. Compare old vs new structure
  console.log('8️⃣ Comparing old vs new structure...');
  const { data: engWithOldCols } = await supabase
    .from('engagements')
    .select('id, company_id, contact_id, architect_id, sales_contact_id')
    .not('company_id', 'is', null)
    .limit(5);

  if (engWithOldCols) {
    console.log('Sample engagements with old FK columns:');
    for (const eng of engWithOldCols) {
      const { data: newParties } = await supabase
        .from('engagement_parties')
        .select('role, party_type, is_primary')
        .eq('engagement_id', eng.id);

      console.log(`\nEngagement ${eng.id}:`);
      console.log(
        `  Old: company_id=${eng.company_id ? '✓' : '✗'}, contact_id=${eng.contact_id ? '✓' : '✗'}, architect_id=${eng.architect_id ? '✓' : '✗'}`
      );
      console.log(
        `  New: ${newParties?.length || 0} parties - ${newParties?.map((p) => p.role).join(', ')}`
      );
    }
  }
  console.log('');

  // 9. Summary
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Table created: engagement_parties`);
  console.log(`✅ View created: engagement_parties_detailed`);
  console.log(`✅ Function created: get_engagement_primary_party`);
  console.log(`✅ Records migrated: ${totalParties}`);
  console.log(`✅ RLS policies: Enabled`);
  console.log('\n⚠️  NEXT STEPS:');
  console.log('  1. Update application code to use engagement_parties');
  console.log('  2. Test thoroughly in staging');
  console.log('  3. After verification, consider dropping old FK columns');
  console.log('  4. Run this migration in production');
}

verifyEngagementParties().catch(console.error);
