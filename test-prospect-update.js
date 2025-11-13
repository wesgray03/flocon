const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const stagingEnv = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = stagingEnv
  .match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]
  ?.trim();
const supabaseKey = stagingEnv
  .match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]
  ?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
  const prospectId = '2493d375-3867-47ea-8179-e2735b4c7cec';

  console.log('Testing update on prospect:', prospectId);

  // First, check what columns exist
  const { data: existing, error: fetchError } = await supabase
    .from('engagements')
    .select('*')
    .eq('id', prospectId)
    .single();

  if (fetchError) {
    console.error('Error fetching prospect:', fetchError);
    return;
  }

  console.log('\nExisting prospect columns:', Object.keys(existing).sort());
  console.log('\nExisting probability-related fields:');
  console.log('- probability:', existing.probability);
  console.log('- probability_percent:', existing.probability_percent);
  console.log('- probability_level_id:', existing.probability_level_id);

  // Try a minimal update
  console.log('\nTrying minimal update...');
  const { error: updateError } = await supabase
    .from('engagements')
    .update({
      name: existing.name, // Just update with same value
    })
    .eq('id', prospectId);

  if (updateError) {
    console.error('Update error:', JSON.stringify(updateError, null, 2));
  } else {
    console.log('Update successful!');
  }
}

testUpdate();
