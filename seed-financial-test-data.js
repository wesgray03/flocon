// seed-financial-test-data.js
// Creates test data for Financial Overview component
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedFinancialData() {
  console.log('🌱 Seeding Financial Test Data...\n');

  try {
    // 1. Find or create a test project
    let { data: projects, error: projectError } = await supabase
      .from('engagements')
      .select('id, name, contract_amount')
      .eq('type', 'project')
      .limit(1)
      .single();

    if (projectError || !projects) {
      console.log('No existing project found. Creating test project...');
      const { data: newProject, error: createError } = await supabase
        .from('engagements')
        .insert({
          name: 'Financial Test Project',
          type: 'project',
          contract_amount: 149166.0,
          project_number: 'TEST-FIN-001',
          stage_id: null,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating project:', createError);
        return;
      }
      projects = newProject;
    }

    const projectId = projects.id;
    console.log(`✅ Using project: ${projects.name} (${projectId})\n`);

    // 2. Create engagement_trades for contract budget
    console.log('Creating engagement trades (contract budget)...');
    const trades = [
      { name: 'Flooring', estimated_amount: 50000.0 },
      { name: 'Tile', estimated_amount: 35000.0 },
      { name: 'Carpet', estimated_amount: 25000.0 },
      { name: 'Misc', estimated_amount: 5000.0 },
    ];

    // First, get or create trades
    for (const trade of trades) {
      const { data: existingTrade } = await supabase
        .from('trades')
        .select('id')
        .eq('name', trade.name)
        .single();

      let tradeId;
      if (existingTrade) {
        tradeId = existingTrade.id;
      } else {
        const { data: newTrade, error: tradeError } = await supabase
          .from('trades')
          .insert({
            code: `TEST-${trade.name.toUpperCase()}`,
            name: trade.name,
            division: 'Test Division',
          })
          .select()
          .single();

        if (tradeError) {
          console.error(`Error creating trade ${trade.name}:`, tradeError);
          continue;
        }
        tradeId = newTrade.id;
      }

      // Create engagement_trade link
      const { error: engTradeError } = await supabase
        .from('engagement_trades')
        .upsert(
          {
            engagement_id: projectId,
            trade_id: tradeId,
            estimated_amount: trade.estimated_amount,
          },
          {
            onConflict: 'engagement_id,trade_id',
          }
        );

      if (engTradeError) {
        console.error(
          `Error creating engagement_trade for ${trade.name}:`,
          engTradeError
        );
      } else {
        console.log(
          `  ✓ ${trade.name}: $${trade.estimated_amount.toLocaleString()}`
        );
      }
    }
    console.log('  Contract Budget Total: $115,000\n');

    // 3. Create change orders
    console.log('Creating change orders...');
    const changeOrders = [
      { name: 'CO-001: Additional Tile Work', amount: 8000.0, budget: 6000.0 },
      { name: 'CO-002: Upgraded Carpet', amount: 4000.0, budget: 4000.0 },
    ];

    for (const co of changeOrders) {
      const { error: coError } = await supabase
        .from('engagement_change_orders')
        .insert({
          engagement_id: projectId,
          description: co.name,
          amount: co.amount,
          budget_amount: co.budget,
          deleted: false,
        });

      if (coError) {
        console.error(`Error creating change order ${co.name}:`, coError);
      } else {
        console.log(
          `  ✓ ${co.name}: Revenue $${co.amount.toLocaleString()}, Budget $${co.budget.toLocaleString()}`
        );
      }
    }
    console.log('  Change Orders Total: Revenue $12,000, Budget $10,000\n');

    // 4. Create pay apps (billings)
    console.log('Creating pay apps (billings)...');
    const payApps = [
      {
        number: 1,
        payment: 45000.0,
        retainage: 2250.0,
        qbo_payment: 42750.0,
      }, // Paid in full
      {
        number: 2,
        payment: 35000.0,
        retainage: 1750.0,
        qbo_payment: 33250.0,
      }, // Paid in full
      { number: 3, payment: 28000.0, retainage: 1400.0, qbo_payment: 0.0 }, // Not paid yet
    ];

    for (const pa of payApps) {
      const { error: paError } = await supabase
        .from('engagement_pay_apps')
        .insert({
          engagement_id: projectId,
          pay_app_number: `#${pa.number}`,
          description: `Pay Application #${pa.number}`,
          current_payment_due: pa.payment,
          total_retainage: pa.retainage,
          qbo_payment_total: pa.qbo_payment,
          status: pa.qbo_payment > 0 ? 'paid' : 'pending',
          date_submitted: new Date(2025, 0, pa.number * 15).toISOString(),
        });

      if (paError) {
        console.error(`Error creating pay app #${pa.number}:`, paError);
      } else {
        console.log(
          `  ✓ Pay App #${pa.number}: Payment $${pa.payment.toLocaleString()}, Retainage $${pa.retainage.toLocaleString()}, QBO Paid $${pa.qbo_payment.toLocaleString()}`
        );
      }
    }
    console.log(
      '  Billings Total: $108,000 billed, $5,400 retainage, $76,000 cash received\n'
    );

    console.log('✅ Financial test data seeded successfully!\n');
    console.log('Expected Financial Overview values:');
    console.log('─────────────────────────────────────');
    console.log('Revenue:');
    console.log('  Contract Amount: $149,166');
    console.log('  Change Orders: $12,000');
    console.log('  Billings-to-date: $108,000');
    console.log('  Retainage-to-date: $5,400');
    console.log('  Remaining Billings: $53,166');
    console.log('  % Complete Revenue: 67%\n');
    console.log('Cost:');
    console.log('  Contract Budget: $115,000');
    console.log('  Change Order Cost Budget: $10,000');
    console.log('  Total Contract Cost Budget: $125,000');
    console.log('  Cost-to-date: $0 (TODO: QBO Bills)');
    console.log('  Remaining Cost: $125,000');
    console.log('  % Complete Cost: 0%\n');
    console.log('Profit:');
    console.log('  Contract Profit %: 23%');
    console.log('  Change Order Profit %: 17%');
    console.log('  Total Profit %: 22%');
    console.log('  Projected Profit %: 78%');
    console.log('  Projected Profit ($): $125,000\n');
    console.log('Cash Flow:');
    console.log('  Cash In: $76,000');
    console.log('  Cash Out: $0 (TODO: QBO Bills)');
    console.log('  Net Cash Flow: $76,000');
    console.log('  Cash Position (+/-): 47%\n');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  }
}

seedFinancialData();
