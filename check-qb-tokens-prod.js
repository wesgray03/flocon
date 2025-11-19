require('dotenv').config({ path: '.env.production.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQBTokens() {
  console.log('Checking QuickBooks connection status...\n');

  // Check if we have QB tokens
  const { data: tokens, error: tokensError } = await supabase
    .from('qbo_tokens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (tokensError) {
    console.error('Error fetching tokens:', tokensError);
    return;
  }

  if (!tokens || tokens.length === 0) {
    console.log('❌ No QuickBooks tokens found in database.');
    console.log('   You need to connect to QuickBooks first.');
    return;
  }

  const token = tokens[0];
  console.log('✅ QuickBooks connected');
  console.log('Realm ID:', token.realm_id);
  console.log('Expires at:', new Date(token.expires_at).toLocaleString());
  console.log(
    'Token age:',
    Math.round((Date.now() - new Date(token.created_at).getTime()) / 1000 / 60),
    'minutes'
  );

  const now = Date.now();
  const expiresAt = new Date(token.expires_at).getTime();
  const isExpired = now > expiresAt;

  if (isExpired) {
    console.log('\n⚠️  WARNING: Access token is expired!');
    console.log(
      '   The app needs to refresh the token before making QB API calls.'
    );
  } else {
    const minutesLeft = Math.round((expiresAt - now) / 1000 / 60);
    console.log(`\n✅ Access token valid for ${minutesLeft} more minutes`);
  }
}

checkQBTokens();
