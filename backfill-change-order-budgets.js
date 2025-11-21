const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.production.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function backfillChangeOrderBudgets() {
  console.log('🚀 Backfilling change order cost budgets at 35% margin...\n');

  try {
    // Get all change orders
    const { data: changeOrders, error: fetchError } = await supabase
      .from('engagement_change_orders')
      .select('id, auto_number, amount, budget_amount')
      .eq('deleted', false);

    if (fetchError) throw fetchError;

    console.log(`📊 Found ${changeOrders.length} change orders to check\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const co of changeOrders) {
      // Skip if budget_amount already set
      if (co.budget_amount && co.budget_amount !== 0) {
        console.log(`⏭️  CO #${co.auto_number}: Already has budget ($${co.budget_amount.toFixed(2)})`);
        skippedCount++;
        continue;
      }

      // Calculate 65% of amount (35% margin = 65% cost)
      const amount = co.amount || 0;
      const budgetAmount = Math.round(amount * 0.65 * 100) / 100;

      console.log(`📝 CO #${co.auto_number}: Setting budget to $${budgetAmount.toFixed(2)} (65% of $${amount.toFixed(2)})`);

      const { error: updateError } = await supabase
        .from('engagement_change_orders')
        .update({ 
          budget_amount: budgetAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', co.id);

      if (updateError) {
        console.error(`❌ Error updating CO #${co.auto_number}:`, updateError);
      } else {
        console.log(`✅ Updated\n`);
        updatedCount++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Backfill completed!`);
    console.log(`   Updated: ${updatedCount} change orders`);
    console.log(`   Skipped (already set): ${skippedCount} change orders`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (err) {
    console.error('\n❌ Backfill failed:', err.message);
    console.error('\nStack trace:', err);
    process.exit(1);
  }
}

backfillChangeOrderBudgets();
