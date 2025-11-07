const { createClient } = require('@supabase/supabase-js');

// Create clients
const prodClient = createClient(
  'https://groxqyaoavmfvmaymhbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzgxNTMsImV4cCI6MjA3NzI1NDE1M30.SQ2G5gRVn2Zlo1q7j1faxq5ZPAZgphzzBY6XFh3Ovw4'
);

const stagingClient = createClient(
  'https://hieokzpxehyelhbubbpb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1ODQsImV4cCI6MjA3ODAzMTU4NH0.NDXes_vCvs9ocgJcc4BXqFXe68SUjRkBz_wEqvprLVo'
);

async function copyTableData(tableName) {
  console.log(`� Copying ${tableName}...`);

  try {
    // Get all data from production
    const { data: prodData, error: readError } = await prodClient
      .from(tableName)
      .select('*');

    if (readError) {
      console.error(`❌ Error reading ${tableName}:`, readError.message);
      return false;
    }

    if (!prodData || prodData.length === 0) {
      console.log(`⏭️  ${tableName}: No data to copy`);
      return true;
    }

    // Insert data into staging
    const { error: insertError } = await stagingClient
      .from(tableName)
      .insert(prodData);

    if (insertError) {
      console.error(
        `❌ Error inserting into ${tableName}:`,
        insertError.message
      );
      return false;
    }

    console.log(`✅ ${tableName}: ${prodData.length} records copied`);
    return true;
  } catch (err) {
    console.error(`💥 Failed to copy ${tableName}:`, err.message);
    return false;
  }
}

async function copyProductionToStaging() {
  console.log('🚀 Copying production data to staging...');
  console.log('📍 From: https://groxqyaoavmfvmaymhbe.supabase.co');
  console.log('� To: https://hieokzpxehyelhbubbpb.supabase.co\n');

  // List of tables to copy (add more as needed)
  const tablesToCopy = [
    'users',
    'contacts',
    'subcontractors',
    'projects',
    'project_comments',
    'project_tasks',
    'change_orders',
    'pay_apps',
    'sov_lines',
    'sov_line_progress',
  ];

  let successCount = 0;

  for (const tableName of tablesToCopy) {
    const success = await copyTableData(tableName);
    if (success) successCount++;
  }

  console.log(
    `\n🎉 Copy completed! ${successCount}/${tablesToCopy.length} tables copied successfully.`
  );

  if (successCount > 0) {
    console.log('✅ Your staging environment has data!');
    console.log('🔧 You can now run: npm run dev');
  }
}

copyProductionToStaging().catch(console.error);
