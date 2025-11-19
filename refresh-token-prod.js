require('dotenv').config({ path: '.env.production.local' });
const OAuthClient = require('intuit-oauth');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function refreshToken() {
  console.log('Attempting to refresh QuickBooks token...\n');

  // Get current token
  const { data: tokens } = await supabase
    .from('qbo_tokens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!tokens || tokens.length === 0) {
    console.log('No tokens found');
    return;
  }

  const token = tokens[0];
  console.log('Current token:');
  console.log('  Realm ID:', token.realm_id);
  console.log('  Expires:', new Date(token.expires_at).toLocaleString());
  console.log();

  // Create OAuth client
  const oauthClient = new OAuthClient({
    clientId: process.env.QBO_CLIENT_ID,
    clientSecret: process.env.QBO_CLIENT_SECRET,
    environment: process.env.QBO_ENVIRONMENT || 'production',
    redirectUri: process.env.QBO_REDIRECT_URI,
  });

  // Set current token
  oauthClient.setToken({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    token_type: 'Bearer',
    realmId: token.realm_id,
  });

  try {
    console.log('Calling refresh...');
    const authResponse = await oauthClient.refresh();
    const newToken = authResponse.token;

    console.log('✅ Token refreshed successfully!');
    console.log('New token expires in:', newToken.expires_in, 'seconds');
    console.log();

    // Save new token
    const now = new Date();
    const expiresAt = new Date(now.getTime() + newToken.expires_in * 1000);
    const refreshExpiresAt = new Date(
      now.getTime() + newToken.x_refresh_token_expires_in * 1000
    );

    const { error } = await supabase
      .from('qbo_tokens')
      .update({
        access_token: newToken.access_token,
        refresh_token: newToken.refresh_token,
        expires_at: expiresAt.toISOString(),
        refresh_expires_at: refreshExpiresAt.toISOString(),
        last_refreshed_at: now.toISOString(),
      })
      .eq('realm_id', token.realm_id);

    if (error) {
      console.error('Error saving token:', error);
    } else {
      console.log('✅ Token saved to database');
      console.log('New expiry:', expiresAt.toLocaleString());
    }
  } catch (error) {
    console.error('❌ Token refresh failed:', error);
    console.error('Error details:', error.response?.data || error.message);
  }
}

refreshToken();
