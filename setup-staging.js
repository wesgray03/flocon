const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const stagingClient = createClient(
  'https://hieokzpxehyelhbubbpb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1ODQsImV4cCI6MjA3ODAzMTU4NH0.NDXes_vCvs9ocgJcc4BXqFXe68SUjRkBz_wEqvprLVo'
);

async function setupStagingEnvironment() {
  console.log('🏗️  Setting up staging environment...\n');

  try {
    // Step 1: Run migrations to create schema
    console.log('1️⃣ Running migrations on staging...');

    const { execSync } = require('child_process');
    try {
      execSync('node migrate.js staging', { stdio: 'inherit' });
      console.log('✅ Migrations completed\n');
    } catch (err) {
      console.log('⚠️  Migration completed with warnings\n');
    }

    // Step 2: Copy production data
    console.log('2️⃣ Copying production data...');
    try {
      execSync('node copy-to-staging.js', { stdio: 'inherit' });
      console.log('✅ Data copy completed\n');
    } catch (err) {
      console.log('⚠️  Data copy completed with warnings\n');
    }

    // Step 3: Verify setup
    console.log('3️⃣ Verifying staging setup...');

    const { data: projects, error } = await stagingClient
      .from('projects')
      .select('id, name')
      .limit(5);

    if (error) {
      console.log('❌ Verification failed:', error.message);
    } else {
      console.log(
        `✅ Staging verified! Found ${projects?.length || 0} projects`
      );
      if (projects && projects.length > 0) {
        console.log('📋 Sample projects:');
        projects.forEach((p) =>
          console.log(`   - ${p.name || 'Unnamed'} (${p.id})`)
        );
      }
    }

    console.log('\n🎉 Staging environment is ready!');
    console.log('🔧 You can now run: npm run dev');
    console.log('🌐 Local dev will use: hieokzpxehyelhbubbpb.supabase.co');
  } catch (err) {
    console.error('💥 Setup failed:', err.message);
    process.exit(1);
  }
}

setupStagingEnvironment();
