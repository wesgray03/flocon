const { createClient } = require('@supabase/supabase-js');

// Create clients with SERVICE ROLE keys to bypass RLS
const prodClient = createClient(
  'https://groxqyaoavmfvmaymhbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3ODE1MywiZXhwIjoyMDc3MjU0MTUzfQ.FvweYdJG5d3pDZlU6SF8UEt7midPohX-1gtPyYvPQzw'
);

const stagingClient = createClient(
  'https://hieokzpxehyelhbubbpb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ1NTU4NCwiZXhwIjoyMDc4MDMxNTg0fQ.rTYiHoUTgQrhRORf65Yfaf_ifb8nRdaMAQI-hcfHmIQ'
);

async function quickCopyData() {
  console.log('🚀 Copying complete production database to staging...');
  console.log('📍 From: production (groxqyaoavmfvmaymhbe)');
  console.log('📍 To: staging (hieokzpxehyelhbubbpb)\n');

  // All tables in dependency order (independent tables first)
  const allTables = [
    'stages',
    'managers',
    'owners',
    'customers',
    'vendors',
    'subcontractors',
    'users',
    'projects',
    'contacts',
    'project_comments',
    'project_tasks',
    'project_subcontractors',
    'tasks',
    'change_orders',
    'pay_apps',
    'sov_lines',
    'sov_line_progress',
    'billings',
    'proposals',
    'purchase_orders',
    'seed_projects_raw',
    'seed_projects_clean',
  ];

  let successCount = 0;
  let totalRecords = 0;

  for (const tableName of allTables) {
    console.log(`📥 Copying ${tableName}...`);

    try {
      // Get data from production
      const { data: prodData, error: readError } = await prodClient
        .from(tableName)
        .select('*');

      if (readError) {
        console.log(`   ⚠️  Error reading: ${readError.message}`);
        continue;
      }

      if (!prodData || prodData.length === 0) {
        console.log(`   ⏭️  No data to copy`);
        successCount++;
        continue;
      }

      // Insert into staging
      const { error: insertError } = await stagingClient
        .from(tableName)
        .insert(prodData);

      if (insertError) {
        console.log(`   ❌ Error inserting: ${insertError.message}`);
      } else {
        console.log(`   ✅ ${prodData.length} records copied`);
        successCount++;
        totalRecords += prodData.length;
      }
    } catch (err) {
      console.log(`   💥 Failed: ${err.message}`);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`🎉 Copy completed!`);
  console.log(`� ${successCount}/${allTables.length} tables processed`);
  console.log(`📝 ${totalRecords} total records copied`);
  console.log(`\n✅ Staging database is ready for development!`);
  console.log(`🔧 You can now run: npm run dev`);
}

quickCopyData().catch(console.error);
