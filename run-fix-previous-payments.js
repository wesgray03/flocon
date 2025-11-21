const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.production.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('🚀 Fixing previous_payments calculation on PRODUCTION...\n');
  console.log('⚠️  This will recalculate previous_payments for all pay apps\n');

  try {
    // Get all pay apps ordered by engagement and pay app number
    const { data: payApps, error: fetchError } = await supabase
      .from('engagement_pay_apps')
      .select('id, engagement_id, pay_app_number, total_earned_less_retainage')
      .order('engagement_id')
      .order('pay_app_number');

    if (fetchError) throw fetchError;

    console.log(`📊 Found ${payApps.length} pay apps to process\n`);

    let updatedCount = 0;
    let unchangedCount = 0;

    // Group by engagement
    const byEngagement = payApps.reduce((acc, app) => {
      if (!acc[app.engagement_id]) acc[app.engagement_id] = [];
      acc[app.engagement_id].push(app);
      return acc;
    }, {});

    // Process each engagement's pay apps
    for (const [engagementId, apps] of Object.entries(byEngagement)) {
      // Sort by pay app number
      const sorted = apps
        .filter(app => app.pay_app_number !== null)
        .sort((a, b) => Number(a.pay_app_number) - Number(b.pay_app_number));

      for (let i = 0; i < sorted.length; i++) {
        const app = sorted[i];
        
        // Calculate new previous_payments
        let newPreviousPayments = 0;
        if (i > 0) {
          // Use the previous pay app's total_earned_less_retainage
          newPreviousPayments = sorted[i - 1].total_earned_less_retainage || 0;
        }

        newPreviousPayments = Math.round(newPreviousPayments * 100) / 100;

        // Update if different
        const { error: updateError } = await supabase
          .from('engagement_pay_apps')
          .update({ 
            previous_payments: newPreviousPayments,
            updated_at: new Date().toISOString()
          })
          .eq('id', app.id);

        if (updateError) {
          console.error(`❌ Error updating pay app ${app.pay_app_number}:`, updateError);
        } else {
          console.log(`✅ Updated pay app #${app.pay_app_number}: previous_payments = $${newPreviousPayments.toFixed(2)}`);
          updatedCount++;
        }
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Migration completed!`);
    console.log(`   Updated: ${updatedCount} pay apps`);
    console.log(`${'='.repeat(60)}\n`);
    console.log('📊 Summary:');
    console.log('- Previous_payments now uses delta method');
    console.log('- Based on previous pay app\'s total_earned_less_retainage');
    console.log('- Fixes negative payment issues after retainage releases\n');

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    console.error('\nStack trace:', err);
    process.exit(1);
  }
}

runMigration();
