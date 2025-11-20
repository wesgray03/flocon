// Script to add refresh costs button to Financial Overview
// Run this to initialize the cache for all existing projects with QBO job IDs
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://groxqyaoavmfvmaymhbe.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3ODE1MywiZXhwIjoyMDc3MjU0MTUzfQ.FvweYdJG5d3pDZlU6SF8UEt7midPohX-1gtPyYvPQzw'
);

async function initializeCostCache() {
  console.log('🔄 Initializing QBO cost cache for all projects...\n');

  try {
    // Get all projects with QBO job IDs
    const { data: projects, error } = await supabase
      .from('engagements')
      .select('id, name, qbo_job_id')
      .eq('type', 'project')
      .not('qbo_job_id', 'is', null);

    if (error) {
      console.error('❌ Error fetching projects:', error);
      return;
    }

    console.log(`Found ${projects.length} projects with QBO job IDs\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const project of projects) {
      try {
        console.log(`📊 Fetching costs for: ${project.name}...`);

        // Call the cached API endpoint with forceRefresh=true
        const response = await fetch(
          `http://localhost:3000/api/qbo/project-costs-cached?qboJobId=${project.qbo_job_id}&engagementId=${project.id}&forceRefresh=true`
        );

        if (response.ok) {
          const data = await response.json();
          console.log(
            `   ✅ Net Cost: $${data.netCostToDate.toFixed(2)} ` +
            `(Bills: ${data.billsCount}, Purchases: ${data.purchasesCount})`
          );
          successCount++;
        } else {
          const error = await response.json();
          console.error(`   ❌ Failed: ${error.error}`);
          errorCount++;
        }
      } catch (err) {
        console.error(`   ❌ Error: ${err.message}`);
        errorCount++;
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Successfully cached: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`${'='.repeat(60)}\n`);
    console.log('✅ Cache initialization complete!\n');
    console.log('Next steps:');
    console.log('1. Financial Overview will now load much faster');
    console.log('2. Cache refreshes automatically after 1 hour');
    console.log('3. Add a "Refresh Costs" button for manual updates\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

initializeCostCache().catch(console.error);
