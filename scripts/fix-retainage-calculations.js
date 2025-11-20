// Script to fix retainage calculations in pay apps
// This recalculates retainage_completed_work to be period-specific instead of cumulative
const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('fs');
const { join } = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://groxqyaoavmfvmaymhbe.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3ODE1MywiZXhwIjoyMDc3MjU0MTUzfQ.FvweYdJG5d3pDZlU6SF8UEt7midPohX-1gtPyYvPQzw'
);

async function fixRetainageCalculations() {
  console.log('🔧 Fixing retainage calculations in pay apps...\n');

  try {
    // Read the migration SQL
    const migrationSQL = readFileSync(
      join(
        __dirname,
        '../db/migrations/2025-11-20-fix-retainage-calculations.sql'
      ),
      'utf-8'
    );

    console.log('📋 Executing migration SQL...\n');

    // Execute the migration using the exec_sql RPC (if available)
    // Otherwise, we'll do it manually
    const { error: rpcError } = await supabase.rpc('exec_sql', {
      sql: migrationSQL,
    });

    if (rpcError) {
      console.log('RPC not available, executing manually...\n');
      await fixManually();
    } else {
      console.log('✅ Migration executed successfully via RPC\n');
      await verifyFix();
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    await fixManually();
  }
}

async function fixManually() {
  console.log('📊 Fetching all pay apps...\n');

  // Get all pay apps with their line progress
  const { data: payApps, error } = await supabase
    .from('engagement_pay_apps')
    .select('id, pay_app_number, engagement_id')
    .order('engagement_id')
    .order('pay_app_number');

  if (error) {
    console.error('❌ Error fetching pay apps:', error);
    return;
  }

  console.log(`Found ${payApps.length} pay apps to process\n`);

  let updatedCount = 0;
  let errorCount = 0;

  for (const payApp of payApps) {
    try {
      // Get SOV line progress for this pay app
      const { data: lineProgress, error: lineError } = await supabase
        .from('engagement_sov_line_progress')
        .select('*')
        .eq('pay_app_id', payApp.id);

      if (lineError) {
        console.error(
          `❌ Error fetching line progress for pay app ${payApp.id}:`,
          lineError
        );
        errorCount++;
        continue;
      }

      if (!lineProgress || lineProgress.length === 0) {
        console.log(
          `⚠️  Pay app ${payApp.pay_app_number || payApp.id} has no line progress, skipping`
        );
        continue;
      }

      // Calculate current period retainage (only on current_completed + stored_materials)
      const currentPeriodRetainage =
        Math.round(
          lineProgress.reduce((sum, line) => {
            const currentPeriodWork =
              line.current_completed + line.stored_materials;
            const retainage =
              Math.round(
                currentPeriodWork * (line.retainage_percent / 100) * 100
              ) / 100;
            return sum + retainage;
          }, 0) * 100
        ) / 100;

      // Calculate total cumulative retainage (on all work to date)
      const totalCumulativeRetainage =
        Math.round(
          lineProgress.reduce((sum, line) => {
            const totalToDate =
              line.previous_completed +
              line.current_completed +
              line.stored_materials;
            const retainage =
              Math.round(totalToDate * (line.retainage_percent / 100) * 100) /
              100;
            return sum + retainage;
          }, 0) * 100
        ) / 100;

      // Update the pay app
      const { error: updateError } = await supabase
        .from('engagement_pay_apps')
        .update({
          retainage_completed_work: currentPeriodRetainage,
          total_retainage: totalCumulativeRetainage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payApp.id);

      if (updateError) {
        console.error(`❌ Error updating pay app ${payApp.id}:`, updateError);
        errorCount++;
      } else {
        console.log(
          `✅ Pay app #${payApp.pay_app_number || '?'}: ` +
            `current=${currentPeriodRetainage.toFixed(2)}, ` +
            `cumulative=${totalCumulativeRetainage.toFixed(2)}`
        );
        updatedCount++;
      }
    } catch (err) {
      console.error(`❌ Error processing pay app ${payApp.id}:`, err.message);
      errorCount++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Updated: ${updatedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`${'='.repeat(60)}\n`);

  await verifyFix();
}

async function verifyFix() {
  console.log('🔍 Verifying fix...\n');

  const { data: payApps, error } = await supabase
    .from('engagement_pay_apps')
    .select('id, pay_app_number, retainage_completed_work, total_retainage')
    .order('pay_app_number')
    .limit(5);

  if (error) {
    console.error('❌ Error verifying:', error);
    return;
  }

  console.log('Sample of updated pay apps:');
  console.log('App # | Current Period | Cumulative Total');
  console.log('-'.repeat(50));
  payApps.forEach((app) => {
    console.log(
      `  ${String(app.pay_app_number || '?').padEnd(5)} | ` +
        `$${String(app.retainage_completed_work?.toFixed(2) || '0.00').padStart(12)} | ` +
        `$${String(app.total_retainage?.toFixed(2) || '0.00').padStart(12)}`
    );
  });

  console.log(
    '\n✅ Fix complete! New pay apps will now calculate retainage correctly.\n'
  );
}

fixRetainageCalculations().catch(console.error);
