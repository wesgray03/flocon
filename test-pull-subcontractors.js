// Test pulling subcontractors from QuickBooks
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testPullSubcontractors() {
  try {
    console.log('Testing Pull Subcontractors from QuickBooks\n');
    console.log('='.repeat(60));

    // Check current subcontractor count
    const { count: beforeCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('is_subcontractor', true);

    console.log(`\nSubcontractors in FloCon (before): ${beforeCount}\n`);

    // Call the API endpoint
    console.log('Calling /api/qbo/pull-subcontractors...\n');

    const response = await fetch(
      'http://localhost:3000/api/qbo/pull-subcontractors',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const result = await response.json();

    console.log('='.repeat(60));
    console.log('PULL RESULTS:');
    console.log('='.repeat(60));
    console.log(`Success: ${result.success}`);
    console.log(`Total QB Vendors (1099): ${result.total}`);
    console.log(`Created: ${result.created}`);
    console.log(`Updated/Linked: ${result.updated}`);
    console.log(`Skipped: ${result.skipped}`);

    if (result.error) {
      console.log(`Error: ${result.error}`);
    }

    if (result.vendors && result.vendors.length > 0) {
      console.log('\nVendor Details:');
      result.vendors.forEach((v, i) => {
        console.log(`  ${i + 1}. ${v.name} (QB ID: ${v.qboId}) - ${v.action}`);
      });
    }

    // Check final count
    const { count: afterCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('is_subcontractor', true);

    console.log(`\nSubcontractors in FloCon (after): ${afterCount}`);
    console.log(`Net Change: +${afterCount - beforeCount}`);

    // Show some sample subcontractors
    const { data: samples } = await supabase
      .from('companies')
      .select('name, qbo_id, qbo_last_synced_at')
      .eq('is_subcontractor', true)
      .order('qbo_last_synced_at', { ascending: false })
      .limit(5);

    if (samples && samples.length > 0) {
      console.log('\nRecently Synced Subcontractors:');
      samples.forEach((s, i) => {
        const syncTime = s.qbo_last_synced_at
          ? new Date(s.qbo_last_synced_at).toLocaleTimeString()
          : 'Never';
        console.log(
          `  ${i + 1}. ${s.name} (QB ID: ${s.qbo_id}, Synced: ${syncTime})`
        );
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log(result.success ? '✓ TEST PASSED' : '✗ TEST FAILED');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    process.exit(1);
  }
}

testPullSubcontractors();
