require('dotenv').config({ path: '.env.production.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTokenExpiry() {
  console.log('Checking token expiry details...\n');

  const { data: tokens, error } = await supabase
    .from('qbo_tokens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !tokens || tokens.length === 0) {
    console.log('No tokens found');
    return;
  }

  const token = tokens[0];
  const now = Date.now();
  const accessExpiresAt = new Date(token.expires_at).getTime();
  const refreshExpiresAt = new Date(token.refresh_expires_at).getTime();

  console.log('Token Details:');
  console.log('='.repeat(70));
  console.log('Realm ID:', token.realm_id);
  console.log('Created:', new Date(token.created_at).toLocaleString());
  console.log(
    'Last Refreshed:',
    token.last_refreshed_at
      ? new Date(token.last_refreshed_at).toLocaleString()
      : 'Never'
  );
  console.log();

  console.log('Access Token:');
  console.log('  Expires:', new Date(accessExpiresAt).toLocaleString());
  console.log('  Status:', accessExpiresAt > now ? '✅ VALID' : '❌ EXPIRED');
  if (accessExpiresAt < now) {
    const minutesAgo = Math.round((now - accessExpiresAt) / 1000 / 60);
    console.log(`  Expired ${minutesAgo} minutes ago`);
  }
  console.log();

  console.log('Refresh Token:');
  console.log('  Expires:', new Date(refreshExpiresAt).toLocaleString());
  console.log('  Status:', refreshExpiresAt > now ? '✅ VALID' : '❌ EXPIRED');
  if (refreshExpiresAt < now) {
    const daysAgo = Math.round((now - refreshExpiresAt) / 1000 / 60 / 60 / 24);
    console.log(`  Expired ${daysAgo} days ago`);
  } else {
    const daysLeft = Math.round((refreshExpiresAt - now) / 1000 / 60 / 60 / 24);
    console.log(`  Valid for ${daysLeft} more days`);
  }
  console.log();

  if (refreshExpiresAt < now) {
    console.log('🚨 REFRESH TOKEN EXPIRED - Must reconnect to QuickBooks!');
    console.log('   Visit: https://www.floconapp.com/settings');
    console.log('   Click "Disconnect" then "Connect to QuickBooks"');
  } else if (accessExpiresAt < now) {
    console.log('⚠️  Access token expired but refresh token is valid.');
    console.log('   Next API call should auto-refresh the access token.');
  } else {
    console.log('✅ Both tokens are valid - sync should work.');
  }
}

checkTokenExpiry();
