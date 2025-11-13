const { createClient } = require('@supabase/supabase-js');

const fs = require('fs');
const prodEnv = fs.readFileSync('.env.production.local', 'utf8');
const prodUrl = prodEnv.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const prodKey = prodEnv.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();

const production = createClient(prodUrl, prodKey);

async function checkProductionData() {
  try {
    console.log('=== CHECKING PRODUCTION PROSPECTS ===\n');

    // Get a sample prospect with trades
    const { data: prospects, error: prospectsError } = await production
      .from('engagements')
      .select(
        `
        id,
        name,
        bid_amount,
        probability_level_id,
        probability_level:probability_levels ( id, name, percentage ),
        engagement_trades (
          trade_id,
          estimated_amount,
          trade:trades ( code, name )
        )
      `
      )
      .eq('type', 'prospect')
      .limit(5);

    if (prospectsError) {
      console.error('Error:', prospectsError);
      return;
    }

    console.log(`Found ${prospects?.length || 0} prospects\n`);

    prospects?.forEach((p, i) => {
      console.log(`--- Prospect ${i + 1}: ${p.name} ---`);
      console.log('ID:', p.id);
      console.log('bid_amount (old column):', p.bid_amount);
      console.log('probability_level_id:', p.probability_level_id);
      console.log('probability_level:', p.probability_level);
      console.log('engagement_trades count:', p.engagement_trades?.length || 0);

      if (p.engagement_trades && p.engagement_trades.length > 0) {
        const tradesSum = p.engagement_trades.reduce(
          (sum, t) => sum + (t.estimated_amount || 0),
          0
        );
        console.log('Sum of trade amounts:', tradesSum);

        const probPercentage = p.probability_level?.percentage || 0;
        const calculatedRevenue = tradesSum * (probPercentage / 100);
        console.log('Calculated revenue (trades * prob%):', calculatedRevenue);
      }
      console.log('');
    });

    // Check if any prospects have NULL probability_level_id
    const { data: nullProb, error: nullError } = await production
      .from('engagements')
      .select('id, name, probability_level_id')
      .eq('type', 'prospect')
      .is('probability_level_id', null);

    if (!nullError) {
      console.log(
        `Prospects with NULL probability_level_id: ${nullProb?.length || 0}`
      );
      if (nullProb && nullProb.length > 0) {
        console.log(
          'First few:',
          nullProb.slice(0, 5).map((p) => p.name)
        );
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkProductionData();
