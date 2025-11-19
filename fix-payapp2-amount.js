// Fix Pay App #2 amount to be exactly 37785.39
require('dotenv').config({ path: '.env.production.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPayApp2() {
  console.log('Fixing Pay App #2 amount...\n');

  const payAppId = '3274e280-5316-4143-9e1f-89faa509aa36';

  const { error } = await supabase
    .from('engagement_pay_apps')
    .update({
      amount: 37785.39,
    })
    .eq('id', payAppId);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✅ Updated Pay App #2 amount to 37785.39');
  }
}

fixPayApp2();
