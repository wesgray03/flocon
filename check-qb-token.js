// Check QB token status
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkToken() {
  const { data: tokenData } = await supabase
    .from('qbo_tokens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!tokenData) {
    console.log('No QB token found');
    return;
  }

  const expiresAt = new Date(tokenData.x_refresh_token_expires_in * 1000);
  const now = new Date();

  console.log('QB Token Status:');
  console.log(`  Realm ID: ${tokenData.realmId}`);
  console.log(`  Created: ${tokenData.created_at}`);
  console.log(`  Refresh Token Expires: ${expiresAt.toLocaleString()}`);
  console.log(`  Status: ${expiresAt > now ? '✓ Valid' : '✗ Expired'}`);
}

checkToken();
