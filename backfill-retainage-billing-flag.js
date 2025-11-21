const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.production.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function backfillRetainageBillingFlag() {
  console.log('🚀 Backfilling is_retainage_billing flag for existing pay apps...\n');

  try {
    // Get all pay apps ordered by engagement and pay app number
    const { data: payApps, error: fetchError } = await supabase
      .from('engagement_pay_apps')
      .select('id, engagement_id, pay_app_number, current_payment_due, retainage_completed_work, is_retainage_billing')
      .order('engagement_id')
      .order('pay_app_number');

    if (fetchError) throw fetchError;

    console.log(`📊 Found ${payApps.length} pay apps to check\n`);

    let updatedCount = 0;

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
        
        // Skip if already marked as retainage billing
        if (app.is_retainage_billing) continue;

        // Calculate total retainage held in previous pay apps
        let previousRetainageHeld = 0;
        for (let j = 0; j < i; j++) {
          if (!sorted[j].is_retainage_billing) {
            previousRetainageHeld += sorted[j].retainage_completed_work || 0;
          }
        }

        // If this pay app has:
        // 1. Zero retainage_completed_work (no new retainage withheld)
        // 2. current_payment_due approximately equals the retainage held
        // Then it's likely a retainage billing
        const hasNoNewRetainage = (app.retainage_completed_work || 0) === 0;
        const currentPayment = app.current_payment_due || 0;
        const retainageMatch = previousRetainageHeld > 0 && 
          Math.abs(currentPayment - previousRetainageHeld) < 1; // Allow $1 rounding difference

        if (hasNoNewRetainage && retainageMatch) {
          console.log(`📝 Pay app #${app.pay_app_number}: Identified as retainage billing`);
          console.log(`   Previous retainage held: $${previousRetainageHeld.toFixed(2)}`);
          console.log(`   Current payment: $${currentPayment.toFixed(2)}`);

          const { error: updateError } = await supabase
            .from('engagement_pay_apps')
            .update({ 
              is_retainage_billing: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', app.id);

          if (updateError) {
            console.error(`❌ Error updating pay app ${app.pay_app_number}:`, updateError);
          } else {
            console.log(`✅ Updated\n`);
            updatedCount++;
          }
        }
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Backfill completed!`);
    console.log(`   Updated: ${updatedCount} pay apps`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (err) {
    console.error('\n❌ Backfill failed:', err.message);
    console.error('\nStack trace:', err);
    process.exit(1);
  }
}

backfillRetainageBillingFlag();
