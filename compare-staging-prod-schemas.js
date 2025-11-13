const { createClient } = require('@supabase/supabase-js');

// Load staging
const staging = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Load production from .env.production.local
const fs = require('fs');
const prodEnv = fs.readFileSync('.env.production.local', 'utf8');
const prodUrl = prodEnv.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const prodKey = prodEnv.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();

const production = createClient(prodUrl, prodKey);

async function compareSchemas() {
  try {
    console.log('=== STAGING SCHEMA ===');
    const { data: stagingData } = await staging
      .from('engagements')
      .select('*')
      .eq('type', 'prospect')
      .limit(1);

    if (stagingData?.[0]) {
      const stagingCols = Object.keys(stagingData[0]).sort();
      console.log('Staging columns:', stagingCols);
      console.log(
        '\nRelevant staging columns:',
        stagingCols.filter(
          (c) =>
            c.includes('bid') ||
            c.includes('amount') ||
            c.includes('probability')
        )
      );
    }

    console.log('\n=== PRODUCTION SCHEMA ===');
    const { data: prodData } = await production
      .from('engagements')
      .select('*')
      .eq('type', 'prospect')
      .limit(1);

    if (prodData?.[0]) {
      const prodCols = Object.keys(prodData[0]).sort();
      console.log('Production columns:', prodCols);
      console.log(
        '\nRelevant production columns:',
        prodCols.filter(
          (c) =>
            c.includes('bid') ||
            c.includes('amount') ||
            c.includes('probability')
        )
      );
    }

    // Check engagement_trades
    console.log('\n=== ENGAGEMENT_TRADES CHECK ===');

    const { data: stagingTrades } = await staging
      .from('engagement_trades')
      .select('*')
      .limit(1);

    console.log(
      'Staging engagement_trades columns:',
      stagingTrades?.[0] ? Object.keys(stagingTrades[0]).sort() : 'No data'
    );

    const { data: prodTrades } = await production
      .from('engagement_trades')
      .select('*')
      .limit(1);

    console.log(
      'Production engagement_trades columns:',
      prodTrades?.[0] ? Object.keys(prodTrades[0]).sort() : 'No data'
    );
  } catch (err) {
    console.error('Error:', err.message);
  }
}

compareSchemas();
