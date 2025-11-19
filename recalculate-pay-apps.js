// Recalculate all pay app amounts with proper rounding
require('dotenv').config({ path: '.env.production.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function recalculateAllPayApps() {
  console.log('=== Recalculating All Pay App Amounts ===\n');

  // Get all pay apps
  const { data: payApps, error } = await supabase
    .from('engagement_pay_apps')
    .select('*')
    .order('created_at');

  if (error || !payApps) {
    console.error('Error fetching pay apps:', error);
    return;
  }

  console.log(`Found ${payApps.length} pay apps to check\n`);

  let updatedCount = 0;

  for (const payApp of payApps) {
    // Round to 2 decimal places
    const roundedAmount = Math.round(payApp.amount * 100) / 100;
    const roundedCurrentPayment = Math.round(payApp.current_payment_due * 100) / 100;

    const needsUpdate = 
      payApp.amount !== roundedAmount || 
      payApp.current_payment_due !== roundedCurrentPayment;

    if (needsUpdate) {
      console.log(`Pay App ID: ${payApp.id}`);
      console.log(`  Amount: ${payApp.amount} → ${roundedAmount}`);
      console.log(`  Current Payment Due: ${payApp.current_payment_due} → ${roundedCurrentPayment}`);

      const { error: updateError } = await supabase
        .from('engagement_pay_apps')
        .update({
          amount: roundedAmount,
          current_payment_due: roundedCurrentPayment,
        })
        .eq('id', payApp.id);

      if (updateError) {
        console.error('  ❌ Error updating:', updateError.message);
      } else {
        console.log('  ✅ Updated');
        updatedCount++;
      }
      console.log('');
    }
  }

  console.log(`\nCompleted! Updated ${updatedCount} pay app(s)`);
}

recalculateAllPayApps();
