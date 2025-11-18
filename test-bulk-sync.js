/**
 * Test script to run bulk project sync to QuickBooks
 */
require('dotenv').config({ path: '.env.local' });

async function runBulkSync() {
  console.log('🚀 Starting bulk project sync to QuickBooks...\n');

  try {
    const response = await fetch(
      'http://localhost:3000/api/qbo/sync-all-projects',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onlyUnsynced: true }), // Only sync projects without qbo_job_id
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('✅ Bulk sync completed successfully!\n');
      console.log(`Total projects: ${data.totalCount}`);
      console.log(`Synced: ${data.syncedCount}`);
      console.log(`Errors: ${data.errorCount}\n`);

      if (data.results && data.results.length > 0) {
        console.log('Results:');
        console.log(
          '─────────────────────────────────────────────────────────'
        );
        data.results.forEach((result) => {
          const status = result.success ? '✓' : '✗';
          const msg = result.success
            ? `Customer: ${result.customerId}, Job: ${result.jobId}`
            : `Error: ${result.error}`;
          console.log(`${status} ${result.projectNumber} - ${result.name}`);
          console.log(`  ${msg}`);
        });
      }
    } else {
      console.error('❌ Bulk sync failed:', data.error);
      if (data.results) {
        console.log('\nPartial results:');
        data.results.forEach((result) => {
          if (!result.success) {
            console.log(`✗ ${result.projectNumber}: ${result.error}`);
          }
        });
      }
    }
  } catch (error) {
    console.error('❌ Error running bulk sync:', error.message);
  }
}

runBulkSync();
