const { createClient } = require('@supabase/supabase-js');

const fs = require('fs');
const prodEnv = fs.readFileSync('.env.production.local', 'utf8');
const prodUrl = prodEnv.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const prodKey = prodEnv.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();

const production = createClient(prodUrl, prodKey);

async function diagnoseMissingRevenue() {
  try {
    const { data: prospects } = await production
      .from('engagements')
      .select(
        `
        id,
        name,
        probability_level_id,
        probability_level:probability_levels ( percentage ),
        engagement_trades ( estimated_amount )
      `
      )
      .eq('type', 'prospect');

    console.log(`Total prospects: ${prospects?.length || 0}\n`);

    let noTrades = 0;
    let noProb = 0;
    let zeroRevenue = 0;
    let hasRevenue = 0;

    prospects?.forEach((p) => {
      const tradesSum = (p.engagement_trades || []).reduce(
        (sum, t) => sum + (t.estimated_amount || 0),
        0
      );
      const probPercent = p.probability_level?.percentage || 0;
      const revenue = tradesSum * (probPercent / 100);

      if (!p.probability_level_id) {
        noProb++;
      }
      if (!p.engagement_trades || p.engagement_trades.length === 0) {
        noTrades++;
      }
      if (revenue === 0) {
        zeroRevenue++;
        if (zeroRevenue <= 10) {
          console.log(`Zero revenue: ${p.name}`);
          console.log(`  - Trades sum: ${tradesSum}`);
          console.log(`  - Probability: ${probPercent}%`);
          console.log(`  - Has prob_level_id: ${!!p.probability_level_id}`);
          console.log('');
        }
      } else {
        hasRevenue++;
      }
    });

    console.log('=== SUMMARY ===');
    console.log(`Prospects with revenue > 0: ${hasRevenue}`);
    console.log(`Prospects with revenue = 0: ${zeroRevenue}`);
    console.log(`  - Missing probability_level_id: ${noProb}`);
    console.log(`  - Missing trades: ${noTrades}`);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

diagnoseMissingRevenue();
