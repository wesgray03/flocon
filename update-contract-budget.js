// update-contract-budget.js
// Updates the test project with contract_budget value
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateContractBudget() {
  console.log('Updating contract budget for test project...\n');

  try {
    // Find the test project (the one with engagement_trades)
    const { data: project, error: projectError } = await supabase
      .from('engagements')
      .select('id, name, contract_amount')
      .eq('type', 'project')
      .limit(1)
      .single();

    if (projectError || !project) {
      console.error('Error finding project:', projectError);
      return;
    }

    console.log(`Found project: ${project.name}`);
    console.log(
      `Contract Amount: $${project.contract_amount?.toLocaleString() || 0}`
    );

    // Update with contract budget of $115,000 (matching our test data)
    const { error: updateError } = await supabase
      .from('engagements')
      .update({ contract_budget: 115000.0 })
      .eq('id', project.id);

    if (updateError) {
      console.error('Error updating contract budget:', updateError);
      return;
    }

    console.log('✅ Contract Budget updated to $115,000\n');
    console.log('You can now view the Financial Overview with:');
    console.log('- Contract Amount: $149,166');
    console.log('- Contract Budget: $115,000');
    console.log('- Contract Profit: $34,166 (23%)');
  } catch (error) {
    console.error('Error:', error);
  }
}

updateContractBudget();
